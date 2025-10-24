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

export const getEnhancedDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.user!;

    // Basic counts
    const totalUsers = await User.countDocuments({ companyId: id });
    const activeUsers = await User.countDocuments({ companyId: id, isActive: true });
    const inactiveUsers = await User.countDocuments({ companyId: id, isActive: false });
    const totalPasswords = await Password.countDocuments({ companyId: id });
    const totalCollections = await Collection.countDocuments({ companyId: id });
    const totalFolders = await Folder.countDocuments({ companyId: id });
    const totalOrganizations = await Organization.countDocuments({ companyId: id });

    // Password growth data (last 7 days)
    const passwordGrowth = await Password.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(id),
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // User activity data (last 7 days)
    const userActivity = await User.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(id),
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          newUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing dates for charts
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const filledPasswordGrowth = last7Days.map(date => {
      const existing = passwordGrowth.find(item => item._id === date);
      return {
        date,
        count: existing ? existing.count : 0
      };
    });

    const filledUserActivity = last7Days.map(date => {
      const existing = userActivity.find(item => item._id === date);
      return {
        date,
        activeUsers: existing ? existing.activeUsers : 0,
        newUsers: existing ? existing.newUsers : 0
      };
    });

    // Category distribution
    const categoryDistribution = [
      { name: 'Passwords', value: totalPasswords, color: '#0088FE' },
      { name: 'Collections', value: totalCollections, color: '#00C49F' },
      { name: 'Folders', value: totalFolders, color: '#FFBB28' },
      { name: 'Organizations', value: totalOrganizations, color: '#FF8042' },
      { name: 'Users', value: totalUsers, color: '#8884D8' },
      { name: 'Active Users', value: activeUsers, color: '#82CA9D' }
    ];

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalPasswords,
      totalCollections,
      totalFolders,
      totalOrganizations,
      passwordGrowth: filledPasswordGrowth,
      userActivity: filledUserActivity,
      categoryDistribution
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
    const { id: companyId, id: createdBy } = req.user!;

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
      createdBy: new mongoose.Types.ObjectId(createdBy),
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
    const { password, ...updateData } = req.body;
    
    // If password is provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Process permissions if provided
    if (updateData.permissions) {
      updateData.permissions = {
        organizations: updateData.permissions?.organizations?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
        collections: updateData.permissions?.collections?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
        folders: updateData.permissions?.folders?.map((id: string) => new mongoose.Types.ObjectId(id)) || []
      };
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
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

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found after update' });
    }

    // Map permissions to always return { _id, name, description }
    const mappedUser = updatedUser.toObject();
    mappedUser.permissions = {
      organizations: (updatedUser.permissions.organizations || []).map((org: any) => org && {
        _id: org._id,
        name: org.organizationName || org.name,
        description: org.organizationEmail || org.description || ''
      }),
      collections: (updatedUser.permissions.collections || []).map((col: any) => col && {
        _id: col._id,
        name: col.collectionName || col.name,
        description: col.description || '',
        organizationId: col.organizationId
      }),
      folders: (updatedUser.permissions.folders || []).map((folder: any) => folder && {
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

import Trash from '../models/Trash';

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Move user to Trash
    await Trash.create({
      companyId: user.companyId,
      itemId: user._id,
      itemType: 'user',
      itemName: user.username || user.email,
      originalData: user.toObject(),
      deletedBy: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
      deletedFrom: 'users',
      deletedAt: new Date(),
      isRestored: false,
    });
    await user.deleteOne();
    res.json({ message: 'User moved to trash successfully' });
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

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found after update' });
    }

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Hierarchical data methods
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
    // Accept organizationId from path param (as used by frontend)
    const organizationId = req.params.organizationId;
    let collectionIds = (req.query.collectionIds as string)?.split(',') || [];
    collectionIds = collectionIds.filter(cid => cid && cid.trim() !== '');
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const q = (req.query.q as string) || '';

    // Validate organization belongs to company
    const organization = await Organization.findOne({ _id: organizationId, companyId: id });
    if (!organization) {
      return res.status(400).json({ message: 'Invalid organization ID' });
    }

    const query: any = {
      companyId: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    };

    if (collectionIds.length > 0 && collectionIds[0] !== '') {
      const validCollections = await Collection.find({
        _id: { $in: collectionIds },
        organizationId: organizationId,
        companyId: id
      });
      if (validCollections.length !== collectionIds.length) {
        return res.status(400).json({ message: 'Invalid collection IDs' });
      }
      query.collectionId = { $in: collectionIds.map(cid => new mongoose.Types.ObjectId(cid)) };
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
      name: folder.folderName,
      description: '',
      collectionId: folder.collectionId?.toString(),
      organizationId: folder.organizationId?.toString()
    }));

    res.json({ folders: mappedFolders, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Additional dashboard statistics
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.user!;

    // Get all basic counts in parallel for better performance
    const [
      totalUsers,
      activeUsers,
      totalPasswords,
      totalCollections,
      totalFolders,
      totalOrganizations
    ] = await Promise.all([
      User.countDocuments({ companyId: id }),
      User.countDocuments({ companyId: id, isActive: true }),
      Password.countDocuments({ companyId: id }),
      Collection.countDocuments({ companyId: id }),
      Folder.countDocuments({ companyId: id }),
      Organization.countDocuments({ companyId: id })
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPasswords = await Password.countDocuments({
      companyId: id,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentUsers = await User.countDocuments({
      companyId: id,
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalPasswords,
      totalCollections,
      totalFolders,
      totalOrganizations,
      recentPasswords,
      recentUsers,
      passwordPerUser: totalUsers > 0 ? (totalPasswords / totalUsers).toFixed(1) : 0,
      activeUserRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};