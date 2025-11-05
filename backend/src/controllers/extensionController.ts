import { Response } from 'express';
import mongoose from 'mongoose';
import Password, { IPassword } from '../models/Password';
import PasswordLog from '../models/PasswordLog';
import User from '../models/User';
import Company from '../models/Company';
import MasterAdmin from '../models/MasterAdmin';
import Collection from '../models/Collection';
import Folder from '../models/Folder';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';

// Helper function to get user info by role and ID
const getUserInfo = async (role: string, id: string, email: string) => {
  let name = '';
  try {
    if (role === 'master_admin') {
      const admin = await MasterAdmin.findById(id);
      name = admin ? admin.email : email;
    } else if (role === 'company_super_admin') {
      const company = await Company.findById(id);
      name = company ? company.contactName : email;
    } else if (role === 'company_user') {
      const user = await User.findById(id);
      name = user ? user.username : email;
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
    name = email;
  }
  return { name, email };
};

// Normalize a hostname for matching (strip www.)
const normalizeHost = (host: string) => {
  try {
    const lower = host.toLowerCase();
    return lower.startsWith('www.') ? lower.slice(4) : lower;
  } catch {
    return host;
  }
};

// Accept full URL or bare host and return normalized hostname
const getHostname = (input: string) => {
  try {
    if (!/^https?:\/\//i.test(input)) {
      if (!input.includes('/')) return normalizeHost(input);
      return new URL(`https://${input}`).hostname.toLowerCase();
    }
    return new URL(input).hostname.toLowerCase();
  } catch {
    return normalizeHost(input);
  }
};

// Reduce a hostname to its base domain (last two labels):
// mail.google.com -> google.com, www.instagram.in -> instagram.in
const getBaseDomain = (hostname: string) => {
  const parts = normalizeHost(hostname).split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2);
  return lastTwo.join('.');
};

// Check if a stored url's hostname matches targetHost (exact or subdomain)
const urlHostnameMatches = (url: string, targetHost: string) => {
  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const h = normalizeHost(new URL(withProto).hostname);
    // Compare base domains only
    return getBaseDomain(h) === getBaseDomain(targetHost);
  } catch {
    return false;
  }
};

