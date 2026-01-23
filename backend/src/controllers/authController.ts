import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Company from '../models/Company';
import User from '../models/User';
import MasterAdmin from '../models/MasterAdmin';
import { AuthRequest } from '../middleware/auth';

import { logLoginActivity, getClientIP } from '../utils/auditLogger';
import crypto from 'crypto';

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
      isPrimaryAdmin: true,
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
      if (user) {
        role = user.role;
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Password is already hashed from frontend (SHA256), compare with stored hash (Bcrypt(SHA256))
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
      isPrimaryAdmin: user.isPrimaryAdmin || false,
    };
    const token = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Log login activity with IP and location
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    const userName = role === 'master_admin'
      ? user.email
      : role === 'company_super_admin'
        ? user.contactName || user.companyName
        : user.username || user.email;
    const companyId = role === 'company_user' ? user.companyId._id : user._id;

    // Log asynchronously without blocking the response
    logLoginActivity(
      user._id.toString(),
      user.email,
      userName,
      role,
      companyId.toString(),
      ipAddress,
      userAgent
    ).catch(err => console.error('Failed to log login activity:', err));

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: userName,
        role,
        companyId: role === 'company_user' ? user.companyId._id : user._id,
        permissions: role === 'company_user' ? user.permissions : undefined,
        isPrimaryAdmin: user.isPrimaryAdmin || false,
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

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    let user: any;

    // Update based on user role
    if (userRole === 'master_admin') {
      user = await MasterAdmin.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Master admin doesn't have a name field, so we skip this
      return res.status(400).json({ message: 'Master admin profile cannot be updated' });
    } else if (userRole === 'company_super_admin') {
      user = await Company.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Company not found' });
      }
      user.contactName = name;
    } else if (userRole === 'company_user') {
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      user.username = name;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: userRole === 'company_super_admin' ? user.contactName : user.username,
        role: userRole,
      },
    });
  } catch (error: any) {
    console.error('[UPDATE_PROFILE] Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    let user: any;

    // Find user based on role
    if (userRole === 'master_admin') {
      user = await MasterAdmin.findById(userId);
    } else if (userRole === 'company_super_admin') {
      user = await Company.findById(userId);
    } else if (userRole === 'company_user') {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('[UPDATE_PASSWORD] Error:', error);
    res.status(500).json({ message: error.message });
  }
};
