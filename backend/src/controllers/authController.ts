import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Company from '../models/Company';
import User from '../models/User';
import MasterAdmin from '../models/MasterAdmin';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      email,
      contactName,
      phoneNumber,
      city,
      state,
      pinCode,
      country,
      password,
    } = req.body;

    // Check if company already exists
    const existingCompany = await Company.findOne({ email });
    if (existingCompany) {
      return res.status(400).json({ message: 'You have already registered' });
    }

    // Password is already hashed from frontend, hash again (double hashing)
    const hashedPassword = await bcrypt.hash(password, 12);

    const company = new Company({
      companyName,
      email,
      contactName,
      phoneNumber,
      city,
      state,
      pinCode,
      country,
      password: hashedPassword,
    });

    await company.save();

    res.status(201).json({
      message: 'Company registered successfully',
      companyId: company._id,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check all user types
    let user: any = await MasterAdmin.findOne({ email });
    let role = 'master_admin';

    if (!user) {
      user = await Company.findOne({ email });
      role = 'company_super_admin';
    }

    if (!user) {
      user = await User.findOne({ email }).populate('companyId');
      role = 'company_user';
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Password is already hashed from frontend, compare with stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active (for company users)
    if (role !== 'master_admin' && !user.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    // JWT payload - ONLY include id, email, role, and companyId (NO permissions)
    // Permissions are always fetched from database to ensure they're up-to-date
    const jwtPayload: any = {
      id: user._id,
      email: user.email,
      role,
      companyId: role === 'company_user' ? user.companyId._id : user._id,
    };
    const token = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role,
        companyId: role === 'company_user' ? user.companyId._id : user._id,
        permissions: role === 'company_user' ? user.permissions : undefined,
      },
    });
  } catch (error: any) {
    console.error('[LOGIN] Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const verifyToken = async (req: AuthRequest, res: Response) => {
  try {
    res.json({ user: req.user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
};
