import { Response } from 'express';
import Organization from '../models/Organization';
import { AuthRequest } from '../middleware/auth';

export const getAllOrganizations = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const organizations = await Organization.find({ companyId });
    res.json(organizations);
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

export const deleteOrganization = async (req: AuthRequest, res: Response) => {
  try {
    const organization = await Organization.findByIdAndDelete(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.json({ message: 'Organization deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};