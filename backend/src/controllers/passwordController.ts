import { Response } from 'express';
import Password from '../models/Password';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { generatePassword } from '../utils/passwordGenerator';

export const getAllPasswords = async (req: AuthRequest, res: Response) => {
  try {
    const { role, id, companyId } = req.user!;

    let passwords;
    if (role === 'company_super_admin') {
      passwords = await Password.find({ companyId: id });
    } else {
      // Company user - only see passwords shared with them
      passwords = await Password.find({
        companyId,
        $or: [{ createdBy: id }, { sharedWith: id }],
      });
    }

    res.json(passwords);
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
    const { itemName, username, password, websiteUrl, notes, folderId, collectionId } = req.body;
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
      websiteUrl,
      notes: encryptedNotes,
      folderId,
      collectionId,
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
    const { itemName, username, password, websiteUrl, notes, folderId, collectionId } = req.body;

    // Encrypt sensitive data if provided
    const updateData: any = { itemName, websiteUrl, folderId, collectionId, lastModified: new Date() };

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
