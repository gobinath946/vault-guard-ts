import { Response } from 'express';
import mongoose from 'mongoose';
import Folder from '../models/Folder';
import Trash from '../models/Trash';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const getAllFolders = async (req: AuthRequest, res: Response) => {
  try {
    const { id, companyId, role } = req.user!;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const q = (req.query.q as string) || '';
    const skip = (page - 1) * limit;

    const organizationId = req.query.organizationId as string;
    const collectionId = req.query.collectionId as string;
    
    // Convert companyId to ObjectId if it's a string and defined
    if (!companyId) {
      return res.status(400).json({ message: 'companyId is required' });
    }
    let companyIdObj: mongoose.Types.ObjectId | string = companyId;
    if (typeof companyId === 'string' && mongoose.Types.ObjectId.isValid(companyId)) {
      companyIdObj = new mongoose.Types.ObjectId(companyId);
    }

    const filter: any = { companyId: companyIdObj };
    if (q) {
      filter.folderName = { $regex: q, $options: 'i' };
    }
    if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
      filter.organizationId = new mongoose.Types.ObjectId(organizationId);
    }
    if (collectionId && mongoose.Types.ObjectId.isValid(collectionId)) {
      filter.collectionId = new mongoose.Types.ObjectId(collectionId);
    }

    // Permission-based filtering for company_user - fetch from database
    // This MUST be applied to restrict folders to only those user has permission to
    if (role === 'company_user') {
      const user = await User.findById(id);
      if (!user || !user.isActive) {
        return res.status(403).json({ message: 'User account is inactive or not found' });
      }

      // Verify user belongs to the company from token
      if (!user.companyId || user.companyId.toString() !== companyId!.toString()) {
        return res.status(403).json({ message: 'User does not belong to the specified company' });
      }

      // Get permissions from database (NOT from JWT token)
      const userOrgIds = (user.permissions?.organizations || []).map((oid: any) => 
        oid._id ? oid._id.toString() : oid.toString()
      );
      const userColIds = (user.permissions?.collections || []).map((cid: any) => 
        cid._id ? cid._id.toString() : cid.toString()
      );
      const userFolderIds = (user.permissions?.folders || []).map((fid: any) => 
        fid._id ? new mongoose.Types.ObjectId(fid._id) : new mongoose.Types.ObjectId(fid)
      ).filter(Boolean);

      // If organizationId is provided, validate user has permission to that organization
      if (organizationId) {
        const orgIdStr = organizationId.toString();
        const hasOrgPermission = userOrgIds.some((pid: string) => pid === orgIdStr);
        if (!hasOrgPermission) {
          // User doesn't have permission to this organization - return empty result
          filter._id = { $in: [] };
        }
      }

      // If collectionId is provided, validate user has permission to that collection
      if (collectionId) {
        const colIdStr = collectionId.toString();
        const hasColPermission = userColIds.some((pid: string) => pid === colIdStr);
        if (!hasColPermission) {
          // User doesn't have permission to this collection - return empty result
          filter._id = { $in: [] };
        }
      }

      // Filter folders by user's folder permissions
      if (userFolderIds.length > 0) {
        // If we already set _id to empty (no org/col permission), keep it empty
        if (filter._id && filter._id.$in && filter._id.$in.length === 0) {
          // Already set to empty - keep it
        } else {
          // Restrict to permitted folderIds
          filter._id = { $in: userFolderIds };
        }
      } else {
        // If no folder permissions, company_user should see no folders
        filter._id = { $in: [] };
      }
    }

  const total = await Folder.countDocuments(filter);
  const folders = await Folder.find(filter).skip(skip).limit(limit).sort({ folderName: 1 });

    // Convert ObjectId fields to string for frontend compatibility
    const foldersSafe = folders.map(f => ({
      ...f.toObject(),
      companyId: f.companyId?.toString(),
      parentFolderId: f.parentFolderId?.toString(),
      organizationId: f.organizationId?.toString(),
      collectionId: f.collectionId?.toString(),
      createdBy: f.createdBy?.toString(),
      sharedWith: f.sharedWith?.map((id: any) => id?.toString()),
      _id: f._id?.toString(),
    }));

    res.json({ folders: foldersSafe, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getFolderById = async (req: AuthRequest, res: Response) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    // Convert ObjectId fields to string for frontend compatibility
    const folderSafe = {
      ...folder.toObject(),
      companyId: folder.companyId?.toString(),
      parentFolderId: folder.parentFolderId?.toString(),
      organizationId: folder.organizationId?.toString(),
      collectionId: folder.collectionId?.toString(),
      createdBy: folder.createdBy?.toString(),
      sharedWith: folder.sharedWith?.map((id: any) => id?.toString()),
      _id: folder._id?.toString(),
    };
    res.json(folderSafe);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { folderName, parentFolderId, organizationId, collectionId } = req.body;
    const { id, companyId } = req.user!;

    // Ensure companyId is always an ObjectId
    if (!companyId) {
      return res.status(400).json({ message: 'companyId is required' });
    }
    let companyIdObj: mongoose.Types.ObjectId | string = companyId;
    if (typeof companyId === 'string' && mongoose.Types.ObjectId.isValid(companyId)) {
      companyIdObj = new mongoose.Types.ObjectId(companyId);
    }

    const folder = new Folder({
      companyId: companyIdObj,
      folderName,
      parentFolderId,
      organizationId: organizationId || undefined,
      collectionId: collectionId || undefined,
      createdBy: id,
    });

    await folder.save();
    // Convert ObjectId fields to string for frontend compatibility
    const folderSafe = {
      ...folder.toObject(),
      companyId: folder.companyId?.toString(),
      parentFolderId: folder.parentFolderId?.toString(),
      organizationId: folder.organizationId?.toString(),
      collectionId: folder.collectionId?.toString(),
      createdBy: folder.createdBy?.toString(),
      sharedWith: folder.sharedWith?.map((id: any) => id?.toString()),
      _id: folder._id?.toString(),
    };
    res.status(201).json(folderSafe);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateFolder = async (req: AuthRequest, res: Response) => {
  try {
    const folder = await Folder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    // Convert ObjectId fields to string for frontend compatibility
    const folderSafe = {
      ...folder.toObject(),
      companyId: folder.companyId?.toString(),
      parentFolderId: folder.parentFolderId?.toString(),
      organizationId: folder.organizationId?.toString(),
      collectionId: folder.collectionId?.toString(),
      createdBy: folder.createdBy?.toString(),
      sharedWith: folder.sharedWith?.map((id: any) => id?.toString()),
      _id: folder._id?.toString(),
    };
    res.json(folderSafe);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const softDeleteFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { id: userId } = req.user!;
    const { companyId } = req.user!;

    // Ensure companyId is always an ObjectId
    if (!companyId) {
      return res.status(400).json({ message: 'companyId is required' });
    }
    let companyIdObj: mongoose.Types.ObjectId | string = companyId;
    if (typeof companyId === 'string' && mongoose.Types.ObjectId.isValid(companyId)) {
      companyIdObj = new mongoose.Types.ObjectId(companyId);
    }

    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Create trash record
    const trashRecord = new Trash({
      companyId: companyIdObj,
      itemId: folder._id,
      itemType: 'folder',
      itemName: folder.folderName,
      originalData: folder.toObject(),
      deletedBy: userId,
      deletedFrom: 'Folders',
    });

    await trashRecord.save();
    await Folder.findByIdAndDelete(req.params.id);

    res.json({ message: 'Folder moved to trash successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};