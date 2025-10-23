import { Response } from 'express';
import Organization from '../models/Organization';
import Trash from '../models/Trash';
import { AuthRequest } from '../middleware/auth';

export const getAllOrganizations = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, role, permissions } = req.user!;
    // Pagination and filtering
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const q = (req.query.q as string) || '';
    const skip = (page - 1) * limit;

    const filter: any = { companyId };
    if (role === 'company_user' && permissions?.organizations?.length) {
      filter._id = { $in: permissions.organizations };
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