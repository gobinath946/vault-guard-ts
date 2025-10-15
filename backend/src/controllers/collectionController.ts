import { Response } from 'express';
import Collection from '../models/Collection';
import { AuthRequest } from '../middleware/auth';

export const getAllCollections = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const collections = await Collection.find({ companyId }).populate('passwords');
    res.json(collections);
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
    const { collectionName, description } = req.body;
    const { id, companyId } = req.user!;

    const collection = new Collection({
      companyId,
      collectionName,
      description,
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