export const getPasswordsByDomain = async (req: AuthRequest, res: Response) => {
  try {
    const rawHost = (req.query.host as string) || '';

    if (!rawHost) {
      return res.status(400).json({ message: 'host query parameter is required' });
    }

    // Validate user data from JWT token
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { role, id, companyId, email } = req.user;

    if (!role || !id || !companyId) {
      return res.status(401).json({ message: 'Invalid user data in token' });
    }

    // ALWAYS fetch the logged-in user from database to verify account status and get latest permissions
    let loggedInUser: any = null;
    let userPermissions: {
      organizations: mongoose.Types.ObjectId[];
      collections: mongoose.Types.ObjectId[];
      folders: mongoose.Types.ObjectId[];
    } = {
      organizations: [],
      collections: [],
      folders: []
    };

    if (role === 'master_admin') {
      // Fetch master admin from database
      loggedInUser = await MasterAdmin.findById(id);
      if (!loggedInUser) {
        return res.status(403).json({ message: 'Master admin account not found' });
      }
      // Master admin has no permission restrictions
    } else if (role === 'company_super_admin') {
      // Fetch company super admin from database
      loggedInUser = await Company.findById(id);
      if (!loggedInUser) {
        return res.status(403).json({ message: 'Company account not found' });
      }
      // Company super admin has no permission restrictions within their company
    } else if (role === 'company_user') {
      // Fetch company user from database
      loggedInUser = await User.findById(id);

      if (!loggedInUser || !loggedInUser.isActive) {
        return res.status(403).json({ message: 'User account is inactive or not found' });
      }

      // Verify user belongs to the company from token
      const userCompanyId = loggedInUser.companyId?.toString();
      const tokenCompanyId = companyId.toString();

      if (!loggedInUser.companyId || userCompanyId !== tokenCompanyId) {
        return res.status(403).json({ message: 'User does not belong to the specified company' });
      }

      // Get permissions from logged-in user model (ALWAYS use database, not JWT)

      userPermissions.organizations = (loggedInUser.permissions?.organizations || []).map((oid: any) =>
        oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid)
      ).filter(Boolean);

      userPermissions.collections = (loggedInUser.permissions?.collections || []).map((cid: any) =>
        cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid)
      ).filter(Boolean);

      userPermissions.folders = (loggedInUser.permissions?.folders || []).map((fid: any) =>
        fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid)
      ).filter(Boolean);

    } else {
      return res.status(403).json({ message: 'Invalid user role' });
    }

    const host = getHostname(rawHost);
    const baseHost = getBaseDomain(host);

    // Build access query based on logged-in user's role and permissions
    let accessQuery: any = {};

    if (role === 'master_admin') {
      // Master admin can access all passwords across all companies
      // No restrictions needed
      accessQuery = {};
    } else if (role === 'company_super_admin') {
      // Company super admin can access all passwords in their company
      accessQuery.companyId = new mongoose.Types.ObjectId(id);
    } else if (role === 'company_user') {
      // Build permission filters - use same hierarchical logic as password list page
      const orgIds = userPermissions.organizations;
      const colIds = userPermissions.collections;
      const folderPerms = userPermissions.folders;

      const permissionFilters: any[] = [];

      // Hierarchical permission logic: ALL levels must match
      // User can ONLY see passwords where:
      // - Folder → must have folder permission AND folder's collection must be permitted AND collection's org must be permitted
      // - Collection (no folder) → must have collection permission AND collection's org must be permitted
      // - Organization permission alone is NOT enough

      // 1. Check folder permissions (highest priority - most specific)
      if (folderPerms.length > 0) {
        // Get folders with their collection and organization info
        const folders = await Folder.find({ _id: { $in: folderPerms } })
          .select('_id collectionId organizationId')
          .lean();

        // Get all collections at once to avoid N+1 queries
        const folderCollectionIds = folders
          .map(f => f.collectionId)
          .filter(Boolean) as mongoose.Types.ObjectId[];

        const collections = folderCollectionIds.length > 0
          ? await Collection.find({ _id: { $in: folderCollectionIds } })
            .select('_id organizationId')
            .lean()
          : [];

        // Create a map for quick lookup
        const collectionMap = new Map(
          collections.map(c => [c._id.toString(), c])
        );

        // Validate each folder: must have permission to folder, its collection, AND its organization
        const validFolderIds: mongoose.Types.ObjectId[] = [];

        for (const folder of folders) {
          let isValid = true;
          const folderId = folder._id as mongoose.Types.ObjectId;

          // Check collection permission
          if (folder.collectionId) {
            const folderCollectionId = folder.collectionId as mongoose.Types.ObjectId;
            const hasCollectionPerm = colIds.some(cid =>
              cid && cid.equals(folderCollectionId)
            );

            if (!hasCollectionPerm) {
              isValid = false;
            } else {
              // Verify collection belongs to a permitted organization
              const collection = collectionMap.get(folderCollectionId.toString());

              if (collection && collection.organizationId) {
                const collectionOrgId = collection.organizationId as mongoose.Types.ObjectId;
                const hasOrgPerm = orgIds.some(oid =>
                  oid && oid.equals(collectionOrgId)
                );

                if (!hasOrgPerm) {
                  isValid = false;
                }
              } else {
                // Collection has no organization - invalid
                isValid = false;
              }
            }
          } else {
            // Folder has no collection - check if folder has organizationId directly
            if (folder.organizationId) {
              const folderOrgId = folder.organizationId as mongoose.Types.ObjectId;
              const hasOrgPerm = orgIds.some(oid =>
                oid && oid.equals(folderOrgId)
              );
              if (!hasOrgPerm) {
                isValid = false;
              }
            } else {
              // Folder has no collection or organization - invalid
              isValid = false;
            }
          }

          if (isValid) {
            validFolderIds.push(folderId);
          }
        }

        if (validFolderIds.length > 0) {
          permissionFilters.push({ folderId: { $in: validFolderIds } });
        }
      }

      // 2. Check collection permissions (for passwords NOT in folders)
      if (colIds.length > 0) {
        // Get collections that belong to permitted organizations
        const validCollections = await Collection.find({
          _id: { $in: colIds },
          organizationId: { $in: orgIds } // Collection must belong to permitted org
        }).select('_id').lean();

        const validCollectionIds = validCollections.map(c => c._id);

        if (validCollectionIds.length > 0) {
          // Only passwords in permitted collections that are NOT in folders
          // (folders already handled above)
          permissionFilters.push({
            $and: [
              { collectionId: { $in: validCollectionIds } },
              {
                $or: [
                  { folderId: { $exists: false } },
                  { folderId: null }
                ]
              }
            ]
          });
        }
      }

      // 3. Organization permission alone is NOT enough - removed
      // User cannot see all passwords in an organization without collection/folder permissions

      // Company user can ONLY see passwords based on permissions
      // No createdBy or sharedWith checks - permissions only
      if (permissionFilters.length > 0) {
        accessQuery = {
          companyId: new mongoose.Types.ObjectId(companyId as any),
          $or: permissionFilters
        };
      } else {
        // If user has no permissions, return empty result
        accessQuery = {
          companyId: new mongoose.Types.ObjectId(companyId as any),
          _id: { $in: [] } // Empty result - no permissions
        };
      }

    }

    // Broad contains search using base domain, precise filter in Node
    const escaped = baseHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = {
      ...accessQuery,
      websiteUrls: { $elemMatch: { $regex: escaped, $options: 'i' } },
    } as any;

    const results = await Password.find(query).sort({ updatedAt: -1 });

    // Filter results: domain match + strict permission check
    const matched: IPassword[] = results.filter((p: IPassword) => {
      // First check domain match
      const domainMatch = Array.isArray(p.websiteUrls) &&
        p.websiteUrls.some(u => urlHostnameMatches(u, baseHost));

      if (!domainMatch) {
        return false;
      }

      // For company_user, perform strict permission verification - permissions only
      // No createdBy or sharedWith checks
      if (role === 'company_user') {
        const passwordId = (p._id as mongoose.Types.ObjectId)?.toString();

        // Check permission-based access with hierarchical validation
        const orgIds = userPermissions.organizations.map(oid => oid.toString());
        const colIds = userPermissions.collections.map(cid => cid.toString());
        const folderIds = userPermissions.folders.map(fid => fid.toString());

        // If user has folder permissions, check folder hierarchy (folder -> collection -> organization)
        if (folderIds.length > 0 && p.folderId) {
          const folderIdStr = (p.folderId as mongoose.Types.ObjectId).toString();
          const hasFolderPermission = folderIds.includes(folderIdStr);

          if (hasFolderPermission) {
            // Verify folder's collection is permitted
            if (p.collectionId) {
              const colIdStr = (p.collectionId as mongoose.Types.ObjectId).toString();
              const hasCollectionPerm = colIds.includes(colIdStr);

              if (hasCollectionPerm) {
                // Verify collection's organization is permitted
                if (p.organizationId) {
                  const orgIdStr = (p.organizationId as mongoose.Types.ObjectId).toString();
                  const hasOrgPerm = orgIds.includes(orgIdStr);
                  return hasOrgPerm;
                }
              }
            }
          }

          return false;
        }

        // Check collection permissions (for passwords NOT in folders)
        if (colIds.length > 0 && p.collectionId && !p.folderId) {
          const colIdStr = (p.collectionId as mongoose.Types.ObjectId).toString();
          const hasCollectionPerm = colIds.includes(colIdStr);

          if (hasCollectionPerm) {
            // Verify collection belongs to permitted organization
            if (p.organizationId) {
              const orgIdStr = (p.organizationId as mongoose.Types.ObjectId).toString();
              const hasOrgPerm = orgIds.includes(orgIdStr);
              return hasOrgPerm;
            }
          }
        }

        // Organization permission alone is NOT enough
        // Default: deny access if no condition matches
        return false;
      }

      // For master_admin and company_super_admin, allow all domain-matched results
      return true;
    });

    const decrypted = matched.map((p: IPassword) => {
      const decryptedUsername = decrypt(p.username);
      const passwordId = (p._id as mongoose.Types.ObjectId) || p.id;
      return {
        _id: passwordId,
        id: passwordId.toString(), // Extension expects 'id' field
        itemName: p.itemName,
        username: decryptedUsername,
        password: decrypt(p.password),
        email: decryptedUsername, // Extension may use email field, use username as fallback
        websiteUrls: p.websiteUrls,
        notes: p.notes ? decrypt(p.notes) : '',
        folderId: p.folderId,
        collectionId: p.collectionId,
        organizationId: p.organizationId,
        companyId: p.companyId,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
        // Add label for extension popup selection (extension expects 'label' field)
        label: `${p.itemName} (${decryptedUsername})`,
        displayLabel: `${p.itemName} (${decryptedUsername})`, // Keep for backward compatibility
      };
    });

    // Return response with metadata about multiple options
    const response = {
      host,
      baseHost,
      items: decrypted,
      hasMultiple: decrypted.length > 1,
      count: decrypted.length,
      // If single item, return it directly for easy autofill
      ...(decrypted.length === 1 ? {
        selected: decrypted[0]
      } : {})
    };

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific password by ID for autofill (used after user selection)
export const getPasswordById = async (req: AuthRequest, res: Response) => {
  try {
    const passwordId = req.params.id;
    if (!passwordId) {
      return res.status(400).json({ message: 'password ID is required' });
    }

    // Validate user data from JWT token
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { role, id, companyId } = req.user;

    if (!role || !id || !companyId) {
      return res.status(401).json({ message: 'Invalid user data in token' });
    }

    // ALWAYS fetch the logged-in user from database to verify account status and get latest permissions
    let loggedInUser: any = null;
    let userPermissions: {
      organizations: mongoose.Types.ObjectId[];
      collections: mongoose.Types.ObjectId[];
      folders: mongoose.Types.ObjectId[];
    } = {
      organizations: [],
      collections: [],
      folders: []
    };

    if (role === 'master_admin') {
      // Fetch master admin from database
      loggedInUser = await MasterAdmin.findById(id);
      if (!loggedInUser) {
        return res.status(403).json({ message: 'Master admin account not found' });
      }
      // Master admin has no permission restrictions
    } else if (role === 'company_super_admin') {
      // Fetch company super admin from database
      loggedInUser = await Company.findById(id);
      if (!loggedInUser) {
        return res.status(403).json({ message: 'Company account not found' });
      }
      // Company super admin has no permission restrictions within their company
    } else if (role === 'company_user') {
      // Fetch company user from database
      loggedInUser = await User.findById(id);
      if (!loggedInUser || !loggedInUser.isActive) {
        return res.status(403).json({ message: 'User account is inactive or not found' });
      }

      // Verify user belongs to the company from token
      if (!loggedInUser.companyId || loggedInUser.companyId.toString() !== companyId.toString()) {
        return res.status(403).json({ message: 'User does not belong to the specified company' });
      }

      // Get permissions from logged-in user model (ALWAYS use database, not JWT)
      userPermissions.organizations = (loggedInUser.permissions?.organizations || []).map((oid: any) =>
        oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid)
      ).filter(Boolean);

      userPermissions.collections = (loggedInUser.permissions?.collections || []).map((cid: any) =>
        cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid)
      ).filter(Boolean);

      userPermissions.folders = (loggedInUser.permissions?.folders || []).map((fid: any) =>
        fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid)
      ).filter(Boolean);
    } else {
      return res.status(403).json({ message: 'Invalid user role' });
    }

    // Build access query based on logged-in user's role and permissions
    let accessQuery: any = { _id: new mongoose.Types.ObjectId(passwordId) };

    if (role === 'master_admin') {
      // Master admin can access any password
      // No additional restrictions needed
    } else if (role === 'company_super_admin') {
      // Company super admin can access passwords in their company
      accessQuery.companyId = new mongoose.Types.ObjectId(id);
    } else if (role === 'company_user') {
      // Build permission filters - use same hierarchical logic as password list page
      const orgIds = userPermissions.organizations;
      const colIds = userPermissions.collections;
      const folderPerms = userPermissions.folders;

      const permissionFilters: any[] = [];

      // Hierarchical permission logic: ALL levels must match
      // User can ONLY see passwords where:
      // - Folder → must have folder permission AND folder's collection must be permitted AND collection's org must be permitted
      // - Collection (no folder) → must have collection permission AND collection's org must be permitted
      // - Organization permission alone is NOT enough

      // 1. Check folder permissions (highest priority - most specific)
      if (folderPerms.length > 0) {
        // Get folders with their collection and organization info
        const folders = await Folder.find({ _id: { $in: folderPerms } })
          .select('_id collectionId organizationId')
          .lean();

        // Get all collections at once to avoid N+1 queries
        const folderCollectionIds = folders
          .map(f => f.collectionId)
          .filter(Boolean) as mongoose.Types.ObjectId[];

        const collections = folderCollectionIds.length > 0
          ? await Collection.find({ _id: { $in: folderCollectionIds } })
            .select('_id organizationId')
            .lean()
          : [];

        // Create a map for quick lookup
        const collectionMap = new Map(
          collections.map(c => [c._id.toString(), c])
        );

        // Validate each folder: must have permission to folder, its collection, AND its organization
        const validFolderIds: mongoose.Types.ObjectId[] = [];

        for (const folder of folders) {
          let isValid = true;
          const folderId = folder._id as mongoose.Types.ObjectId;

          // Check collection permission
          if (folder.collectionId) {
            const folderCollectionId = folder.collectionId as mongoose.Types.ObjectId;
            const hasCollectionPerm = colIds.some(cid =>
              cid && cid.equals(folderCollectionId)
            );

            if (!hasCollectionPerm) {
              isValid = false;
            } else {
              // Verify collection belongs to a permitted organization
              const collection = collectionMap.get(folderCollectionId.toString());

              if (collection && collection.organizationId) {
                const collectionOrgId = collection.organizationId as mongoose.Types.ObjectId;
                const hasOrgPerm = orgIds.some(oid =>
                  oid && oid.equals(collectionOrgId)
                );

                if (!hasOrgPerm) {
                  isValid = false;
                }
              } else {
                // Collection has no organization - invalid
                isValid = false;
              }
            }
          } else {
            // Folder has no collection - check if folder has organizationId directly
            if (folder.organizationId) {
              const folderOrgId = folder.organizationId as mongoose.Types.ObjectId;
              const hasOrgPerm = orgIds.some(oid =>
                oid && oid.equals(folderOrgId)
              );
              if (!hasOrgPerm) {
                isValid = false;
              }
            } else {
              // Folder has no collection or organization - invalid
              isValid = false;
            }
          }

          if (isValid) {
            validFolderIds.push(folderId);
          }
        }

        if (validFolderIds.length > 0) {
          permissionFilters.push({ folderId: { $in: validFolderIds } });
        }
      }

      // 2. Check collection permissions (for passwords NOT in folders)
      if (colIds.length > 0) {
        // Get collections that belong to permitted organizations
        const validCollections = await Collection.find({
          _id: { $in: colIds },
          organizationId: { $in: orgIds } // Collection must belong to permitted org
        }).select('_id').lean();

        const validCollectionIds = validCollections.map(c => c._id);

        if (validCollectionIds.length > 0) {
          // Only passwords in permitted collections that are NOT in folders
          // (folders already handled above)
          permissionFilters.push({
            $and: [
              { collectionId: { $in: validCollectionIds } },
              {
                $or: [
                  { folderId: { $exists: false } },
                  { folderId: null }
                ]
              }
            ]
          });
        }
      }

      // 3. Organization permission alone is NOT enough - removed
      // User cannot see all passwords in an organization without collection/folder permissions

      // Company user can ONLY see passwords based on permissions
      // No createdBy or sharedWith checks - permissions only
      if (permissionFilters.length > 0) {
        accessQuery = {
          _id: new mongoose.Types.ObjectId(passwordId),
          companyId: new mongoose.Types.ObjectId(companyId as any),
          $or: permissionFilters
        };
      } else {
        // If user has no permissions, deny access by using an invalid/non-existent password ID
        accessQuery = {
          _id: new mongoose.Types.ObjectId('000000000000000000000001'), // Invalid ID - will never match
          companyId: new mongoose.Types.ObjectId(companyId as any)
        };
      }
    }

    const password = await Password.findOne(accessQuery);

    if (!password) {
      return res.status(404).json({ message: 'Password not found or access denied' });
    }

    // Create view log entry
    try {
      const userInfo = await getUserInfo(req.user!.role, id, req.user!.email);
      const viewLog = new PasswordLog({
        passwordId: password._id,
        action: 'view',
        performedBy: id,
        performedByName: userInfo.name,
        performedByEmail: userInfo.email,
        details: `Password viewed via extension`,
      });
      await viewLog.save();
      await Password.findByIdAndUpdate(password._id, { $push: { logs: viewLog._id } });
    } catch (logError) {
      console.error('Failed to create view log:', logError);
    }

    // Return decrypted credentials for autofill
    res.json({
      _id: password._id,
      itemName: password.itemName,
      username: decrypt(password.username),
      password: decrypt(password.password),
      websiteUrls: password.websiteUrls,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const quickAddPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { itemName, username, password, websiteUrl, notes } = req.body || {};
    if (!username || !password || !websiteUrl) {
      return res.status(400).json({ message: 'username, password, and websiteUrl are required' });
    }

    const { id, companyId } = req.user!;

    const encryptedUsername = encrypt(username);
    const encryptedPassword = encrypt(password);
    const encryptedNotes = notes ? encrypt(notes) : '';

    const inferredName = itemName || normalizeHost(new URL(websiteUrl).hostname);

    const newPassword = new Password({
      companyId,
      itemName: inferredName,
      username: encryptedUsername,
      password: encryptedPassword,
      websiteUrls: [websiteUrl],
      notes: encryptedNotes,
      createdBy: id,
    });

    await newPassword.save();

    try {
      const userInfo = await getUserInfo(req.user!.role, id, req.user!.email);
      const createLog = new PasswordLog({
        passwordId: newPassword._id,
        action: 'create',
        field: 'password',
        performedBy: id,
        performedByName: userInfo.name,
        performedByEmail: userInfo.email,
        details: `Password "${inferredName}" quick-added`,
      });
      await createLog.save();
      await Password.findByIdAndUpdate(newPassword._id, { $push: { logs: createLog._id } });
    } catch (logError) {
      console.error('Failed to create quick-add log:', logError);
    }

    res.status(201).json(newPassword);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


