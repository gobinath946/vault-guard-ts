import { Response } from 'express';
import mongoose from 'mongoose';
import Password from '../models/Password';
import Trash from '../models/Trash';
import PasswordLog from '../models/PasswordLog';
import User from '../models/User';
import Company from '../models/Company';
import MasterAdmin from '../models/MasterAdmin';
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

    let query: any = {};
    if (role === 'company_super_admin') {
      query.companyId = id;
    } else if (role === 'company_user') {
      // Company user - see passwords for any permitted org/collection/folder
      const orgIds = req.user?.permissions?.organizations || [];
      const colIds = req.user?.permissions?.collections || [];
      const folderIds = req.user?.permissions?.folders || [];
      const orFilters = [];
      if (orgIds.length > 0) orFilters.push({ organizationId: { $in: orgIds } });
      if (colIds.length > 0) orFilters.push({ collectionId: { $in: colIds } });
      if (folderIds.length > 0) orFilters.push({ folderId: { $in: folderIds } });
      query = {
        companyId,
        $or: [
          { createdBy: id },
          { sharedWith: id },
          ...orFilters
        ]
      };
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