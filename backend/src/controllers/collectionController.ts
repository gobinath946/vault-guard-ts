import { Response } from 'express';
import mongoose from 'mongoose';
import Collection from '../models/Collection';
import Trash from '../models/Trash';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const getAllCollections = async (req: AuthRequest, res: Response) => {
  try {
    const { id, companyId, role } = req.user!;
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

    // Permission-based filtering for company_user - fetch from database
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
        cid._id ? new mongoose.Types.ObjectId(cid._id) : new mongoose.Types.ObjectId(cid)
      ).filter(Boolean);

      // If organizationId is provided, validate user has permission to that organization
      if (organizationId) {
        const orgIdStr = organizationId.toString();
        const hasOrgPermission = userOrgIds.some((pid: string) => pid === orgIdStr);
        if (!hasOrgPermission) {
          // User doesn't have permission to this organization - return empty result
          filter._id = { $in: [] };
        } else if (userColIds.length > 0) {
          // User has org permission - filter collections by both org and collection permissions
          // We need collections that: belong to this org AND user has permission to
          filter._id = { $in: userColIds };
          // The organizationId filter is already set above, so MongoDB will ensure both conditions
        } else {
          // User has org permission but no collection permissions - return empty
          filter._id = { $in: [] };
        }
      } else {
        // No organizationId filter - just use collection permissions
        if (userColIds.length > 0) {
          filter._id = { $in: userColIds };
        } else {
          // If no collection permissions, company_user should see no collections
          filter._id = { $in: [] };
        }
      }
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