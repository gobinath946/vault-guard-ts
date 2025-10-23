import { Response } from 'express';
import Folder from '../models/Folder';
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
    const filter: any = { companyId };
    if (q) {
      filter.folderName = { $regex: q, $options: 'i' };
    }
    if (organizationId) {
      filter.organizationId = organizationId;
    }
    if (collectionId) {
      filter.collectionId = collectionId;
    }

    // Permission-based filtering for company_user
    if (role === 'company_user') {
      filter._id = { $in: permissions?.folders || [] };
    }

    const total = await Folder.countDocuments(filter);
    const folders = await Folder.find(filter).skip(skip).limit(limit).sort({ folderName: 1 });

    res.json({ folders, total, page, totalPages: Math.ceil(total / limit) });
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
    res.json(folder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { folderName, parentFolderId, organizationId, collectionId } = req.body;
    const { id, companyId } = req.user!;

    const folder = new Folder({
      companyId,
      folderName,
      parentFolderId,
      organizationId: organizationId || undefined,
      collectionId: collectionId || undefined,
      createdBy: id,
    });

    await folder.save();
    res.status(201).json(folder);
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
    res.json(folder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteFolder = async (req: AuthRequest, res: Response) => {
  try {
    const folder = await Folder.findByIdAndDelete(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    res.json({ message: 'Folder deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
