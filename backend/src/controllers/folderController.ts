import { Response } from 'express';
import Folder from '../models/Folder';
import { AuthRequest } from '../middleware/auth';

export const getAllFolders = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const folders = await Folder.find({ companyId });
    res.json(folders);
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
    const { folderName, parentFolderId } = req.body;
    const { id, companyId } = req.user!;

    const folder = new Folder({
      companyId,
      folderName,
      parentFolderId,
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
