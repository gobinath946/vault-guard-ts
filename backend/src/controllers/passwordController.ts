import { Response } from 'express';
import Password from '../models/Password';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { generatePassword } from '../utils/passwordGenerator';

export const getAllPasswords = async (req: AuthRequest, res: Response) => {
  try {
    const { role, id, companyId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    let query: any = {};
    
    if (role === 'company_super_admin') {
      query.companyId = id;
    } else {
      // Company user - only see passwords shared with them
      query = {
        companyId,
        $or: [{ createdBy: id }, { sharedWith: id }],
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

    // Decrypt sensitive fields
    const decryptedPassword = {
      ...password.toObject(),
      username: decrypt(password.username),
      password: decrypt(password.password),
      notes: password.notes ? decrypt(password.notes) : '',
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
    res.status(201).json(newPassword);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
  const { itemName, username, password, websiteUrls, notes, folderId, collectionId, organizationId } = req.body;

    // Encrypt sensitive data if provided
    const updateData: any = { 
      itemName, 
      websiteUrls: Array.isArray(websiteUrls) ? websiteUrls : [],
      folderId: folderId || undefined, 
      collectionId: collectionId || undefined,
      organizationId: organizationId || undefined,
      lastModified: new Date() 
    };

    if (username) updateData.username = encrypt(username);
    if (password) updateData.password = encrypt(password);
    if (notes) updateData.notes = encrypt(notes);

    const updatedPassword = await Password.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updatedPassword) {
      return res.status(404).json({ message: 'Password not found' });
    }

    res.json(updatedPassword);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePassword = async (req: AuthRequest, res: Response) => {
  try {
    const password = await Password.findByIdAndDelete(req.params.id);

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    res.json({ message: 'Password deleted successfully' });
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