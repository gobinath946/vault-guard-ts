import { Response } from 'express';
import mongoose from 'mongoose';
import Password from '../models/Password';
import PasswordLog from '../models/PasswordLog';
import User from '../models/User';
import Company from '../models/Company';
import MasterAdmin from '../models/MasterAdmin';
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

    const { role, id, companyId } = req.user!;
    const host = getHostname(rawHost);
    const baseHost = getBaseDomain(host);

    let accessQuery: any = {};
    if (role === 'company_super_admin') {
      accessQuery.companyId = new mongoose.Types.ObjectId(id);
    } else if (role === 'company_user') {
      const orgIds = req.user?.permissions?.organizations || [];
      const colIds = req.user?.permissions?.collections || [];
      const folderIds = req.user?.permissions?.folders || [];
      const orFilters: any[] = [];
      if (orgIds.length > 0) orFilters.push({ organizationId: { $in: orgIds } });
      if (colIds.length > 0) orFilters.push({ collectionId: { $in: colIds } });
      if (folderIds.length > 0) orFilters.push({ folderId: { $in: folderIds } });
      accessQuery = {
        companyId: new mongoose.Types.ObjectId(companyId as any),
        $or: [
          { createdBy: id },
          { sharedWith: id },
          ...orFilters,
        ],
      };
    }

    // Broad contains search using base domain, precise filter in Node
    const escaped = baseHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = {
      ...accessQuery,
      websiteUrls: { $elemMatch: { $regex: escaped, $options: 'i' } },
    } as any;
    const results = await Password.find(query).sort({ updatedAt: -1 });

    const matched = results.filter(p =>
      Array.isArray(p.websiteUrls) && p.websiteUrls.some(u => urlHostnameMatches(u, baseHost))
    );

    const decrypted = matched.map((p) => ({
      _id: p._id,
      itemName: p.itemName,
      username: decrypt(p.username),
      password: decrypt(p.password),
      websiteUrls: p.websiteUrls,
      notes: p.notes ? decrypt(p.notes) : '',
      folderId: p.folderId,
      collectionId: p.collectionId,
      organizationId: p.organizationId,
      companyId: p.companyId,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
      // Add display label for extension popup selection
      displayLabel: `${p.itemName} (${decrypt(p.username)})`,
    }));

    // Return response with metadata about multiple options
    res.json({ 
      host,
      baseHost,
      items: decrypted,
      hasMultiple: decrypted.length > 1,
      count: decrypted.length,
      // If single item, return it directly for easy autofill
      ...(decrypted.length === 1 ? {
        selected: decrypted[0]
      } : {})
    });
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

    const { role, id, companyId } = req.user!;

    // Build access query based on role
    let accessQuery: any = { _id: new mongoose.Types.ObjectId(passwordId) };
    
    if (role === 'company_super_admin') {
      accessQuery.companyId = new mongoose.Types.ObjectId(id);
    } else if (role === 'company_user') {
      const orgIds = req.user?.permissions?.organizations || [];
      const colIds = req.user?.permissions?.collections || [];
      const folderIds = req.user?.permissions?.folders || [];
      const orFilters: any[] = [];
      if (orgIds.length > 0) orFilters.push({ organizationId: { $in: orgIds } });
      if (colIds.length > 0) orFilters.push({ collectionId: { $in: colIds } });
      if (folderIds.length > 0) orFilters.push({ folderId: { $in: folderIds } });
      
      accessQuery = {
        _id: new mongoose.Types.ObjectId(passwordId),
        companyId: new mongoose.Types.ObjectId(companyId as any),
        $or: [
          { createdBy: id },
          { sharedWith: id },
          ...orFilters,
        ],
      };
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


