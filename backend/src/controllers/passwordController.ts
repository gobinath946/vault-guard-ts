import { Response } from 'express';
import mongoose from 'mongoose';
import Password from '../models/Password';
import Trash from '../models/Trash';
import PasswordLog from '../models/PasswordLog';
import User from '../models/User';
import Company from '../models/Company';
import MasterAdmin from '../models/MasterAdmin';
import Collection from '../models/Collection';
import Folder from '../models/Folder';
import Organization from '../models/Organization';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { generatePassword } from '../utils/passwordGenerator';
import { 
  logPasswordActivity, 
  logPasswordEdit, 
  getClientIP,
  getAuditLogsForResource 
} from '../utils/auditLogger';

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

export const getAllPasswords = async (req: AuthRequest, res: Response) => {
  try {
    // Validate user data from JWT token
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { role, id, companyId } = req.user;
    
    if (!role || !id || !companyId) {
      return res.status(401).json({ message: 'Invalid user data in token' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filter parameters
    const organizationId = (req.query.organizationId as string)?.trim() || '';
    const collectionIdsParam = (req.query.collectionIds as string) || '';
    const folderIdsParam = (req.query.folderIds as string) || '';
    const collectionIds = collectionIdsParam ? collectionIdsParam.split(',').filter(id => id && id.trim() !== '') : [];
    const folderIds = folderIdsParam ? folderIdsParam.split(',').filter(id => id && id.trim() !== '') : [];
    

    let baseQuery: any = {};
    // Store user permissions for reuse in filter conditions
    let userOrgIds: mongoose.Types.ObjectId[] = [];
    let userColIds: mongoose.Types.ObjectId[] = [];
    let userFolderIds: mongoose.Types.ObjectId[] = [];
    
    if (role === 'master_admin') {
      // Master admin can access all passwords across all companies
      // No restrictions needed
      baseQuery = {};
    } else if (role === 'company_super_admin') {
      // Company super admin can access all passwords in their company
      baseQuery.companyId = new mongoose.Types.ObjectId(id);
    } else if (role === 'company_user') {
      // Company user - strict permission checking required
      // Verify user exists and is active
      const user = await User.findById(id);
      if (!user || !user.isActive) {
        return res.status(403).json({ message: 'User account is inactive or not found' });
      }

      // Verify user belongs to the company from token
      if (!user.companyId || user.companyId.toString() !== companyId.toString()) {
        return res.status(403).json({ message: 'User does not belong to the specified company' });
      }

      // Get permissions from database (NOT from JWT token)
      userOrgIds = (user.permissions?.organizations || []).map((oid: any) => 
        oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid)
      ).filter(Boolean);
      
      userColIds = (user.permissions?.collections || []).map((cid: any) => 
        cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid)
      ).filter(Boolean);
      
      userFolderIds = (user.permissions?.folders || []).map((fid: any) => 
        fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid)
      ).filter(Boolean);
      
      const orgIds = userOrgIds;
      const colIds = userColIds;
      const folderPerms = userFolderIds;
      
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
      
      // Build the query: company user can ONLY see passwords based on permissions
      // No createdBy or sharedWith checks - permissions only
      if (permissionFilters.length > 0) {
        baseQuery = {
          companyId: new mongoose.Types.ObjectId(companyId as any),
          $or: permissionFilters
        };
      } else {
        // If user has no permissions, return empty result
        baseQuery = {
          companyId: new mongoose.Types.ObjectId(companyId as any),
          _id: { $in: [] } // Empty result - no permissions
        };
      }
    } else {
      return res.status(403).json({ message: 'Invalid user role' });
    }

    // Build filter conditions and integrate with permissions for company_user
    const filterConditions: any[] = [];
    
    if (organizationId) {
      const orgObjectId = new mongoose.Types.ObjectId(organizationId);
      // For company_user, validate organization is in their permissions
      if (role === 'company_user') {
        // Use permissions fetched from database
        const hasOrgPermission = userOrgIds.some(oid => oid && oid.equals(orgObjectId));
        if (hasOrgPermission) {
          filterConditions.push({ organizationId: orgObjectId });
        } 
      } else {
        filterConditions.push({ organizationId: orgObjectId });
      }
    }
    
    if (collectionIds.length > 0) {
      const validCollectionIds = collectionIds.map(colId => new mongoose.Types.ObjectId(colId));
      // For company_user, validate collections are in their permissions
      if (role === 'company_user') {
        // Use permissions fetched from database
        const permittedCollectionIds = validCollectionIds.filter(colId => 
          userColIds.some(permColId => permColId && permColId.equals(colId))
        );
        if (permittedCollectionIds.length > 0) {
          filterConditions.push({ collectionId: { $in: permittedCollectionIds } });
        }
      } else {
        filterConditions.push({ collectionId: { $in: validCollectionIds } });
      }
    }
    
    if (folderIds.length > 0) {
      const validFolderIds = folderIds.map(folderId => new mongoose.Types.ObjectId(folderId));
      // For company_user, validate folders are in their permissions
      if (role === 'company_user') {
        // Use permissions fetched from database
        const permittedFolderIds = validFolderIds.filter(foldId => 
          userFolderIds.some(permFoldId => permFoldId && permFoldId.equals(foldId))
        );
        if (permittedFolderIds.length > 0) {
          filterConditions.push({ folderId: { $in: permittedFolderIds } });
        }
      } else {
        filterConditions.push({ folderId: { $in: validFolderIds } });
      }
    }

    // Combine base query with filters
    let query: any = { ...baseQuery };
    
    if (filterConditions.length > 0) {
      if (role === 'company_user' && baseQuery.$or) {
        // For company_user, use $and to combine permission-based $or with filter conditions
        // This is the standard MongoDB pattern: $and wraps both the $or and the filters
        const mergedFilters = filterConditions.reduce((acc, condition) => ({ ...acc, ...condition }), {});
        
        // Build $and array: baseQuery (with $or) + filters
        query = {
          $and: [
            baseQuery, // Contains companyId and $or with permission conditions
            mergedFilters // Filter conditions (organizationId, collectionId, folderId)
          ]
        };
        

      } else {
        // For super admin, combine filters with AND
        // Merge all filter conditions into baseQuery
        const mergedFilters = filterConditions.reduce((acc, condition) => ({ ...acc, ...condition }), {});
        query = {
          ...baseQuery,
          ...mergedFilters
        };
      }
    }
console.log("query",query)
    // Get total count for pagination
    const total = await Password.countDocuments(query);
    
    // Get paginated passwords
    const passwords = await Password.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Collect all unique IDs from passwords for batch fetching
    const passwordOrgIds = [...new Set(
      passwords
        .map(p => p.organizationId)
        .filter((id): id is mongoose.Types.ObjectId => id != null)
        .map(id => id.toString())
    )];
    const passwordColIds = [...new Set(
      passwords
        .map(p => p.collectionId)
        .filter((id): id is mongoose.Types.ObjectId => id != null)
        .map(id => id.toString())
    )];
    const passwordFolderIds = [...new Set(
      passwords
        .map(p => p.folderId)
        .filter((id): id is mongoose.Types.ObjectId => id != null)
        .map(id => id.toString())
    )];

    // Fetch all related entities in parallel for better performance
    const [organizations, collections, folders] = await Promise.all([
      passwordOrgIds.length > 0 ? Organization.find({ _id: { $in: passwordOrgIds.map(id => new mongoose.Types.ObjectId(id)) } })
        .select('_id organizationName organizationEmail')
        .lean() : [],
      passwordColIds.length > 0 ? Collection.find({ _id: { $in: passwordColIds.map(id => new mongoose.Types.ObjectId(id)) } })
        .select('_id collectionName description organizationId')
        .lean() : [],
      passwordFolderIds.length > 0 ? Folder.find({ _id: { $in: passwordFolderIds.map(id => new mongoose.Types.ObjectId(id)) } })
        .select('_id folderName collectionId organizationId')
        .lean() : []
    ]);

    // Create lookup maps for efficient access
    const orgMap = new Map<string, any>(organizations.map((org: any) => [org._id.toString(), org]));
    const colMap = new Map<string, any>(collections.map((col: any) => [col._id.toString(), col]));
    const folderMap = new Map<string, any>(folders.map((folder: any) => [folder._id.toString(), folder]));

    // Map passwords with hierarchy details
    const passwordsWithDetails = passwords.map(password => {
      const orgId = password.organizationId?.toString();
      const colId = password.collectionId?.toString();
      const folderId = password.folderId?.toString();

      const org = orgId ? orgMap.get(orgId) : null;
      const col = colId ? colMap.get(colId) : null;
      const folder = folderId ? folderMap.get(folderId) : null;

      return {
        ...password,
        organization: org ? {
          _id: org._id,
          name: org.organizationName,
          email: org.organizationEmail
        } : null,
        collection: col ? {
          _id: col._id,
          name: col.collectionName,
          description: col.description || '',
          organizationId: col.organizationId || null
        } : null,
        folder: folder ? {
          _id: folder._id,
          name: folder.folderName,
          collectionId: folder.collectionId || null,
          organizationId: folder.organizationId || null
        } : null,
        // Keep original IDs for backward compatibility
        organizationId: password.organizationId || null,
        collectionId: password.collectionId || null,
        folderId: password.folderId || null
      };
    });

    res.json({
      passwords: passwordsWithDetails,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPasswordById = async (req: AuthRequest, res: Response) => {
  try {
    // Validate user data from JWT token
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { role, id, companyId } = req.user;
    
    if (!role || !id || !companyId) {
      return res.status(401).json({ message: 'Invalid user data in token' });
    }

    const passwordId = req.params.id;
    if (!passwordId) {
      return res.status(400).json({ message: 'Password ID is required' });
    }

    // Build access query based on role and permissions
    let accessQuery: any = { _id: new mongoose.Types.ObjectId(passwordId) };
    
    if (role === 'master_admin') {
      // Master admin can access any password
      // No additional restrictions needed
    } else if (role === 'company_super_admin') {
      // Company super admin can access passwords in their company
      accessQuery.companyId = new mongoose.Types.ObjectId(id);
    } else if (role === 'company_user') {
      // Company user - strict permission checking required
      // Verify user exists and is active
      const user = await User.findById(id);
      if (!user || !user.isActive) {
        return res.status(403).json({ message: 'User account is inactive or not found' });
      }

      // Verify user belongs to the company from token
      if (!user.companyId || user.companyId.toString() !== companyId.toString()) {
        return res.status(403).json({ message: 'User does not belong to the specified company' });
      }

      // Get permissions from database (NOT from JWT token)
      const orgIds = (user.permissions?.organizations || []).map((oid: any) => 
        oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid)
      ).filter(Boolean);
      
      const colIds = (user.permissions?.collections || []).map((cid: any) => 
        cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid)
      ).filter(Boolean);
      
      const folderPerms = (user.permissions?.folders || []).map((fid: any) => 
        fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid)
      ).filter(Boolean);

      // Build hierarchical permission filters (same logic as getAllPasswords)
      const permissionFilters: any[] = [];
      
      // 1. Check folder permissions (highest priority - most specific)
      if (folderPerms.length > 0) {
        const folders = await Folder.find({ _id: { $in: folderPerms } })
          .select('_id collectionId organizationId')
          .lean();
        
        const folderCollectionIds = folders
          .map(f => f.collectionId)
          .filter(Boolean) as mongoose.Types.ObjectId[];
        
        const collections = folderCollectionIds.length > 0
          ? await Collection.find({ _id: { $in: folderCollectionIds } })
              .select('_id organizationId')
              .lean()
          : [];
        
        const collectionMap = new Map(
          collections.map((c: any) => [c._id.toString(), c])
        );
        
        const validFolderIds: mongoose.Types.ObjectId[] = [];
        
        for (const folder of folders) {
          let isValid = true;
          const folderId = folder._id as mongoose.Types.ObjectId;
          
          if (folder.collectionId) {
            const folderCollectionId = folder.collectionId as mongoose.Types.ObjectId;
            const hasCollectionPerm = colIds.some(cid => 
              cid && cid.equals(folderCollectionId)
            );
            
            if (!hasCollectionPerm) {
              isValid = false;
            } else {
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
                isValid = false;
              }
            }
          } else {
            if (folder.organizationId) {
              const folderOrgId = folder.organizationId as mongoose.Types.ObjectId;
              const hasOrgPerm = orgIds.some(oid => 
                oid && oid.equals(folderOrgId)
              );
              if (!hasOrgPerm) {
                isValid = false;
              }
            } else {
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
        const validCollections = await Collection.find({
          _id: { $in: colIds },
          organizationId: { $in: orgIds }
        }).select('_id').lean();
        
        const validCollectionIds = validCollections.map((c: any) => c._id);
        
        if (validCollectionIds.length > 0) {
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
      
      // Company user can ONLY see passwords based on permissions
      // No createdBy or sharedWith checks - permissions only
      if (permissionFilters.length > 0) {
        accessQuery = {
          _id: new mongoose.Types.ObjectId(passwordId),
          companyId: new mongoose.Types.ObjectId(companyId as any),
          $or: permissionFilters
        };
      } else {
        // If user has no permissions, deny access by using impossible condition
        accessQuery = {
          _id: new mongoose.Types.ObjectId('000000000000000000000001'), // Invalid ID - will never match
          companyId: new mongoose.Types.ObjectId(companyId as any)
        };
      }
    } else {
      return res.status(403).json({ message: 'Invalid user role' });
    }

    const password = await Password.findOne(accessQuery);

    if (!password) {
      return res.status(404).json({ message: 'Password not found or access denied' });
    }

    // Fetch organization, collection, and folder details for the response
    const [organization, collection, folder] = await Promise.all([
      password.organizationId ? Organization.findById(password.organizationId)
        .select('_id organizationName organizationEmail')
        .lean() : null,
      password.collectionId ? Collection.findById(password.collectionId)
        .select('_id collectionName description organizationId')
        .lean() : null,
      password.folderId ? Folder.findById(password.folderId)
        .select('_id folderName collectionId organizationId')
        .lean() : null
    ]);

    // Get logs with user information (name and email are now stored directly)
    const logsWithDetails = await PasswordLog.find({ passwordId: password._id })
      .sort({ timestamp: -1 })
      .lean();

    // Decrypt sensitive fields and include hierarchy details
    const decryptedPassword = {
      ...password.toObject(),
      username: decrypt(password.username),
      password: decrypt(password.password),
      notes: password.notes ? decrypt(password.notes) : '',
      logs: logsWithDetails,
      organization: organization ? {
        _id: organization._id,
        name: (organization as any).organizationName,
        email: (organization as any).organizationEmail
      } : null,
      collection: collection ? {
        _id: collection._id,
        name: (collection as any).collectionName,
        description: (collection as any).description || '',
        organizationId: (collection as any).organizationId || null
      } : null,
      folder: folder ? {
        _id: folder._id,
        name: (folder as any).folderName,
        collectionId: (folder as any).collectionId || null,
        organizationId: (folder as any).organizationId || null
      } : null,
      // Keep original IDs for backward compatibility
      organizationId: password.organizationId || null,
      collectionId: password.collectionId || null,
      folderId: password.folderId || null
    };

    res.json(decryptedPassword);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      itemName, 
      username, 
      password, 
      websiteUrls, 
      notes, 
      folderId, 
      collectionId, 
      organizationId
     } = req.body;
    const { id, companyId } = req.user!;

    // Check if itemName already exists within the same company and hierarchy
    // Use case-insensitive matching for itemName
    const normalizedItemName = itemName.trim();
    const duplicateQuery: any = {
      companyId: new mongoose.Types.ObjectId(companyId as any),
      itemName: { $regex: new RegExp(`^${normalizedItemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, // Case-insensitive exact match
    };

    // Add hierarchy filters to ensure uniqueness within the same location
    if (folderId) {
      // If folderId is provided, check ONLY within that specific folder
      // Must match exact folderId - exclude passwords with null/undefined folderId
      duplicateQuery.folderId = new mongoose.Types.ObjectId(folderId);
      // Ensure collectionId and organizationId also match if they exist (for additional safety)
      if (collectionId) {
        duplicateQuery.collectionId = new mongoose.Types.ObjectId(collectionId);
      }
      if (organizationId) {
        duplicateQuery.organizationId = new mongoose.Types.ObjectId(organizationId);
      }
    } else if (collectionId) {
      // If collectionId but no folderId, check within that collection (no folder passwords)
      duplicateQuery.collectionId = new mongoose.Types.ObjectId(collectionId);
      duplicateQuery.$or = [
        { folderId: { $exists: false } },
        { folderId: null }
      ];
      if (organizationId) {
        duplicateQuery.organizationId = new mongoose.Types.ObjectId(organizationId);
      }
    } else if (organizationId) {
      // If organizationId but no collectionId, check within that organization (no collection passwords)
      duplicateQuery.organizationId = new mongoose.Types.ObjectId(organizationId);
      duplicateQuery.$or = [
        { collectionId: { $exists: false } },
        { collectionId: null }
      ];
    } else {
      // If no hierarchy specified, check within company only (no organization passwords)
      duplicateQuery.$or = [
        { organizationId: { $exists: false } },
        { organizationId: null }
      ];
    }

    const existingPassword = await Password.findOne(duplicateQuery);
    if (existingPassword) {
      return res.status(400).json({ 
        message: `Item name "${itemName}" already exists in this location. Please choose a different name.` 
      });
    }

    // Encrypt sensitive data
    const encryptedUsername = encrypt(username);
    const encryptedPassword = encrypt(password);
    const encryptedNotes = notes ? encrypt(notes) : '';

    const newPassword = new Password({
      companyId,
      itemName,
      username: encryptedUsername,
      password: encryptedPassword,
      websiteUrls: Array.isArray(websiteUrls) ? websiteUrls : [],
      notes: encryptedNotes,
      folderId: folderId || undefined,
      collectionId: collectionId || undefined,
      organizationId: organizationId || undefined,
      createdBy: id,
    });

    await newPassword.save();

    // Create log entry for password creation
    try {
      const userInfo = await getUserInfo(req.user!.role, id, req.user!.email);
      const createLog = new PasswordLog({
        passwordId: newPassword._id,
        action: 'create',
        field: 'password',
        performedBy: id,
        performedByName: userInfo.name,
        performedByEmail: userInfo.email,
        details: `Password "${itemName}" created`,
      });
      await createLog.save();
      
      // Update password with log reference
      await Password.findByIdAndUpdate(newPassword._id, {
        $push: { logs: createLog._id }
      });
    } catch (logError) {
      console.error('Failed to create password log:', logError);
    }

    res.status(201).json(newPassword);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    // Validate user data from JWT token
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { role, id: userId, companyId } = req.user;
    
    if (!role || !userId || !companyId) {
      return res.status(401).json({ message: 'Invalid user data in token' });
    }

    const passwordId = req.params.id;
    if (!passwordId) {
      return res.status(400).json({ message: 'Password ID is required' });
    }

    const { itemName, username, password, websiteUrls, notes, folderId, collectionId, organizationId } = req.body;

    // Build access query to verify user has permission to update this password
    let accessQuery: any = { _id: new mongoose.Types.ObjectId(passwordId) };
    
    if (role === 'master_admin') {
      // Master admin can update any password
    } else if (role === 'company_super_admin') {
      // Company super admin can update passwords in their company
      accessQuery.companyId = new mongoose.Types.ObjectId(userId);
    } else if (role === 'company_user') {
      // Company user - verify user exists and is active
      const user = await User.findById(userId);
      if (!user || !user.isActive) {
        return res.status(403).json({ message: 'User account is inactive or not found' });
      }

      // Verify user belongs to the company from token
      if (!user.companyId || user.companyId.toString() !== companyId.toString()) {
        return res.status(403).json({ message: 'User does not belong to the specified company' });
      }

      // Get permissions from database (NOT from JWT token)
      const orgIds = (user.permissions?.organizations || []).map((oid: any) => 
        oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid)
      ).filter(Boolean);
      
      const colIds = (user.permissions?.collections || []).map((cid: any) => 
        cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid)
      ).filter(Boolean);
      
      const folderIds = (user.permissions?.folders || []).map((fid: any) => 
        fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid)
      ).filter(Boolean);

      // Build permission filters
      const orFilters: any[] = [];
      if (orgIds.length > 0) {
        orFilters.push({ organizationId: { $in: orgIds } });
      }
      if (colIds.length > 0) {
        orFilters.push({ collectionId: { $in: colIds } });
      }
      if (folderIds.length > 0) {
        orFilters.push({ folderId: { $in: folderIds } });
      }
      
      accessQuery = {
        _id: new mongoose.Types.ObjectId(passwordId),
        companyId: new mongoose.Types.ObjectId(companyId as any),
        $or: [
          { createdBy: new mongoose.Types.ObjectId(userId) },
          { sharedWith: new mongoose.Types.ObjectId(userId) },
          ...(orFilters.length > 0 ? orFilters : []),
        ],
      };
    } else {
      return res.status(403).json({ message: 'Invalid user role' });
    }

    // Get the old password to track changes - verify access
    const oldPassword = await Password.findOne(accessQuery);
    if (!oldPassword) {
      return res.status(404).json({ message: 'Password not found or access denied' });
    }

    // Always check if itemName already exists in the target location (even if name hasn't changed)
    // This ensures uniqueness is maintained even when moving passwords or updating names
    if (itemName) {
      const normalizedItemName = itemName.trim();
      const duplicateQuery: any = {
        companyId: new mongoose.Types.ObjectId(companyId as any),
        itemName: { $regex: new RegExp(`^${normalizedItemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, // Case-insensitive exact match
        _id: { $ne: new mongoose.Types.ObjectId(passwordId) }, // Exclude current password
      };

      // Add hierarchy filters based on new or existing location (use new values if provided, otherwise keep existing)
      const targetFolderId = folderId !== undefined ? folderId : oldPassword.folderId;
      const targetCollectionId = collectionId !== undefined ? collectionId : oldPassword.collectionId;
      const targetOrganizationId = organizationId !== undefined ? organizationId : oldPassword.organizationId;

      if (targetFolderId) {
        // If folderId exists, check ONLY within that specific folder
        // Must match exact folderId - exclude passwords with null/undefined folderId
        duplicateQuery.folderId = new mongoose.Types.ObjectId(targetFolderId);
        // Ensure collectionId and organizationId also match if they exist (for additional safety)
        if (targetCollectionId) {
          duplicateQuery.collectionId = new mongoose.Types.ObjectId(targetCollectionId);
        }
        if (targetOrganizationId) {
          duplicateQuery.organizationId = new mongoose.Types.ObjectId(targetOrganizationId);
        }
      } else if (targetCollectionId) {
        // If collectionId but no folderId, check within that collection (no folder passwords)
        duplicateQuery.collectionId = new mongoose.Types.ObjectId(targetCollectionId);
        duplicateQuery.$or = [
          { folderId: { $exists: false } },
          { folderId: null }
        ];
        if (targetOrganizationId) {
          duplicateQuery.organizationId = new mongoose.Types.ObjectId(targetOrganizationId);
        }
      } else if (targetOrganizationId) {
        // If organizationId but no collectionId, check within that organization (no collection passwords)
        duplicateQuery.organizationId = new mongoose.Types.ObjectId(targetOrganizationId);
        duplicateQuery.$or = [
          { collectionId: { $exists: false } },
          { collectionId: null }
        ];
      } else {
        // If no hierarchy specified, check within company only (no organization passwords)
        duplicateQuery.$or = [
          { organizationId: { $exists: false } },
          { organizationId: null }
        ];
      }

      const existingPassword = await Password.findOne(duplicateQuery);
      if (existingPassword) {
        return res.status(400).json({ 
          message: `Item name "${itemName}" already exists in this location. Please choose a different name.` 
        });
      }
    }

    // Encrypt sensitive data if provided
    const updateData: any = { 
      itemName, 
      websiteUrls: Array.isArray(websiteUrls) ? websiteUrls : [],
      folderId: folderId || undefined, 
      collectionId: collectionId || undefined,
      organizationId: organizationId || undefined,
      lastModified: new Date() 
    };

    const logEntries = [];

    // Track changes for each field
    if (itemName && itemName !== oldPassword.itemName) {
      logEntries.push({
        action: 'update' as const,
        field: 'itemName',
        oldValue: oldPassword.itemName,
        newValue: itemName,
        performedBy: userId,
      });
    }

    if (username) {
      const decryptedOldUsername = decrypt(oldPassword.username);
      const updateUsername = encrypt(username);
      updateData.username = updateUsername;
      
      if (decryptedOldUsername !== username) {
        logEntries.push({
          action: 'update' as const,
          field: 'username',
          performedBy: userId,
          details: 'Username changed',
        });
      }
    }

    if (password) {
      const updatePassword = encrypt(password);
      updateData.password = updatePassword;
      logEntries.push({
        action: 'update' as const,
        field: 'password',
        performedBy: userId,
        details: 'Password changed',
      });
    }

    if (notes) {
      const decryptedOldNotes = oldPassword.notes ? decrypt(oldPassword.notes) : '';
      const encryptedNotes = encrypt(notes);
      updateData.notes = encryptedNotes;
      
      if (decryptedOldNotes !== notes) {
        logEntries.push({
          action: 'update' as const,
          field: 'notes',
          performedBy: userId,
          details: 'Notes updated',
        });
      }
    }

    const updatedPassword = await Password.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updatedPassword) {
      return res.status(404).json({ message: 'Password not found' });
    }

    // Get user info for logs
    const userInfo = await getUserInfo(req.user!.role, userId, req.user!.email);
    
    // Create log entries for changes
    for (const logEntry of logEntries) {
      try {
        const log = new PasswordLog({
          passwordId: updatedPassword._id,
          ...logEntry,
          performedByName: userInfo.name,
          performedByEmail: userInfo.email,
        });
        await log.save();
        
        // Add log reference to password
        await Password.findByIdAndUpdate(updatedPassword._id, {
          $push: { logs: log._id },
        });
      } catch (logError) {
        console.error('Failed to create update log:', logError);
      }
    }

    // Log to audit system if there are actual changes
    if (logEntries.length > 0) {
      const ipAddress = getClientIP(req);
      const userAgent = req.headers['user-agent'];
      
      const auditChanges = logEntries.map(entry => ({
        field: entry.field,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
      }));

      logPasswordEdit(
        userId,
        req.user!.email,
        userInfo.name,
        role,
        companyId,
        (updatedPassword._id as any).toString(),
        updatedPassword.itemName,
        auditChanges,
        ipAddress,
        userAgent
      ).catch(err => console.error('Failed to log password edit:', err));
    }

    res.json(updatedPassword);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const softDeletePassword = async (req: AuthRequest, res: Response) => {
  try {
    // Validate user data from JWT token
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { role, id: userId, companyId } = req.user;
    
    if (!role || !userId || !companyId) {
      return res.status(401).json({ message: 'Invalid user data in token' });
    }

    const passwordId = req.params.id;
    if (!passwordId) {
      return res.status(400).json({ message: 'Password ID is required' });
    }

    // Build access query to verify user has permission to delete this password
    let accessQuery: any = { _id: new mongoose.Types.ObjectId(passwordId) };
    
    if (role === 'master_admin') {
      // Master admin can delete any password
    } else if (role === 'company_super_admin') {
      // Company super admin can delete passwords in their company
      accessQuery.companyId = new mongoose.Types.ObjectId(userId);
    } else if (role === 'company_user') {
      // Company user - verify user exists and is active
      const user = await User.findById(userId);
      if (!user || !user.isActive) {
        return res.status(403).json({ message: 'User account is inactive or not found' });
      }

      // Verify user belongs to the company from token
      if (!user.companyId || user.companyId.toString() !== companyId.toString()) {
        return res.status(403).json({ message: 'User does not belong to the specified company' });
      }

      // Get permissions from database (NOT from JWT token)
      const orgIds = (user.permissions?.organizations || []).map((oid: any) => 
        oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid)
      ).filter(Boolean);
      
      const colIds = (user.permissions?.collections || []).map((cid: any) => 
        cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid)
      ).filter(Boolean);
      
      const folderIds = (user.permissions?.folders || []).map((fid: any) => 
        fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid)
      ).filter(Boolean);

      // Build permission filters
      const orFilters: any[] = [];
      if (orgIds.length > 0) {
        orFilters.push({ organizationId: { $in: orgIds } });
      }
      if (colIds.length > 0) {
        orFilters.push({ collectionId: { $in: colIds } });
      }
      if (folderIds.length > 0) {
        orFilters.push({ folderId: { $in: folderIds } });
      }
      
      accessQuery = {
        _id: new mongoose.Types.ObjectId(passwordId),
        companyId: new mongoose.Types.ObjectId(companyId as any),
        $or: [
          { createdBy: new mongoose.Types.ObjectId(userId) },
          { sharedWith: new mongoose.Types.ObjectId(userId) },
          ...(orFilters.length > 0 ? orFilters : []),
        ],
      };
    } else {
      return res.status(403).json({ message: 'Invalid user role' });
    }

    const password = await Password.findOne(accessQuery);
    if (!password) {
      return res.status(404).json({ message: 'Password not found or access denied' });
    }

    // Get user info and create delete log before deleting
    try {
      const userInfo = await getUserInfo(req.user!.role, userId, req.user!.email);
      const deleteLog = new PasswordLog({
        passwordId: password._id,
        action: 'delete',
        performedBy: userId,
        performedByName: userInfo.name,
        performedByEmail: userInfo.email,
        details: `Password "${password.itemName}" deleted`,
      });
      await deleteLog.save();
    } catch (logError) {
      console.error('Failed to create delete log:', logError);
    }

    // Create trash record
    const trashRecord = new Trash({
      companyId,
      itemId: password._id,
      itemType: 'password',
      itemName: password.itemName,
      originalData: password.toObject(),
      deletedBy: userId,
      deletedFrom: 'Passwords',
    });

    await trashRecord.save();
    await Password.findByIdAndDelete(req.params.id);

    res.json({ message: 'Password moved to trash successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const generatePasswordHandler = async (req: AuthRequest, res: Response) => {
  try {
    const options = req.body;
    const password = generatePassword(options);
    res.json({ password });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkCreatePasswords = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { id, companyId } = req.user;
    const { passwords } = req.body;

    if (!Array.isArray(passwords) || passwords.length === 0) {
      return res.status(400).json({ message: 'Passwords array is required and must not be empty' });
    }

    const createdPasswords = [];
    const errors = [];

    for (let i = 0; i < passwords.length; i++) {
      const passwordData = passwords[i];
      const { itemName, username, password, websiteUrls, notes, folderId, collectionId, organizationId } = passwordData;

      try {
        // Check for duplicate itemName in the same location
        const normalizedItemName = itemName.trim();
        const duplicateQuery: any = {
          companyId: new mongoose.Types.ObjectId(companyId as any),
          itemName: { $regex: new RegExp(`^${normalizedItemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        };

        if (folderId) {
          duplicateQuery.folderId = new mongoose.Types.ObjectId(folderId);
          if (collectionId) {
            duplicateQuery.collectionId = new mongoose.Types.ObjectId(collectionId);
          }
          if (organizationId) {
            duplicateQuery.organizationId = new mongoose.Types.ObjectId(organizationId);
          }
        } else if (collectionId) {
          duplicateQuery.collectionId = new mongoose.Types.ObjectId(collectionId);
          duplicateQuery.$or = [
            { folderId: { $exists: false } },
            { folderId: null }
          ];
          if (organizationId) {
            duplicateQuery.organizationId = new mongoose.Types.ObjectId(organizationId);
          }
        } else if (organizationId) {
          duplicateQuery.organizationId = new mongoose.Types.ObjectId(organizationId);
          duplicateQuery.$or = [
            { collectionId: { $exists: false } },
            { collectionId: null }
          ];
        } else {
          duplicateQuery.$or = [
            { organizationId: { $exists: false } },
            { organizationId: null }
          ];
        }

        const existingPassword = await Password.findOne(duplicateQuery);
        if (existingPassword) {
          errors.push({
            index: i,
            itemName,
            error: `Item name "${itemName}" already exists in this location`
          });
          continue;
        }

        // Encrypt sensitive data
        const encryptedUsername = encrypt(username);
        const encryptedPassword = encrypt(password);
        const encryptedNotes = notes ? encrypt(notes) : '';

        const newPassword = new Password({
          companyId,
          itemName,
          username: encryptedUsername,
          password: encryptedPassword,
          websiteUrls: Array.isArray(websiteUrls) ? websiteUrls : [],
          notes: encryptedNotes,
          folderId: folderId || undefined,
          collectionId: collectionId || undefined,
          organizationId: organizationId || undefined,
          createdBy: id,
        });

        await newPassword.save();
        createdPasswords.push(newPassword);

        // Create log entry
        try {
          const userInfo = await getUserInfo(req.user!.role, id, req.user!.email);
          const createLog = new PasswordLog({
            passwordId: newPassword._id,
            action: 'create',
            field: 'password',
            performedBy: id,
            performedByName: userInfo.name,
            performedByEmail: userInfo.email,
            details: `Password "${itemName}" created via bulk operation`,
          });
          await createLog.save();
          
          await Password.findByIdAndUpdate(newPassword._id, {
            $push: { logs: createLog._id }
          });
        } catch (logError) {
          console.error('Failed to create password log:', logError);
        }
      } catch (error: any) {
        errors.push({
          index: i,
          itemName,
          error: error.message
        });
      }
    }

    res.status(201).json({
      message: `Bulk create completed: ${createdPasswords.length} created, ${errors.length} failed`,
      created: createdPasswords.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkMovePasswords = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { role, id: userId, companyId } = req.user;
    const { passwordIds, collectionId, folderId } = req.body;

    if (!Array.isArray(passwordIds) || passwordIds.length === 0) {
      return res.status(400).json({ message: 'Password IDs array is required and must not be empty' });
    }

    if (!collectionId && !folderId) {
      return res.status(400).json({ message: 'Either collectionId or folderId must be provided' });
    }

    // Verify target collection/folder exists and user has access
    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (!folder) {
        return res.status(404).json({ message: 'Target folder not found' });
      }
      
      // For company users, verify they have permission to the target folder
      if (role === 'company_user') {
        const user = await User.findById(userId);
        if (!user || !user.isActive) {
          return res.status(403).json({ message: 'User account is inactive or not found' });
        }
        
        const folderPerms = (user.permissions?.folders || []).map((fid: any) => 
          fid._id ? fid._id.toString() : fid.toString()
        );
        
        if (!folderPerms.includes(folderId)) {
          return res.status(403).json({ message: 'You do not have permission to move passwords to this folder' });
        }
      }
    } else if (collectionId) {
      const collection = await Collection.findById(collectionId);
      if (!collection) {
        return res.status(404).json({ message: 'Target collection not found' });
      }
      
      // For company users, verify they have permission to the target collection
      if (role === 'company_user') {
        const user = await User.findById(userId);
        if (!user || !user.isActive) {
          return res.status(403).json({ message: 'User account is inactive or not found' });
        }
        
        const colPerms = (user.permissions?.collections || []).map((cid: any) => 
          cid._id ? cid._id.toString() : cid.toString()
        );
        
        if (!colPerms.includes(collectionId)) {
          return res.status(403).json({ message: 'You do not have permission to move passwords to this collection' });
        }
      }
    }

    const movedPasswords = [];
    const errors = [];

    for (const passwordId of passwordIds) {
      try {
        // Build access query based on role
        let accessQuery: any = { _id: new mongoose.Types.ObjectId(passwordId) };
        
        if (role === 'master_admin') {
          // Master admin can move any password
        } else if (role === 'company_super_admin') {
          accessQuery.companyId = new mongoose.Types.ObjectId(userId);
        } else if (role === 'company_user') {
          const user = await User.findById(userId);
          if (!user || !user.isActive) {
            errors.push({ passwordId, error: 'User account is inactive' });
            continue;
          }

          const orgIds = (user.permissions?.organizations || []).map((oid: any) => 
            oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid)
          ).filter(Boolean);
          
          const colIds = (user.permissions?.collections || []).map((cid: any) => 
            cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid)
          ).filter(Boolean);
          
          const folderIds = (user.permissions?.folders || []).map((fid: any) => 
            fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid)
          ).filter(Boolean);

          const orFilters: any[] = [];
          if (orgIds.length > 0) {
            orFilters.push({ organizationId: { $in: orgIds } });
          }
          if (colIds.length > 0) {
            orFilters.push({ collectionId: { $in: colIds } });
          }
          if (folderIds.length > 0) {
            orFilters.push({ folderId: { $in: folderIds } });
          }
          
          accessQuery = {
            _id: new mongoose.Types.ObjectId(passwordId),
            companyId: new mongoose.Types.ObjectId(companyId as any),
            $or: [
              { createdBy: new mongoose.Types.ObjectId(userId) },
              { sharedWith: new mongoose.Types.ObjectId(userId) },
              ...(orFilters.length > 0 ? orFilters : []),
            ],
          };
        }

        const password = await Password.findOne(accessQuery);
        if (!password) {
          errors.push({ passwordId, error: 'Password not found or access denied' });
          continue;
        }

        // Update password location
        const updateData: any = {
          lastModified: new Date()
        };

        if (folderId) {
          updateData.folderId = new mongoose.Types.ObjectId(folderId);
          // Get folder's collection and organization
          const folder = await Folder.findById(folderId);
          if (folder) {
            if (folder.collectionId) {
              updateData.collectionId = folder.collectionId;
            }
            if (folder.organizationId) {
              updateData.organizationId = folder.organizationId;
            }
          }
        } else if (collectionId) {
          updateData.collectionId = new mongoose.Types.ObjectId(collectionId);
          updateData.folderId = undefined;
          // Get collection's organization
          const collection = await Collection.findById(collectionId);
          if (collection && collection.organizationId) {
            updateData.organizationId = collection.organizationId;
          }
        }

        await Password.findByIdAndUpdate(passwordId, updateData);
        movedPasswords.push(passwordId);

        // Create log entry
        try {
          const userInfo = await getUserInfo(req.user!.role, userId, req.user!.email);
          const moveLog = new PasswordLog({
            passwordId: password._id,
            action: 'update',
            field: 'location',
            performedBy: userId,
            performedByName: userInfo.name,
            performedByEmail: userInfo.email,
            details: `Password moved via bulk operation`,
          });
          await moveLog.save();
          
          await Password.findByIdAndUpdate(password._id, {
            $push: { logs: moveLog._id }
          });
        } catch (logError) {
          console.error('Failed to create move log:', logError);
        }
      } catch (error: any) {
        errors.push({ passwordId, error: error.message });
      }
    }

    res.json({
      message: `Bulk move completed: ${movedPasswords.length} moved, ${errors.length} failed`,
      moved: movedPasswords.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


// Attachment management
export const addAttachment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { id: userId, companyId } = req.user;
    const passwordId = req.params.id;
    const { fileUrl, fileName, fileSize, mimeType, s3Key } = req.body;

    if (!fileUrl || !fileName || !s3Key) {
      return res.status(400).json({ message: 'File URL, file name, and S3 key are required' });
    }

    const password = await Password.findOne({
      _id: new mongoose.Types.ObjectId(passwordId),
      companyId: new mongoose.Types.ObjectId(companyId as any),
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const attachment = {
      fileUrl,
      fileName,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/octet-stream',
      s3Key,
      uploadedAt: new Date(),
    };

    password.attachments.push(attachment);
    await password.save();

    // Create log entry
    try {
      const userInfo = await getUserInfo(req.user!.role, userId, req.user!.email);
      const log = new PasswordLog({
        passwordId: password._id,
        action: 'update',
        field: 'attachments',
        performedBy: userId,
        performedByName: userInfo.name,
        performedByEmail: userInfo.email,
        details: `Attachment "${fileName}" added`,
      });
      await log.save();
    } catch (logError) {
      console.error('Failed to create attachment log:', logError);
    }

    res.json({ message: 'Attachment added successfully', attachment });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { id: userId, companyId } = req.user;
    const { id: passwordId, attachmentId } = req.params;

    const password = await Password.findOne({
      _id: new mongoose.Types.ObjectId(passwordId),
      companyId: new mongoose.Types.ObjectId(companyId as any),
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const attachmentIndex = password.attachments.findIndex(
      (att: any) => att._id.toString() === attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const deletedAttachment = password.attachments[attachmentIndex];
    password.attachments.splice(attachmentIndex, 1);
    await password.save();

    // Create log entry
    try {
      const userInfo = await getUserInfo(req.user!.role, userId, req.user!.email);
      const log = new PasswordLog({
        passwordId: password._id,
        action: 'update',
        field: 'attachments',
        performedBy: userId,
        performedByName: userInfo.name,
        performedByEmail: userInfo.email,
        details: `Attachment "${deletedAttachment.fileName}" deleted`,
      });
      await log.save();
    } catch (logError) {
      console.error('Failed to create attachment delete log:', logError);
    }

    res.json({ 
      message: 'Attachment deleted successfully', 
      s3Key: deletedAttachment.s3Key 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttachments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { companyId } = req.user;
    const passwordId = req.params.id;

    const password = await Password.findOne({
      _id: new mongoose.Types.ObjectId(passwordId),
      companyId: new mongoose.Types.ObjectId(companyId as any),
    }).select('attachments');

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    res.json({ attachments: password.attachments });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Audit logging endpoints

/**
 * Log when a user views a username
 */
export const logViewUsername = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { id: userId, email, role, companyId } = req.user;
    const { passwordId, passwordName } = req.body;

    if (!passwordId || !passwordName) {
      return res.status(400).json({ message: 'Password ID and name are required' });
    }

    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    // Get user name
    const userName = await getUserName(role, userId);

    // Log asynchronously
    logPasswordActivity(
      userId,
      email,
      userName,
      role,
      companyId!,
      'view_username',
      passwordId,
      passwordName,
      ipAddress,
      userAgent
    ).catch(err => console.error('Failed to log view username:', err));

    res.json({ message: 'Activity logged' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Log when a user copies a username
 */
export const logCopyUsername = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { id: userId, email, role, companyId } = req.user;
    const { passwordId, passwordName } = req.body;

    if (!passwordId || !passwordName) {
      return res.status(400).json({ message: 'Password ID and name are required' });
    }

    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    const userName = await getUserName(role, userId);

    logPasswordActivity(
      userId,
      email,
      userName,
      role,
      companyId!,
      'copy_username',
      passwordId,
      passwordName,
      ipAddress,
      userAgent
    ).catch(err => console.error('Failed to log copy username:', err));

    res.json({ message: 'Activity logged' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Log when a user views a password
 */
export const logViewPassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { id: userId, email, role, companyId } = req.user;
    const { passwordId, passwordName } = req.body;

    if (!passwordId || !passwordName) {
      return res.status(400).json({ message: 'Password ID and name are required' });
    }

    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    const userName = await getUserName(role, userId);

    logPasswordActivity(
      userId,
      email,
      userName,
      role,
      companyId!,
      'view_password',
      passwordId,
      passwordName,
      ipAddress,
      userAgent
    ).catch(err => console.error('Failed to log view password:', err));

    res.json({ message: 'Activity logged' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Log when a user copies a password
 */
export const logCopyPassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { id: userId, email, role, companyId } = req.user;
    const { passwordId, passwordName } = req.body;

    if (!passwordId || !passwordName) {
      return res.status(400).json({ message: 'Password ID and name are required' });
    }

    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    const userName = await getUserName(role, userId);

    logPasswordActivity(
      userId,
      email,
      userName,
      role,
      companyId!,
      'copy_password',
      passwordId,
      passwordName,
      ipAddress,
      userAgent
    ).catch(err => console.error('Failed to log copy password:', err));

    res.json({ message: 'Activity logged' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get audit logs for a specific password
 */
export const getPasswordAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const passwordId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!passwordId) {
      return res.status(400).json({ message: 'Password ID is required' });
    }

    // Verify user has access to this password
    const { role, id: userId, companyId } = req.user;
    let accessQuery: any = { _id: new mongoose.Types.ObjectId(passwordId) };
    
    if (role === 'master_admin') {
      // Master admin can access any password
    } else if (role === 'company_super_admin') {
      accessQuery.companyId = new mongoose.Types.ObjectId(userId);
    } else if (role === 'company_user') {
      const user = await User.findById(userId);
      if (!user || !user.isActive) {
        return res.status(403).json({ message: 'User account is inactive or not found' });
      }

      const orgIds = (user.permissions?.organizations || []).map((oid: any) => 
        oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid)
      ).filter(Boolean);
      
      const colIds = (user.permissions?.collections || []).map((cid: any) => 
        cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid)
      ).filter(Boolean);
      
      const folderIds = (user.permissions?.folders || []).map((fid: any) => 
        fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid)
      ).filter(Boolean);

      const orFilters: any[] = [];
      if (orgIds.length > 0) {
        orFilters.push({ organizationId: { $in: orgIds } });
      }
      if (colIds.length > 0) {
        orFilters.push({ collectionId: { $in: colIds } });
      }
      if (folderIds.length > 0) {
        orFilters.push({ folderId: { $in: folderIds } });
      }
      
      accessQuery = {
        _id: new mongoose.Types.ObjectId(passwordId),
        companyId: new mongoose.Types.ObjectId(companyId as any),
        $or: [
          { createdBy: new mongoose.Types.ObjectId(userId) },
          { sharedWith: new mongoose.Types.ObjectId(userId) },
          ...(orFilters.length > 0 ? orFilters : []),
        ],
      };
    }

    const password = await Password.findOne(accessQuery);
    if (!password) {
      return res.status(404).json({ message: 'Password not found or access denied' });
    }

    // Get audit logs
    const auditLogs = await getAuditLogsForResource(passwordId, limit);

    res.json({ auditLogs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to get user name
async function getUserName(role: string, userId: string): Promise<string> {
  try {
    if (role === 'master_admin') {
      const admin = await MasterAdmin.findById(userId);
      return admin ? admin.email : 'Master Admin';
    } else if (role === 'company_super_admin') {
      const company = await Company.findById(userId);
      return company ? (company.contactName || company.companyName) : 'Company Admin';
    } else if (role === 'company_user') {
      const user = await User.findById(userId);
      return user ? (user.username || user.email) : 'User';
    }
  } catch (error) {
    console.error('Error fetching user name:', error);
  }
  return 'Unknown User';
}
