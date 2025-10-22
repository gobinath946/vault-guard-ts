import { Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Password from '../models/Password';
import { AuthRequest } from '../middleware/auth';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.user!;

    const totalUsers = await User.countDocuments({ companyId: id });
    const activeUsers = await User.countDocuments({ companyId: id, isActive: true });
    const inactiveUsers = await User.countDocuments({ companyId: id, isActive: false });
    const totalPasswords = await Password.countDocuments({ companyId: id });

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalPasswords,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.user!;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const q = (req.query.q as string) || '';

    const query: any = { companyId: id };
    if (q) {
      query.$or = [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({ users, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, username, password } = req.body;
    const { id } = req.user!;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Password is already hashed from frontend, hash again
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      companyId: id,
      email,
      username,
      password: hashedPassword,
      createdBy: id,
    });

    await user.save();

    res.status(201).json({
      ...user.toObject(),
      password: undefined,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePermissions = async (req: AuthRequest, res: Response) => {
  try {
    const { permissions } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { permissions },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
