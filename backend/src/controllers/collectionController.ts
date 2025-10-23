import { Response } from 'express';
import Collection from '../models/Collection';
import Trash from '../models/Trash';
import { AuthRequest } from '../middleware/auth';

export const getAllCollections = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, role, permissions } = req.user!;
    // Pagination and filtering
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');

    const q = (req.query.q as string) || '';
    const organizationId = req.query.organizationId as string;
    const skip = (page - 1) * limit;

    const filter: any = { companyId };
    if (q) {
      filter.collectionName = { $regex: q, $options: 'i' };
    }
    if (organizationId) {
      filter.organizationId = organizationId;
    }

    // Permission-based filtering for company_user
    if (role === 'company_user') {
      filter._id = { $in: permissions?.collections || [] };
    }

    const total = await Collection.countDocuments(filter);
    const collections = await Collection.find(filter).skip(skip).limit(limit).sort({ collectionName: 1 }).populate('passwords');

    res.json({ collections, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCollectionById = async (req: AuthRequest, res: Response) => {
  try {
    const collection = await Collection.findById(req.params.id).populate('passwords');
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }
    res.json(collection);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { collectionName, description, organizationId } = req.body;
    const { id, companyId } = req.user!;

    const collection = new Collection({
      companyId,
      collectionName,
      description,
      organizationId: organizationId || undefined,
      createdBy: id,
    });

    await collection.save();
    res.status(201).json(collection);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCollection = async (req: AuthRequest, res: Response) => {
  try {
    const collection = await Collection.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }
    res.json(collection);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const softDeleteCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { id: userId } = req.user!;
    const { companyId } = req.user!;

    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // Create trash record
    const trashRecord = new Trash({
      companyId,
      itemId: collection._id,
      itemType: 'collection',
      itemName: collection.collectionName,
      originalData: collection.toObject(),
      deletedBy: userId,
      deletedFrom: 'Collections',
    });

    await trashRecord.save();
    await Collection.findByIdAndDelete(req.params.id);

    res.json({ message: 'Collection moved to trash successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};