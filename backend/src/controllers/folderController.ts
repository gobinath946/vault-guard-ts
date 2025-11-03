import { Response } from 'express';
import mongoose from 'mongoose';
import Folder from '../models/Folder';
import Trash from '../models/Trash';
import { AuthRequest } from '../middleware/auth';

export const getAllFolders = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, role, permissions } = req.user!;
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

    // Permission-based filtering for company_user
    // This MUST be applied to restrict folders to only those user has permission to
    if (role === 'company_user') {
      console.log('[DEBUG] User role:', role);
      console.log('[DEBUG] permissions.folders:', permissions?.folders);
      // Only allow folders that are BOTH in the user's permissions AND match the selected collectionId
      if (permissions?.folders && Array.isArray(permissions.folders) && permissions.folders.length > 0) {
        const folderIds = permissions.folders
          .map((fid: any) => {
            if (typeof fid === 'string') {
              return mongoose.Types.ObjectId.isValid(fid) ? new mongoose.Types.ObjectId(fid) : null;
            }
            if (fid && typeof fid === 'object') {
              if (fid._id) {
                return mongoose.Types.ObjectId.isValid(fid._id) ? new mongoose.Types.ObjectId(fid._id) : null;
              }
              if (mongoose.Types.ObjectId.isValid(fid)) {
                return new mongoose.Types.ObjectId(fid);
              }
              return null;
            }
            return null;
          })
          .filter(Boolean);
        console.log('[DEBUG] Filtered folderIds:', folderIds);
        // Always restrict to permitted folderIds
        filter._id = { $in: folderIds };
      } else {
        // If no folder permissions, company_user should see no folders
        filter._id = { $in: [] };
      }
    }

  console.log('[DEBUG] Final folder query filter:', JSON.stringify(filter, null, 2));
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