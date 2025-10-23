import { Response } from 'express';
import Trash from '../models/Trash';
import Collection from '../models/Collection';
import Folder from '../models/Folder';
import Organization from '../models/Organization';
import Password from '../models/Password';
import { AuthRequest } from '../middleware/auth';

export const getAllTrashItems = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;

    const filter: any = { 
      companyId, 
      isRestored: false 
    };

    const total = await Trash.countDocuments(filter);
    const trashItems = await Trash.find(filter)
      .populate('deletedBy', 'name email')
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      trashItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTrashItemById = async (req: AuthRequest, res: Response) => {
  try {
    const trashItem = await Trash.findById(req.params.id)
      .populate('deletedBy', 'name email')
      .populate('restoredBy', 'name email');

    if (!trashItem) {
      return res.status(404).json({ message: 'Trash item not found' });
    }

    res.json(trashItem);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const restoreTrashItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { id: userId, companyId } = req.user!;

    const trashItem = await Trash.findOne({ 
      _id: id, 
      companyId, 
      isRestored: false 
    });

    if (!trashItem) {
      return res.status(404).json({ message: 'Trash item not found or already restored' });
    }

    // Restore based on item type
    let restoredItem;
    switch (trashItem.itemType) {
      case 'collection':
        restoredItem = new Collection(trashItem.originalData);
        await restoredItem.save();
        break;

      case 'folder':
        restoredItem = new Folder(trashItem.originalData);
        await restoredItem.save();
        break;

      case 'organization':
        restoredItem = new Organization(trashItem.originalData);
        await restoredItem.save();
        break;

      case 'password':
        restoredItem = new Password(trashItem.originalData);
        await restoredItem.save();
        break;

      default:
        return res.status(400).json({ message: 'Invalid item type' });
    }

    // Update trash item as restored
    trashItem.isRestored = true;
    trashItem.restoredAt = new Date();
    trashItem.restoredBy = userId as any;
    await trashItem.save();

    res.json({
      message: 'Item restored successfully',
      restoredItem,
      trashItem,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const permanentDeleteTrashItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user!;

    const trashItem = await Trash.findOneAndDelete({ 
      _id: id, 
      companyId 
    });

    if (!trashItem) {
      return res.status(404).json({ message: 'Trash item not found' });
    }

    res.json({ message: 'Item permanently deleted from trash' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const emptyTrash = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.user!;

    const result = await Trash.deleteMany({ 
      companyId, 
      isRestored: false 
    });

    res.json({
      message: 'Trash emptied successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};