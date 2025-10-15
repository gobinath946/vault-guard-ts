import { Response } from 'express';
import Company from '../models/Company';
import User from '../models/User';
import Password from '../models/Password';
import { AuthRequest } from '../middleware/auth';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ isActive: true });
    const inactiveCompanies = await Company.countDocuments({ isActive: false });
    const totalUsers = await User.countDocuments();

    res.json({
      totalCompanies,
      activeCompanies,
      inactiveCompanies,
      totalUsers,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllCompanies = async (req: AuthRequest, res: Response) => {
  try {
    const companies = await Company.find().select('-password');
    res.json(companies);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCompany = async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    ).select('-password');

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(company);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCompany = async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Delete all associated data
    await User.deleteMany({ companyId: req.params.id });
    await Password.deleteMany({ companyId: req.params.id });

    res.json({ message: 'Company deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
