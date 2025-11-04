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
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { generatePassword } from '../utils/passwordGenerator';

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
    const { role, id, companyId } = req.user!;
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
    if (role === 'company_super_admin') {
      baseQuery.companyId = id;
    } else if (role === 'company_user') {
      // Company user - see passwords based on hierarchical permissions
      // Hierarchy: Organization → Collection → Folder
      // Permissions come from JWT as strings, convert to ObjectIds
      const orgIds = (req.user?.permissions?.organizations || []).map((oid: any) => {
        if (typeof oid === 'string') {
          return mongoose.Types.ObjectId.isValid(oid) ? new mongoose.Types.ObjectId(oid) : null;
        }
        return oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid);
      }).filter(Boolean);
      
      const colIds = (req.user?.permissions?.collections || []).map((cid: any) => {
        if (typeof cid === 'string') {
          return mongoose.Types.ObjectId.isValid(cid) ? new mongoose.Types.ObjectId(cid) : null;
        }
        return cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid);
      }).filter(Boolean);
      
      const folderPerms = (req.user?.permissions?.folders || []).map((fid: any) => {
        if (typeof fid === 'string') {
          return mongoose.Types.ObjectId.isValid(fid) ? new mongoose.Types.ObjectId(fid) : null;
        }
        return fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid);
      }).filter(Boolean);
      
      const permissionFilters: any[] = [];
      
      // If user has organization permissions, they can see all passwords in those organizations
      if (orgIds.length > 0) {
        permissionFilters.push({ organizationId: { $in: orgIds } });
      }
      
      // If user has collection permissions, they can see passwords in those collections
      // But we need to verify the collections belong to organizations they have access to
      if (colIds.length > 0) {
        if (orgIds.length > 0) {
          // Only include collections that belong to permitted organizations
          const validCollections = await Collection.find({
            _id: { $in: colIds },
            organizationId: { $in: orgIds }
          }).select('_id').lean();
          
          const validCollectionObjectIds = validCollections.map(c => c._id);
          if (validCollectionObjectIds.length > 0) {
            permissionFilters.push({ collectionId: { $in: validCollectionObjectIds } });
          }
        } else {
          // If no org permissions, user can still see passwords in permitted collections
          permissionFilters.push({ collectionId: { $in: colIds } });
        }
      }
      
      // If user has folder permissions, they can see passwords in those folders
      // But we need to verify the folders belong to collections/organizations they have access to
      if (folderPerms.length > 0) {
        // Get folders that belong to permitted organizations and/or collections
        const folderQuery: any = { _id: { $in: folderPerms } };
        const folderOrConditions: any[] = [];
        
        if (orgIds.length > 0) {
          folderOrConditions.push({ organizationId: { $in: orgIds } });
        }
        if (colIds.length > 0) {
          folderOrConditions.push({ collectionId: { $in: colIds } });
        }
        
        if (folderOrConditions.length > 0) {
          folderQuery.$or = folderOrConditions;
        }
        
        const validFolders = await Folder.find(folderQuery).select('_id').lean();
        const validFolderObjectIds = validFolders.map(f => f._id);
        
        if (validFolderObjectIds.length > 0) {
          permissionFilters.push({ folderId: { $in: validFolderObjectIds } });
        }
      }
      
      // Build the query: user can see passwords they created, shared with them, or in permitted hierarchy
      baseQuery = {
        companyId,
        $or: [
          { createdBy: id },
          { sharedWith: id },
          ...(permissionFilters.length > 0 ? permissionFilters : [])
        ]
      };
    }

    // Build filter conditions and integrate with permissions for company_user
    const filterConditions: any[] = [];
    
    if (organizationId) {
      const orgObjectId = new mongoose.Types.ObjectId(organizationId);
      // For company_user, validate organization is in their permissions
      if (role === 'company_user') {
        const orgIds = (req.user?.permissions?.organizations || []).map((oid: any) => {
          if (typeof oid === 'string') {
            return mongoose.Types.ObjectId.isValid(oid) ? new mongoose.Types.ObjectId(oid) : null;
          }
          return oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid);
        }).filter(Boolean);
        
        // Only apply filter if organization is in user's permissions
        const hasOrgPermission = orgIds.some(oid => oid && oid.equals(orgObjectId));
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
        const colIds = (req.user?.permissions?.collections || []).map((cid: any) => {
          if (typeof cid === 'string') {
            return mongoose.Types.ObjectId.isValid(cid) ? new mongoose.Types.ObjectId(cid) : null;
          }
          return cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid);
        }).filter(Boolean);
        
        // Only include collections that user has permission to
        const permittedCollectionIds = validCollectionIds.filter(colId => 
          colIds.some(permColId => permColId && permColId.equals(colId))
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
        const folderPerms = (req.user?.permissions?.folders || []).map((fid: any) => {
          if (typeof fid === 'string') {
            return mongoose.Types.ObjectId.isValid(fid) ? new mongoose.Types.ObjectId(fid) : null;
          }
          return fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid);
        }).filter(Boolean);
        
        // Only include folders that user has permission to
        const permittedFolderIds = validFolderIds.filter(foldId => 
          folderPerms.some(permFoldId => permFoldId && permFoldId.equals(foldId))
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

    // Get total count for pagination
    const total = await Password.countDocuments(query);
    
    // Get paginated passwords
    const passwords = await Password.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      passwords,
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
    const password = await Password.findById(req.params.id);

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    // Get logs with user information (name and email are now stored directly)
    const logsWithDetails = await PasswordLog.find({ passwordId: password._id })
      .sort({ timestamp: -1 })
      .lean();

    // Decrypt sensitive fields
    const decryptedPassword = {
      ...password.toObject(),
      username: decrypt(password.username),
      password: decrypt(password.password),
      notes: password.notes ? decrypt(password.notes) : '',
      logs: logsWithDetails,
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
    const { itemName, username, password, websiteUrls, notes, folderId, collectionId, organizationId } = req.body;
    const { id: userId } = req.user!;

    // Get the old password to track changes
    const oldPassword = await Password.findById(req.params.id);
    if (!oldPassword) {
      return res.status(404).json({ message: 'Password not found' });
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

    res.json(updatedPassword);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const softDeletePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id: userId } = req.user!;
    const { companyId } = req.user!;

    const password = await Password.findById(req.params.id);
    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
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