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
    const users = await User.find({ companyId: id }).select('-password');
    res.json(users);
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
