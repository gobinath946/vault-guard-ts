import { Response } from 'express';
import mongoose from 'mongoose';
import Organization from '../models/Organization';
import Trash from '../models/Trash';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const getAllOrganizations = async (req: AuthRequest, res: Response) => {
  try {
    const { id, companyId, role } = req.user!;
    // Pagination and filtering
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const q = (req.query.q as string) || '';
    const skip = (page - 1) * limit;

    const filter: any = { companyId };
    
    // Filter by permissions for company_user role - fetch from database
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
        oid._id ? new mongoose.Types.ObjectId(oid._id) : new mongoose.Types.ObjectId(oid)
      ).filter(Boolean);

      if (userOrgIds.length > 0) {
        filter._id = { $in: userOrgIds };
      } else {
        // If no permissions, return empty result
        filter._id = { $in: [] };
      }
    }
    if (q) {
      filter.$or = [
        { organizationName: { $regex: q, $options: 'i' } },
        { organizationEmail: { $regex: q, $options: 'i' } },
      ];
    }

    const total = await Organization.countDocuments(filter);
    const organizations = await Organization.find(filter).skip(skip).limit(limit).sort({ organizationName: 1 });

    res.json({ organizations, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrganizationById = async (req: AuthRequest, res: Response) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.json(organization);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createOrganization = async (req: AuthRequest, res: Response) => {
  try {
    const { organizationName, organizationEmail } = req.body;
    const { id, companyId } = req.user!;

    const organization = new Organization({
      organizationName,
      organizationEmail,
      createdBy: id,
      companyId,
    });

    await organization.save();
    res.status(201).json(organization);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrganization = async (req: AuthRequest, res: Response) => {
  try {
    const { organizationName, organizationEmail } = req.body;
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      { organizationName, organizationEmail },
      { new: true, runValidators: true }
    );
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.json(organization);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const softDeleteOrganization = async (req: AuthRequest, res: Response) => {
  try {
    const { id: userId } = req.user!;
    const { companyId } = req.user!;

    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Create trash record
    const trashRecord = new Trash({
      companyId,
      itemId: organization._id,
      itemType: 'organization',
      itemName: organization.organizationName,
      originalData: organization.toObject(),
      deletedBy: userId,
      deletedFrom: 'Organizations',
    });

    await trashRecord.save();
    await Organization.findByIdAndDelete(req.params.id);

    res.json({ message: 'Organization moved to trash successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};