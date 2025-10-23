import { Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User';
import Password from '../models/Password';
import Organization from '../models/Organization';
import Collection from '../models/Collection';
import Folder from '../models/Folder';
import { AuthRequest } from '../middleware/auth';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.user!;

    const totalUsers = await User.countDocuments({ companyId: id });
    const activeUsers = await User.countDocuments({ companyId: id, isActive: true });
    const inactiveUsers = await User.countDocuments({ companyId: id, isActive: false });
    const totalPasswords = await Password.countDocuments({ companyId: id });

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalPasswords,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.user!;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const q = (req.query.q as string) || '';

    const query: any = { companyId: id };
    if (q) {
      query.$or = [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .populate('permissions.organizations', 'name description')
      .populate('permissions.collections', 'name description')
      .populate('permissions.folders', 'name description')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({ users, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, username, password, permissions } = req.body;
    const { id: companyId, id: createdBy } = req.user!; // Use id for both companyId and createdBy

    // Check if user exists within the same company
    const existingUser = await User.findOne({ email, companyId });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists in this company' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Process permissions - convert string IDs to ObjectIds
    const processedPermissions = {
      organizations: permissions?.organizations?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
      collections: permissions?.collections?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
      folders: permissions?.folders?.map((id: string) => new mongoose.Types.ObjectId(id)) || []
    };

    const user = new User({
      companyId,
      email,
      username,
      password: hashedPassword,
      permissions: processedPermissions,
      createdBy: new mongoose.Types.ObjectId(createdBy), // Convert to ObjectId
    });

    await user.save();

    // Return user without password and with populated permissions
    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('permissions.organizations', 'name description')
      .populate('permissions.collections', 'name description')
      .populate('permissions.folders', 'name description');

    res.status(201).json(userResponse);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    )
      .select('-password')
      .populate('permissions.organizations')
      .populate('permissions.collections')
      .populate('permissions.folders');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Map permissions to always return { _id, name, description }
    const mappedUser = user.toObject();
    mappedUser.permissions = {
      organizations: (user.permissions.organizations || []).map((org: any) => org && {
        _id: org._id,
        name: org.organizationName || org.name,
        description: org.organizationEmail || org.description || ''
      }),
      collections: (user.permissions.collections || []).map((col: any) => col && {
        _id: col._id,
        name: col.collectionName || col.name,
        description: col.description || '',
        organizationId: col.organizationId
      }),
      folders: (user.permissions.folders || []).map((folder: any) => folder && {
        _id: folder._id,
        name: folder.folderName || folder.name,
        description: folder.description || '',
        collectionId: folder.collectionId,
        organizationId: folder.organizationId
      })
    };

    res.json(mappedUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.body;
    const userId = req.params.id;

    // Validate that the user belongs to the same company
    const user = await User.findOne({ _id: userId, companyId: req.user!.id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent users from deactivating themselves
    if (userId === req.user!.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    )
      .select('-password')
      .populate('permissions.organizations', 'name description')
      .populate('permissions.collections', 'name description')
      .populate('permissions.folders', 'name description');

    // Map permissions to always return { _id, name, description }
    const mappedUser = updatedUser!.toObject();
    mappedUser.permissions = {
      organizations: (updatedUser!.permissions.organizations || []).map((org: any) => org && {
        _id: org._id,
        name: org.organizationName || org.name,
        description: org.organizationEmail || org.description || ''
      }),
      collections: (updatedUser!.permissions.collections || []).map((col: any) => col && {
        _id: col._id,
        name: col.collectionName || col.name,
        description: col.description || '',
        organizationId: col.organizationId
      }),
      folders: (updatedUser!.permissions.folders || []).map((folder: any) => folder && {
        _id: folder._id,
        name: folder.folderName || folder.name,
        description: folder.description || '',
        collectionId: folder.collectionId,
        organizationId: folder.organizationId
      })
    };

    res.json(mappedUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePermissions = async (req: AuthRequest, res: Response) => {
  try {
    const { permissions } = req.body;
    const userId = req.params.id;

    // Validate that the user belongs to the same company
    const user = await User.findOne({ _id: userId, companyId: req.user!.id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Process permissions - convert string IDs to ObjectIds
    const processedPermissions = {
      organizations: permissions?.organizations?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
      collections: permissions?.collections?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
      folders: permissions?.folders?.map((id: string) => new mongoose.Types.ObjectId(id)) || []
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { permissions: processedPermissions },
      { new: true }
    )
      .select('-password')
      .populate('permissions.organizations', 'name description')
      .populate('permissions.collections', 'name description')
      .populate('permissions.folders', 'name description');

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Hierarchical data methods
// In your companyController.ts, update the response format:

export const getOrganizations = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.user!;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const q = (req.query.q as string) || '';

    const query: any = { companyId: id };
    if (q) {
      query.organizationName = { $regex: q, $options: 'i' };
    }

    const total = await Organization.countDocuments(query);
    const organizations = await Organization.find(query)
      .select('organizationName organizationEmail')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ organizationName: 1 });

    // Return in consistent format that frontend expects
    const mappedOrganizations = organizations.map(org => ({
      _id: org._id,
      name: org.organizationName, // Use consistent 'name' field
      description: org.organizationEmail
    }));

    res.json({ organizations: mappedOrganizations, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCollections = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.user!;
    const { organizationId } = req.params;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const q = (req.query.q as string) || '';

    // Validate organization belongs to company
    const organization = await Organization.findOne({
      _id: organizationId,
      companyId: id
    });
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const query: any = {
      companyId: id,
      organizationId
    };
    if (q) {
      query.collectionName = { $regex: q, $options: 'i' };
    }

    const total = await Collection.countDocuments(query);
    const collections = await Collection.find(query)
      .select('collectionName description organizationId')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ collectionName: 1 });

    // Return in consistent format that frontend expects
    const mappedCollections = collections.map(collection => ({
      _id: collection._id,
      name: collection.collectionName, // Use consistent 'name' field
      description: collection.description,
      organizationId: collection.organizationId
    }));

    res.json({ collections: mappedCollections, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.user!;
    const { organizationId } = req.params;
    const collectionIds = (req.query.collectionIds as string)?.split(',') || [];
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const q = (req.query.q as string) || '';

    // Validate organization belongs to company
    const organization = await Organization.findOne({
      _id: organizationId,
      companyId: id
    });
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const query: any = {
      companyId: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    };

    if (collectionIds.length > 0 && collectionIds[0] !== '') {
      const validCollections = await Collection.find({
        _id: { $in: collectionIds },
        organizationId,
        companyId: id
      });

      if (validCollections.length !== collectionIds.length) {
        return res.status(400).json({ message: 'Invalid collection IDs' });
      }

      query.collectionId = { $in: collectionIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    if (q) {
      query.folderName = { $regex: q, $options: 'i' };
    }

    const total = await Folder.countDocuments(query);
    const folders = await Folder.find(query)
      .select('folderName collectionId organizationId')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ folderName: 1 });

    // Return in consistent format that frontend expects
    const mappedFolders = folders.map(folder => ({
      _id: folder._id,
      name: folder.folderName, // Use consistent 'name' field
      description: '',
      collectionId: folder.collectionId?.toString(),
      organizationId: folder.organizationId?.toString()
    }));

    res.json({ folders: mappedFolders, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};