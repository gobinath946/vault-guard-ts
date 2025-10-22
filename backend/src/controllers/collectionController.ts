import { Response } from 'express';
import Collection from '../models/Collection';
import { AuthRequest } from '../middleware/auth';

export const getAllCollections = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
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

export const deleteCollection = async (req: AuthRequest, res: Response) => {
  try {
    const collection = await Collection.findByIdAndDelete(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }
    res.json({ message: 'Collection deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
