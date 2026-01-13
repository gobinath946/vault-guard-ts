import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import HardwareAsset from '../models/HardwareAsset';
import HardwareAllocation from '../models/HardwareAllocation';
import SoftwareAsset from '../models/SoftwareAsset';
import SoftwareAllocation from '../models/SoftwareAllocation';
import User from '../models/User';
import HardwareAssetLog from '../models/HardwareAssetLog';
import SoftwareAssetLog from '../models/SoftwareAssetLog';
import HardwareAllocationLog from '../models/HardwareAllocationLog';
import SoftwareAllocationLog from '../models/SoftwareAllocationLog';
import {
  logAssetCreate,
  logAssetUpdate,
  logAssetDelete,
  logAllocationCreate,
  logAllocationUpdate,
  logAllocationDelete,
  logAllocationReturn,
} from '../utils/assetLogger';
import Company from '../models/Company';

// Utility function to check and update software asset expiry status
const checkAndUpdateSoftwareAssetExpiry = async (asset: any) => {
  if (asset.endDate && (asset.status === 'ACTIVE' || asset.status === 'ASSIGNED')) {
    const endDate = new Date(asset.endDate);
    const currentDate = new Date();

    // Set time to start of day for accurate comparison
    endDate.setHours(23, 59, 59, 999); // End of the end date
    currentDate.setHours(0, 0, 0, 0);   // Start of current date

    if (currentDate > endDate) {
      // Update the asset status to EXPIRED
      await SoftwareAsset.findByIdAndUpdate(asset._id, {
        status: 'EXPIRED'
      });
      return { ...asset.toObject(), status: 'EXPIRED' };
    }
  }
  return asset;
};

// Utility function to bulk check and update expired software assets
const checkAndUpdateAllExpiredSoftware = async () => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Find all software assets that should be expired but aren't marked as such
    const expiredAssets = await SoftwareAsset.find({
      endDate: { $lt: currentDate },
      status: { $in: ['ACTIVE', 'ASSIGNED'] },
      isDeleted: false
    });

    if (expiredAssets.length > 0) {
      // Bulk update all expired assets
      await SoftwareAsset.updateMany(
        {
          endDate: { $lt: currentDate },
          status: { $in: ['ACTIVE', 'ASSIGNED'] },
          isDeleted: false
        },
        {
          status: 'EXPIRED'
        }
      );


    }
  } catch (error) {
    console.error('Error checking expired software assets:', error);
  }
};

// Utility function to bulk check and update expired software allocations
const checkAndUpdateAllExpiredAllocations = async () => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Find all software allocations that should be expired but aren't marked as such
    const expiredAllocations = await SoftwareAllocation.find({
      expiryDate: { $lt: currentDate },
      status: 'ACTIVE',
      isDeleted: false
    });

    if (expiredAllocations.length > 0) {
      // Bulk update all expired allocations
      await SoftwareAllocation.updateMany(
        {
          expiryDate: { $lt: currentDate },
          status: 'ACTIVE',
          isDeleted: false
        },
        {
          status: 'EXPIRED'
        }
      );


    }

    // Also expire allocations whose parent software is expired
    const allocationsWithExpiredSoftware = await SoftwareAllocation.find({
      status: 'ACTIVE',
      isDeleted: false
    }).populate({
      path: 'softwareAssetId',
      match: { status: 'EXPIRED' }
    });

    const expiredSoftwareAllocationIds = allocationsWithExpiredSoftware
      .filter(allocation => allocation.softwareAssetId && (allocation.softwareAssetId as any).status === 'EXPIRED')
      .map(allocation => allocation._id);

    if (expiredSoftwareAllocationIds.length > 0) {
      await SoftwareAllocation.updateMany(
        { _id: { $in: expiredSoftwareAllocationIds } },
        { status: 'EXPIRED' }
      );


    }
  } catch (error) {
    console.error('Error checking expired software allocations:', error);
  }
};

// Utility function to update allocation expiry dates when parent software end date changes
const updateAllocationExpiryDates = async (softwareAssetId: string, newEndDate: Date, companyId: string) => {
  try {
    // Find all allocations for this software
    const allocations = await SoftwareAllocation.find({
      softwareAssetId: softwareAssetId,
      isDeleted: false
    });

    if (allocations.length === 0) return { updated: 0, reactivated: 0 };

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const endDateForComparison = new Date(newEndDate);
    endDateForComparison.setHours(23, 59, 59, 999);

    let reactivatedCount = 0;

    // Prepare bulk operations
    const bulkOps = allocations.map(allocation => {
      const updateData: any = {
        expiryDate: newEndDate,
        updatedBy: companyId
      };

      // If allocation was expired and new date is in future, reactivate it
      if (allocation.status === 'EXPIRED' && endDateForComparison >= currentDate) {
        updateData.status = 'ACTIVE';
        reactivatedCount++;
      }

      return {
        updateOne: {
          filter: { _id: allocation._id },
          update: updateData
        }
      };
    });

    // Execute bulk update
    if (bulkOps.length > 0) {
      await SoftwareAllocation.bulkWrite(bulkOps);

    }

    return { updated: bulkOps.length, reactivated: reactivatedCount };
  } catch (error) {
    console.error('Error updating allocation expiry dates:', error);
    return { updated: 0, reactivated: 0 };
  }
};
const updateSoftwareAssetStatus = async (assetId: string, companyId: string) => {
  // Get the current asset
  const asset = await SoftwareAsset.findById(assetId);
  if (!asset) return;

  // Check if asset is expired first (this takes priority)
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  if (asset.endDate) {
    const endDate = new Date(asset.endDate);
    endDate.setHours(23, 59, 59, 999); // End of the end date

    if (currentDate > endDate) {
      // Asset is expired - update to EXPIRED status
      if (asset.status !== 'EXPIRED') {
        await SoftwareAsset.findByIdAndUpdate(assetId, {
          status: 'EXPIRED',
          updatedBy: companyId
        });
      }
      return; // Don't check allocations if expired
    }
  }

  // If not expired, check allocations to determine ACTIVE vs ASSIGNED
  const activeAllocations = await SoftwareAllocation.countDocuments({
    softwareAssetId: assetId,
    status: 'ACTIVE',
    isDeleted: false
  });

  // Update status based on allocations (only if not expired)
  const newStatus = activeAllocations > 0 ? 'ASSIGNED' : 'ACTIVE';

  if (asset.status !== newStatus && asset.status !== 'EXPIRED') {
    await SoftwareAsset.findByIdAndUpdate(assetId, {
      status: newStatus,
      updatedBy: companyId
    });
  }
};

// Dashboard Controller
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const companyId = id;

    // Get hardware statistics
    const totalHardware = await HardwareAsset.countDocuments({
      companyId,
      isDeleted: false
    });

    const availableHardware = await HardwareAsset.countDocuments({
      companyId,
      status: 'AVAILABLE',
      isDeleted: false
    });

    const assignedHardware = await HardwareAsset.countDocuments({
      companyId,
      status: 'ASSIGNED',
      isDeleted: false
    });

    // Get software statistics
    const totalSoftware = await SoftwareAsset.countDocuments({
      companyId,
      isDeleted: false
    });

    const totalSoftwareLicenses = await SoftwareAsset.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId), isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$totalLicenseCount' } } }
    ]);

    const availableSoftwareLicenses = await SoftwareAsset.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId), isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$availableLicenseCount' } } }
    ]);

    const assignedSoftwareLicenses = (totalSoftwareLicenses[0]?.total || 0) - (availableSoftwareLicenses[0]?.total || 0);

    res.json({
      hardware: {
        total: totalHardware,
        available: availableHardware,
        assigned: assignedHardware,
      },
      software: {
        total: totalSoftware,
        totalLicenses: totalSoftwareLicenses[0]?.total || 0,
        availableLicenses: availableSoftwareLicenses[0]?.total || 0,
        assignedLicenses: assignedSoftwareLicenses,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Hardware Asset Controllers
export const getHardwareAssets = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const companyId = id;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const q = (req.query.q as string) || '';
    const status = req.query.status as string;

    const query: any = { companyId, isDeleted: false };

    if (q) {
      query.$or = [
        { assetName: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { assetModel: { $regex: q, $options: 'i' } },
        { serialNumber: { $regex: q, $options: 'i' } },
      ];
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const total = await HardwareAsset.countDocuments(query);
    const assets = await HardwareAsset.find(query)
      .populate('createdBy', 'companyName')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get allocation details for each asset
    const assetsWithAllocations = await Promise.all(
      assets.map(async (asset) => {
        const allocation = await HardwareAllocation.findOne({
          hardwareAssetId: asset._id,
          status: 'ACTIVE',
          isDeleted: false
        }).populate('userId', 'username email');

        // Fix asset status if inconsistent
        let correctedAsset = asset.toObject();
        if (allocation && asset.status !== 'ASSIGNED') {
          // Asset has active allocation but status is not ASSIGNED
          await HardwareAsset.findByIdAndUpdate(asset._id, { status: 'ASSIGNED' });
          correctedAsset.status = 'ASSIGNED';
        } else if (!allocation && asset.status === 'ASSIGNED') {
          // Asset has no active allocation but status is ASSIGNED
          await HardwareAsset.findByIdAndUpdate(asset._id, { status: 'AVAILABLE' });
          correctedAsset.status = 'AVAILABLE';
        }

        return {
          ...correctedAsset,
          currentAllocation: allocation ? {
            _id: allocation._id,
            userId: allocation.userId,
            assignedDate: allocation.assignedDate,
            remarks: allocation.remarks
          } : null
        };
      })
    );

    res.json({
      assets: assetsWithAllocations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createHardwareAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { assetName, assetType, brand, assetModel, serialNumber, purchaseDate, remarks } = req.body;
    const companyId = id;

    // Serial number uniqueness check removed as per requirement

    const asset = new HardwareAsset({
      companyId,
      assetName,
      assetType,
      brand,
      assetModel,
      serialNumber: serialNumber || undefined, // Can now save empty/null/undefined without index issues
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      remarks,
      createdBy: companyId,
    });

    await asset.save();
    await asset.populate('createdBy', 'companyName');

    // Log asset creation
    await logAssetCreate('hardware', String(asset._id), assetName || 'Hardware Asset', req);

    res.status(201).json(asset);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateHardwareAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { assetId } = req.params;
    const { assetName, assetType, brand, assetModel, serialNumber, purchaseDate, remarks, status } = req.body;
    const companyId = id;

    // Check if asset exists and belongs to company
    const asset = await HardwareAsset.findOne({
      _id: assetId,
      companyId,
      isDeleted: false
    });

    if (!asset) {
      return res.status(404).json({ message: 'Hardware asset not found' });
    }

    // Serial number uniqueness check removed as per requirement

    // Validate status change
    if (status && status !== asset.status) {
      if (asset.status === 'ASSIGNED' && status === 'AVAILABLE') {
        // Check if there's an active allocation
        const activeAllocation = await HardwareAllocation.findOne({
          hardwareAssetId: assetId,
          status: 'ACTIVE',
          isDeleted: false
        });

        if (activeAllocation) {
          return res.status(400).json({
            message: 'Cannot change status to AVAILABLE while asset is assigned'
          });
        }
      }
    }

    const oldAsset = asset.toObject();

    // Build update object - only include fields that are provided
    const updateData: any = {
      updatedBy: companyId,
    };

    // Only update fields that are provided (not undefined)
    if (assetName !== undefined) updateData.assetName = assetName;
    if (assetType !== undefined) updateData.assetType = assetType;
    if (brand !== undefined) updateData.brand = brand;
    if (assetModel !== undefined) updateData.assetModel = assetModel;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber || undefined; // Can save empty/null/undefined
    if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate ? new Date(purchaseDate) : undefined;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (status !== undefined) updateData.status = status; // Always update status if provided

    const updatedAsset = await HardwareAsset.findByIdAndUpdate(
      assetId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'companyName');

    // Log update (including status changes)
    if (updatedAsset) {
      await logAssetUpdate(
        'hardware',
        assetId,
        oldAsset,
        updatedAsset.toObject(),
        asset.assetName || 'Hardware Asset',
        req
      );
    }

    // If hardware asset status is changed to RETURNED, automatically mark allocations as RETURNED
    if (status && (status === 'RETURNED' || status === 'AVAILABLE') && asset.status === 'ASSIGNED') {
      await HardwareAllocation.updateMany(
        {
          hardwareAssetId: assetId,
          status: 'ACTIVE',
          isDeleted: false
        },
        {
          status: 'RETURNED',
          returnedDate: new Date(),
          updatedBy: companyId
        }
      );


    }

    res.json(updatedAsset);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteHardwareAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { assetId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    const asset = await HardwareAsset.findOne({
      _id: assetId,
      companyId,
      isDeleted: false
    });

    if (!asset) {
      return res.status(404).json({ message: 'Hardware asset not found' });
    }

    // Check if asset is currently assigned
    const activeAllocation = await HardwareAllocation.findOne({
      hardwareAssetId: assetId,
      status: 'ACTIVE',
      isDeleted: false
    });

    if (activeAllocation) {
      return res.status(400).json({
        message: 'Cannot delete asset that is currently assigned'
      });
    }

    // Soft delete
    await HardwareAsset.findByIdAndUpdate(assetId, {
      isDeleted: true,
      status: 'DELETED',
      updatedBy: companyId,
    });

    // Log asset deletion
    await logAssetDelete('hardware', assetId, asset.toObject(), asset.assetName || 'Hardware Asset', req);

    res.json({ message: 'Hardware asset deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
// Hardware Allocation Controllers
export const getHardwareAllocations = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const companyId = id;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const q = (req.query.q as string) || '';

    const query: any = {
      companyId,
      isDeleted: false,
      status: 'ACTIVE' // Only show active allocations, hide returned/deleted ones
    };

    const total = await HardwareAllocation.countDocuments(query);
    const allocations = await HardwareAllocation.find(query)
      .populate('userId', 'username email')
      .populate('hardwareAssetId', 'assetName brand assetModel serialNumber')
      .populate('createdBy', 'companyName')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Filter by search query if provided
    let filteredAllocations = allocations;
    if (q) {
      filteredAllocations = allocations.filter((allocation: any) => {
        const user = allocation.userId;
        const asset = allocation.hardwareAssetId;
        return (
          user?.username?.toLowerCase().includes(q.toLowerCase()) ||
          user?.email?.toLowerCase().includes(q.toLowerCase()) ||
          asset?.assetName?.toLowerCase().includes(q.toLowerCase()) ||
          asset?.brand?.toLowerCase().includes(q.toLowerCase()) ||
          asset?.assetModel?.toLowerCase().includes(q.toLowerCase()) ||
          asset?.serialNumber?.toLowerCase().includes(q.toLowerCase())
        );
      });
    }

    res.json({
      allocations: filteredAllocations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createHardwareAllocation = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { userId, hardwareAssetId, remarks } = req.body;
    const companyId = id;

    // Validate user belongs to company
    const user = await User.findOne({ _id: userId, companyId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate hardware asset
    const asset = await HardwareAsset.findOne({
      _id: hardwareAssetId,
      companyId,
      isDeleted: false
    });
    if (!asset) {
      return res.status(404).json({ message: 'Hardware asset not found' });
    }

    // Check if asset is available
    if (asset.status !== 'AVAILABLE') {
      return res.status(400).json({ message: 'Hardware asset is not available for allocation' });
    }

    // Check if there's already an active allocation for this asset
    const existingAllocation = await HardwareAllocation.findOne({
      hardwareAssetId,
      status: 'ACTIVE',
      isDeleted: false
    });

    if (existingAllocation) {
      return res.status(400).json({ message: 'Hardware asset is already assigned' });
    }

    // Create allocation
    const allocation = new HardwareAllocation({
      companyId,
      userId,
      hardwareAssetId,
      remarks,
      createdBy: companyId,
    });

    await allocation.save();

    // Update asset status
    await HardwareAsset.findByIdAndUpdate(hardwareAssetId, {
      status: 'ASSIGNED',
      updatedBy: companyId,
    });

    // Populate and return
    await allocation.populate([
      { path: 'userId', select: 'username email' },
      { path: 'hardwareAssetId', select: 'assetName brand assetModel serialNumber' },
      { path: 'createdBy', select: 'companyName' }
    ]);

    // Log allocation creation
    const populatedAllocation = await HardwareAllocation.findById(allocation._id)
      .populate('userId', 'username email')
      .populate('hardwareAssetId', 'assetName');

    // Extract hardwareAssetId - use the ObjectId directly from allocation, not from populated object
    const hardwareAssetIdForLog = allocation.hardwareAssetId || (populatedAllocation?.hardwareAssetId as any)?._id || populatedAllocation?.hardwareAssetId;

    await logAllocationCreate('hardware', String(allocation._id), {
      userId: String(allocation.userId),
      userName: (populatedAllocation?.userId as any)?.username || 'Unknown',
      userEmail: (populatedAllocation?.userId as any)?.email || '',
      hardwareAssetId: hardwareAssetIdForLog, // Pass ObjectId directly, not as string
      assetName: (populatedAllocation?.hardwareAssetId as any)?.assetName || 'Unknown Asset',
      allocatedDate: allocation.assignedDate,
      remarks: allocation.remarks,
    }, req);

    res.status(201).json(allocation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createHardwareAllocationBulk = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { userId, hardwareAssetIds, remarks } = req.body;
    const companyId = id;

    // Validate input
    if (!hardwareAssetIds || !Array.isArray(hardwareAssetIds) || hardwareAssetIds.length === 0) {
      return res.status(400).json({ message: 'Hardware asset IDs array is required' });
    }

    // Validate user belongs to company
    const user = await User.findOne({ _id: userId, companyId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate all hardware assets
    const assets = await HardwareAsset.find({
      _id: { $in: hardwareAssetIds },
      companyId,
      isDeleted: false
    });

    if (assets.length !== hardwareAssetIds.length) {
      return res.status(404).json({ message: 'One or more hardware assets not found' });
    }

    // Check if all assets are available
    const unavailableAssets = assets.filter(asset => asset.status !== 'AVAILABLE');
    if (unavailableAssets.length > 0) {
      return res.status(400).json({
        message: `Some hardware assets are not available for allocation: ${unavailableAssets.map(a => a.assetName).join(', ')}`
      });
    }

    // Check for existing allocations
    const existingAllocations = await HardwareAllocation.find({
      hardwareAssetId: { $in: hardwareAssetIds },
      status: 'ACTIVE',
      isDeleted: false
    });

    if (existingAllocations.length > 0) {
      return res.status(400).json({ message: 'One or more hardware assets are already assigned' });
    }

    // Generate a unique event ID for this bulk allocation
    const allocationEventId = new mongoose.Types.ObjectId().toString();
    const allocations = [];

    // Create allocations for all assets
    for (const assetId of hardwareAssetIds) {
      const allocation = new HardwareAllocation({
        companyId,
        userId,
        hardwareAssetId: assetId,
        remarks,
        createdBy: companyId,
        // Note: allocationEventId would be added here if we modify the schema
      });

      await allocation.save();
      allocations.push(allocation);

      // Update asset status
      await HardwareAsset.findByIdAndUpdate(assetId, {
        status: 'ASSIGNED',
        updatedBy: companyId,
      });
    }

    // Populate all allocations
    const populatedAllocations = await HardwareAllocation.find({
      _id: { $in: allocations.map(a => a._id) }
    }).populate([
      { path: 'userId', select: 'username email' },
      { path: 'hardwareAssetId', select: 'assetName brand assetModel serialNumber' },
      { path: 'createdBy', select: 'companyName' }
    ]);

    // Log bulk allocation creation with event-based logging
    for (const allocation of populatedAllocations) {
      // Extract hardwareAssetId - handle populated object
      const hardwareAssetIdForLog = (allocation.hardwareAssetId as any)?._id || allocation.hardwareAssetId;

      await logAllocationCreate('hardware', String(allocation._id), {
        userId: String(allocation.userId),
        userName: (allocation.userId as any)?.username || 'Unknown',
        userEmail: (allocation.userId as any)?.email || '',
        hardwareAssetId: hardwareAssetIdForLog, // Pass ObjectId directly, not as string
        assetName: (allocation.hardwareAssetId as any)?.assetName || 'Unknown Asset',
        allocatedDate: allocation.assignedDate,
        remarks: allocation.remarks,
        // Add event context for bulk operations
        eventId: allocationEventId,
        eventType: 'bulk_allocation',
        eventAssetCount: hardwareAssetIds.length,
      }, req);
    }

    res.status(201).json({
      message: `Successfully allocated ${hardwareAssetIds.length} hardware assets`,
      allocations: populatedAllocations,
      eventId: allocationEventId,
      assetCount: hardwareAssetIds.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateHardwareAllocation = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { allocationId } = req.params;
    const { userId, hardwareAssetId, remarks } = req.body;
    const companyId = id;

    // Get old allocation with populated fields BEFORE update
    const oldAllocation = await HardwareAllocation.findOne({
      _id: allocationId,
      companyId,
      isDeleted: false
    })
      .populate('userId', 'username email')
      .populate('hardwareAssetId', 'assetName brand assetModel serialNumber')
      .lean();

    if (!oldAllocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    // Validate new user if changed
    if (userId && userId !== oldAllocation.userId.toString()) {
      const user = await User.findOne({ _id: userId, companyId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    }

    // Handle hardware asset change - only if it's actually different
    const oldHardwareAssetIdStr = oldAllocation.hardwareAssetId?._id?.toString() || oldAllocation.hardwareAssetId?.toString();
    const newHardwareAssetIdStr = hardwareAssetId?.toString();

    if (hardwareAssetId && newHardwareAssetIdStr && newHardwareAssetIdStr !== oldHardwareAssetIdStr) {
      // Validate new hardware asset
      const newAsset = await HardwareAsset.findOne({
        _id: hardwareAssetId,
        companyId,
        isDeleted: false
      });
      if (!newAsset) {
        return res.status(404).json({ message: 'Hardware asset not found' });
      }

      // Check if new asset is available (unless it's the same asset)
      if (newAsset.status !== 'AVAILABLE') {
        return res.status(400).json({ message: 'Hardware asset is not available for allocation' });
      }

      // Check if there's already an active allocation for the new asset
      const existingAllocation = await HardwareAllocation.findOne({
        hardwareAssetId: hardwareAssetId,
        status: 'ACTIVE',
        isDeleted: false,
        _id: { $ne: allocationId } // Exclude current allocation
      });

      if (existingAllocation) {
        return res.status(400).json({ message: 'Hardware asset is already assigned to another user' });
      }

      // Update old asset status back to available - extract ObjectId from populated object
      const oldAssetId = oldAllocation.hardwareAssetId?._id || oldAllocation.hardwareAssetId;
      await HardwareAsset.findByIdAndUpdate(oldAssetId, {
        status: 'AVAILABLE',
        updatedBy: companyId,
      });

      // Update new asset status to assigned
      await HardwareAsset.findByIdAndUpdate(hardwareAssetId, {
        status: 'ASSIGNED',
        updatedBy: companyId,
      });
    }

    // Update allocation - extract ObjectId from populated objects if needed
    const userIdToUpdate = userId || oldAllocation.userId?._id || oldAllocation.userId;
    const hardwareAssetIdToUpdate = hardwareAssetId || oldAllocation.hardwareAssetId?._id || oldAllocation.hardwareAssetId;

    const updatedAllocation = await HardwareAllocation.findByIdAndUpdate(
      allocationId,
      {
        userId: userIdToUpdate,
        hardwareAssetId: hardwareAssetIdToUpdate,
        remarks: remarks !== undefined ? remarks : oldAllocation.remarks,
        updatedBy: companyId,
      },
      { new: true, runValidators: true }
    )
      .populate('userId', 'username email')
      .populate('hardwareAssetId', 'assetName brand assetModel serialNumber')
      .populate('createdBy', 'companyName')
      .lean();

    // Log allocation update with populated data
    if (updatedAllocation) {
      await logAllocationUpdate('hardware', allocationId, oldAllocation, updatedAllocation, req);
    }

    res.json(updatedAllocation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteHardwareAllocation = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { allocationId } = req.params;
    const companyId = id;

    const allocation = await HardwareAllocation.findOne({
      _id: allocationId,
      companyId,
      isDeleted: false
    });

    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    // Update allocation status
    await HardwareAllocation.findByIdAndUpdate(allocationId, {
      status: 'RETURNED',
      returnedDate: new Date(),
      isDeleted: true,
      updatedBy: companyId,
    });

    // Update asset status back to available
    const assetUpdateResult = await HardwareAsset.findByIdAndUpdate(allocation.hardwareAssetId, {
      status: 'AVAILABLE',
      updatedBy: companyId,
    }, { new: true });

    // Log allocation return
    await logAllocationReturn('hardware', allocationId, allocation.toObject(), req);

    res.json({ message: 'Hardware allocation deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Software Asset Controllers
export const getSoftwareAssets = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    // Check and update expired software assets first
    await checkAndUpdateAllExpiredSoftware();

    const companyId = id;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const q = (req.query.q as string) || '';
    const status = req.query.status as string;

    const query: any = {
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false
    };

    if (q) {
      query.$or = [
        { softwareName: { $regex: q, $options: 'i' } },
        { vendor: { $regex: q, $options: 'i' } },
      ];
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const total = await SoftwareAsset.countDocuments(query);
    const assets = await SoftwareAsset.find(query)
      .populate('createdBy', 'companyName')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Check and update expiry status for each asset
    const assetsWithExpiryCheck = await Promise.all(
      assets.map(async (asset) => {
        return await checkAndUpdateSoftwareAssetExpiry(asset);
      })
    );

    res.json({
      assets: assetsWithExpiryCheck,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSoftwareAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { assetId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    const asset = await SoftwareAsset.findOne({
      _id: assetId,
      companyId,
      isDeleted: false
    })
      .populate('createdBy', 'companyName');

    if (!asset) {
      return res.status(404).json({ message: 'Software asset not found' });
    }

    // Check and update expiry status
    const assetWithExpiryCheck = await checkAndUpdateSoftwareAssetExpiry(asset);

    res.json(assetWithExpiryCheck);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSoftwareAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { softwareName, vendor, customFields, totalLicenseCount, startDate, endDate } = req.body;
    const companyId = id;

    const asset = new SoftwareAsset({
      companyId,
      softwareName: softwareName || '',
      vendor: vendor || '',
      customFields: customFields || {},
      totalLicenseCount: totalLicenseCount || 0,
      availableLicenseCount: totalLicenseCount || 0,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy: companyId,
    });

    await asset.save();
    await asset.populate('createdBy', 'companyName');

    // Log asset creation
    await logAssetCreate('software', String(asset._id), softwareName || 'Software Asset', req);

    res.status(201).json(asset);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSoftwareAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { assetId } = req.params;
    const { softwareName, vendor, customFields, totalLicenseCount, startDate, endDate, status } = req.body;
    const companyId = id;

    const asset = await SoftwareAsset.findOne({
      _id: assetId,
      companyId,
      isDeleted: false
    });

    if (!asset) {
      return res.status(404).json({ message: 'Software asset not found' });
    }

    // Calculate new available count if total changed
    let newAvailableCount = asset.availableLicenseCount || 0;
    if (totalLicenseCount !== undefined && totalLicenseCount !== (asset.totalLicenseCount || 0)) {
      const assignedCount = (asset.totalLicenseCount || 0) - (asset.availableLicenseCount || 0);
      newAvailableCount = totalLicenseCount - assignedCount;

      if (newAvailableCount < 0) {
        return res.status(400).json({
          message: 'Cannot reduce total licenses below currently assigned count'
        });
      }
    }

    const oldAsset = asset.toObject();
    const updateData: any = {
      softwareName: softwareName !== undefined ? softwareName : asset.softwareName,
      vendor: vendor !== undefined ? vendor : asset.vendor,
      customFields: customFields !== undefined ? customFields : asset.customFields,
      totalLicenseCount: totalLicenseCount !== undefined ? totalLicenseCount : asset.totalLicenseCount,
      availableLicenseCount: newAvailableCount,
      startDate: startDate ? new Date(startDate) : asset.startDate,
      endDate: endDate ? new Date(endDate) : asset.endDate,
      status,
      updatedBy: companyId,
    };

    // Check if end date was updated and software should be reactivated
    let shouldUpdateAllocations = false;
    if (endDate && asset.status === 'EXPIRED') {
      const newEndDate = new Date(endDate);
      const currentDate = new Date();
      newEndDate.setHours(23, 59, 59, 999);
      currentDate.setHours(0, 0, 0, 0);

      // If new end date is in the future, reactivate the software
      if (newEndDate >= currentDate) {
        // Check if software has active allocations to determine status
        const activeAllocations = await SoftwareAllocation.countDocuments({
          softwareAssetId: assetId,
          status: 'ACTIVE',
          isDeleted: false
        });

        // Set status based on allocations
        updateData.status = activeAllocations > 0 ? 'ASSIGNED' : 'ACTIVE';
        shouldUpdateAllocations = true;
      }
    }

    // Check if end date was updated (regardless of current status)
    if (endDate && endDate !== asset.endDate?.toISOString().split('T')[0]) {
      shouldUpdateAllocations = true;
    }

    const updatedAsset = await SoftwareAsset.findByIdAndUpdate(
      assetId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'companyName');

    // Update allocation expiry dates if software end date was changed
    if (shouldUpdateAllocations && endDate) {
      const newEndDate = new Date(endDate);
      const updateResult = await updateAllocationExpiryDates(assetId, newEndDate, companyId);

      // Update software asset status based on potentially reactivated allocations
      await updateSoftwareAssetStatus(assetId, companyId);
    }

    // Log update (including status changes)
    if (updatedAsset) {
      await logAssetUpdate(
        'software',
        assetId,
        oldAsset,
        updatedAsset.toObject(),
        asset.softwareName || 'Software Asset',
        req
      );
    }

    res.json(updatedAsset);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSoftwareAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { assetId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    const asset = await SoftwareAsset.findOne({
      _id: assetId,
      companyId,
      isDeleted: false
    });

    if (!asset) {
      return res.status(404).json({ message: 'Software asset not found' });
    }

    // Check if there are active allocations
    const activeAllocations = await SoftwareAllocation.countDocuments({
      softwareAssetId: assetId,
      status: 'ACTIVE',
      isDeleted: false
    });

    if (activeAllocations > 0) {
      return res.status(400).json({
        message: 'Cannot delete software asset with active allocations'
      });
    }

    // Soft delete
    await SoftwareAsset.findByIdAndUpdate(assetId, {
      isDeleted: true,
      status: 'DELETED',
      updatedBy: companyId,
    });

    // Log asset deletion
    await logAssetDelete('software', assetId, asset.toObject(), asset.softwareName || 'Software Asset', req);

    res.json({ message: 'Software asset deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Software Allocation Controllers
export const getSoftwareAllocations = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    // Check and update expired software allocations first
    await checkAndUpdateAllExpiredAllocations();

    const companyId = id;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const q = (req.query.q as string) || '';

    const query: any = {
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false
    };

    const total = await SoftwareAllocation.countDocuments(query);
    const allocations = await SoftwareAllocation.find(query)
      .select('-credentials') // Don't return credentials in list
      .populate('userId', 'username email')
      .populate('softwareAssetId', '_id softwareName vendor totalLicenseCount')
      .populate('createdBy', 'companyName')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Filter by search query if provided
    let filteredAllocations = allocations;
    if (q) {
      filteredAllocations = allocations.filter((allocation: any) => {
        const user = allocation.userId;
        const asset = allocation.softwareAssetId;
        return (
          user?.username?.toLowerCase().includes(q.toLowerCase()) ||
          user?.email?.toLowerCase().includes(q.toLowerCase()) ||
          asset?.softwareName?.toLowerCase().includes(q.toLowerCase()) ||
          asset?.vendor?.toLowerCase().includes(q.toLowerCase())
        );
      });
    }

    res.json({
      allocations: filteredAllocations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSoftwareAllocation = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { userId, softwareAssetId, licenseCount, expiryDate, remarks, credentials, customFields } = req.body;
    const companyId = id;

    // Validate user belongs to company
    const user = await User.findOne({ _id: userId, companyId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate software asset
    const asset = await SoftwareAsset.findOne({
      _id: softwareAssetId,
      companyId,
      isDeleted: false
    });
    if (!asset) {
      return res.status(404).json({ message: 'Software asset not found' });
    }

    // Check if user already has an active allocation for this software
    const existingAllocation = await SoftwareAllocation.findOne({
      userId,
      softwareAssetId,
      companyId,
      isDeleted: { $ne: true }
    });

    if (existingAllocation) {
      return res.status(400).json({
        message: 'User already has an active allocation for this software. Please edit the existing allocation instead.'
      });
    }

    // Check if enough licenses are available
    const availableLicenses = asset.availableLicenseCount || 0;
    if (licenseCount > availableLicenses) {
      return res.status(400).json({
        message: `Only ${availableLicenses} licenses available`
      });
    }

    // Create allocation
    const allocation = new SoftwareAllocation({
      companyId,
      userId,
      softwareAssetId,
      licenseCount,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      remarks,
      createdBy: companyId,
    });

    // Encrypt custom fields (software configuration) if provided and has at least one non-empty value
    if (customFields && Object.keys(customFields).length > 0) {
      // Filter out empty values before encrypting
      const filteredCustomFields: any = {};
      Object.entries(customFields).forEach(([key, value]) => {
        if (key && key.trim() && value && String(value).trim()) {
          filteredCustomFields[key.trim()] = String(value).trim();
        }
      });

      if (Object.keys(filteredCustomFields).length > 0) {
        allocation.encryptCredentials(JSON.stringify(filteredCustomFields));
      }
    }

    await allocation.save();

    // Store original ObjectIds before population (they should be ObjectIds at this point)
    const userIdForLog = allocation.userId;
    const softwareAssetIdForLog = allocation.softwareAssetId;

    // Update available license count and status
    const currentAvailable = asset.availableLicenseCount ?? 0;
    const licenseCountValue = licenseCount ?? 0;
    const newAvailableCount = currentAvailable - licenseCountValue;
    await SoftwareAsset.findByIdAndUpdate(softwareAssetId, {
      availableLicenseCount: newAvailableCount,
      updatedBy: companyId,
    });

    // Update software asset status based on allocations
    await updateSoftwareAssetStatus(softwareAssetId, companyId);

    // Populate and return (without credentials)
    await allocation.populate([
      { path: 'userId', select: 'username email' },
      { path: 'softwareAssetId', select: '_id softwareName vendor totalLicenseCount' },
      { path: 'createdBy', select: 'companyName' }
    ]);

    // Log allocation creation
    const allocationId = String(allocation._id);
    const populatedAllocation = await SoftwareAllocation.findById(allocationId)
      .populate('userId', 'username email')
      .populate('softwareAssetId', 'softwareName');

    await logAllocationCreate('software', allocationId, {
      userId: userIdForLog,
      userName: (populatedAllocation?.userId as any)?.username || 'Unknown',
      userEmail: (populatedAllocation?.userId as any)?.email || '',
      softwareAssetId: softwareAssetIdForLog,
      assetName: (populatedAllocation?.softwareAssetId as any)?.softwareName || 'Unknown Asset',
      allocatedDate: allocation.assignedDate,
      expiryDate: allocation.expiryDate,
      licenseCount: allocation.licenseCount,
      remarks: allocation.remarks,
    }, req);

    // Return without credentials
    const response = allocation.toObject();
    const { credentials: _, ...responseWithoutCredentials } = response;
    res.status(201).json(responseWithoutCredentials);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSoftwareAllocation = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { allocationId } = req.params;
    const { userId, softwareAssetId, licenseCount, expiryDate, remarks, credentials, customFields } = req.body;
    const companyId = id;

    // Get old allocation with populated fields BEFORE update
    const oldAllocation = await SoftwareAllocation.findOne({
      _id: allocationId,
      companyId,
      isDeleted: false
    })
      .populate('userId', 'username email')
      .populate('softwareAssetId', 'softwareName vendor totalLicenseCount')
      .lean();

    if (!oldAllocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    // Validate new user if changed
    if (userId && userId !== oldAllocation.userId.toString()) {
      const user = await User.findOne({ _id: userId, companyId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    }

    // Handle software asset change
    let newSoftwareAsset = null;
    const oldSoftwareAssetId = (oldAllocation.softwareAssetId as any)?._id || oldAllocation.softwareAssetId;
    if (softwareAssetId && softwareAssetId !== oldSoftwareAssetId.toString()) {
      newSoftwareAsset = await SoftwareAsset.findOne({
        _id: softwareAssetId,
        companyId,
        isDeleted: false
      });

      if (!newSoftwareAsset) {
        return res.status(404).json({ message: 'Software asset not found' });
      }

      // Check if new asset has enough licenses
      const newAvailableLicenses = newSoftwareAsset.availableLicenseCount || 0;
      if (licenseCount > newAvailableLicenses) {
        return res.status(400).json({
          message: `Only ${newAvailableLicenses} licenses available for the selected software`
        });
      }

      // Return licenses to old asset - fetch current value from database
      const oldAssetId = (oldAllocation.softwareAssetId as any)?._id || oldAllocation.softwareAssetId;
      const oldAssetCurrent = await SoftwareAsset.findById(oldAssetId).select('availableLicenseCount').lean();
      const oldAvailableCount = oldAssetCurrent?.availableLicenseCount ?? 0;
      const oldLicenseCount = oldAllocation.licenseCount ?? 0;
      await SoftwareAsset.findByIdAndUpdate(oldAssetId, {
        availableLicenseCount: oldAvailableCount + oldLicenseCount,
        updatedBy: companyId,
      });

      // Take licenses from new asset
      const currentNewAvailable = newSoftwareAsset.availableLicenseCount ?? 0;
      const newLicenseCount = licenseCount ?? 0;
      await SoftwareAsset.findByIdAndUpdate(newSoftwareAsset._id, {
        availableLicenseCount: currentNewAvailable - newLicenseCount,
        updatedBy: companyId,
      });

      // Update status for both old and new assets
      await updateSoftwareAssetStatus(oldAssetId.toString(), companyId);
      await updateSoftwareAssetStatus((newSoftwareAsset as any)._id.toString(), companyId);
    } else {
      // Handle license count change for same asset
      if (licenseCount !== undefined && licenseCount !== oldAllocation.licenseCount) {
        const asset = oldAllocation.softwareAssetId as any;
        const currentAvailable = asset.availableLicenseCount ?? 0;
        const oldLicenseCount = oldAllocation.licenseCount ?? 0;
        const newLicenseCount = licenseCount ?? 0;
        const licenseDiff = newLicenseCount - oldLicenseCount;

        if (licenseDiff > 0 && licenseDiff > currentAvailable) {
          return res.status(400).json({
            message: `Only ${currentAvailable} additional licenses available`
          });
        }

        // Update asset's available count
        await SoftwareAsset.findByIdAndUpdate(asset._id, {
          availableLicenseCount: currentAvailable - licenseDiff,
          updatedBy: companyId,
        });

        // Update software asset status based on allocations
        await updateSoftwareAssetStatus(asset._id.toString(), companyId);
      }
    }

    // Check if allocation should be reactivated when expiry date is extended
    const updateData: any = {
      userId: userId || oldAllocation.userId,
      softwareAssetId: softwareAssetId || oldSoftwareAssetId,
      licenseCount: licenseCount || oldAllocation.licenseCount,
      expiryDate: expiryDate ? new Date(expiryDate) : oldAllocation.expiryDate,
      remarks: remarks !== undefined ? remarks : oldAllocation.remarks,
      updatedBy: companyId,
    };

    // Update custom fields (software configuration) if provided and has at least one non-empty value
    if (customFields && Object.keys(customFields).length > 0) {
      // Filter out empty values before encrypting
      const filteredCustomFields: any = {};
      Object.entries(customFields).forEach(([key, value]) => {
        if (key && key.trim() && value && String(value).trim()) {
          filteredCustomFields[key.trim()] = String(value).trim();
        }
      });

      if (Object.keys(filteredCustomFields).length > 0) {
        // Create a temporary allocation instance to encrypt custom fields
        const tempAllocation = new SoftwareAllocation();
        tempAllocation.encryptCredentials(JSON.stringify(filteredCustomFields));
        updateData.credentials = tempAllocation.credentials;
      }
    }

    // Check if expiry date was updated and allocation should be reactivated
    if (expiryDate && oldAllocation.status === 'EXPIRED') {
      const newExpiryDate = new Date(expiryDate);
      const currentDate = new Date();
      newExpiryDate.setHours(23, 59, 59, 999);
      currentDate.setHours(0, 0, 0, 0);

      // If new expiry date is in the future, reactivate the allocation
      if (newExpiryDate >= currentDate) {
        // Also check if parent software is not expired
        const parentSoftware = await SoftwareAsset.findById(oldSoftwareAssetId);
        if (parentSoftware && parentSoftware.status !== 'EXPIRED') {
          updateData.status = 'ACTIVE';
        }
      }
    }

    // Update allocation
    const updatedAllocation = await SoftwareAllocation.findByIdAndUpdate(
      allocationId,
      updateData,
      { new: true, runValidators: true }
    )
      .select('-credentials')
      .populate('userId', 'username email')
      .populate('softwareAssetId', '_id softwareName vendor totalLicenseCount')
      .populate('createdBy', 'companyName')
      .lean();

    // Update parent software asset status if allocation was reactivated
    if (updateData.status === 'ACTIVE') {
      await updateSoftwareAssetStatus(oldSoftwareAssetId.toString(), companyId);
    }

    // Log allocation update with populated data
    // Need to include credentials in newAllocation for comparison, but exclude from response
    if (updatedAllocation) {
      // Fetch the updated allocation with credentials for logging comparison
      const updatedAllocationWithCreds = await SoftwareAllocation.findById(allocationId)
        .populate('userId', 'username email')
        .populate('softwareAssetId', '_id softwareName vendor totalLicenseCount')
        .lean();

      await logAllocationUpdate('software', allocationId, oldAllocation, updatedAllocationWithCreds || updatedAllocation, req);
    }

    res.json(updatedAllocation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSoftwareAllocationCredentials = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { allocationId } = req.params;
    const companyId = id;

    const allocation = await SoftwareAllocation.findOne({
      _id: allocationId,
      companyId,
      isDeleted: false
    });

    if (!allocation) {
      return res.status(404).json({ message: 'Software allocation not found' });
    }

    // Decrypt and return custom fields (software configuration)
    let decryptedCustomFields = {};
    if (allocation.credentials && allocation.credentials.encryptedData && allocation.credentials.iv) {
      try {
        const decrypted = allocation.decryptCredentials();
        decryptedCustomFields = JSON.parse(decrypted);
      } catch (error) {
        console.error('Error decrypting custom fields:', error);
        return res.status(500).json({ message: 'Failed to decrypt custom fields' });
      }
    }

    res.json({
      customFields: decryptedCustomFields
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSoftwareAllocation = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { allocationId } = req.params;
    const companyId = id;

    const allocation = await SoftwareAllocation.findOne({
      _id: allocationId,
      companyId,
      isDeleted: false
    }).populate('softwareAssetId');

    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    // Update allocation status
    await SoftwareAllocation.findByIdAndUpdate(allocationId, {
      status: 'DELETED',
      isDeleted: true,
      updatedBy: companyId,
    });

    // Restore licenses to asset
    const asset = allocation.softwareAssetId as any;
    const currentAvailable = asset.availableLicenseCount ?? 0;
    const allocationLicenseCount = allocation.licenseCount ?? 0;
    await SoftwareAsset.findByIdAndUpdate(asset._id, {
      availableLicenseCount: currentAvailable + allocationLicenseCount,
      updatedBy: companyId,
    });

    // Update software asset status based on remaining allocations
    await updateSoftwareAssetStatus(asset._id.toString(), companyId);

    // Log allocation return/revoke
    await logAllocationReturn('software', allocationId, allocation.toObject(), req);

    res.json({ message: 'Software allocation deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Asset Checker Controller
export const getAssetChecker = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { userId } = req.params;
    const companyId = id;



    // Validate user belongs to company
    const user = await User.findOne({ _id: userId, companyId });
    if (!user) {

      return res.status(404).json({ message: 'User not found' });
    }



    // Get hardware allocations
    const hardwareAllocations = await HardwareAllocation.find({
      companyId,
      userId,
      status: 'ACTIVE',
      isDeleted: false
    })
      .populate('hardwareAssetId', 'assetName brand assetModel serialNumber')
      .populate('userId', 'username email');



    // Get software allocations
    const softwareAllocations = await SoftwareAllocation.find({
      companyId,
      userId,
      status: 'ACTIVE',
      isDeleted: false
    })
      .populate('softwareAssetId', '_id softwareName vendor totalLicenseCount')
      .populate('userId', 'username email');



    const responseData = {
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      },
      hardware: hardwareAllocations,
      software: softwareAllocations
    };



    res.json(responseData);
  } catch (error: any) {
    console.error('Asset checker error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get available hardware for allocation
export const getAvailableHardware = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const companyId = id;
    const q = (req.query.q as string) || '';

    // First, get all assets that are either AVAILABLE or don't have active allocations
    const baseQuery: any = {
      companyId,
      isDeleted: false
    };

    if (q) {
      baseQuery.$or = [
        { assetName: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { assetModel: { $regex: q, $options: 'i' } },
        { serialNumber: { $regex: q, $options: 'i' } },
      ];
    }

    // Get all assets that match the search criteria
    const allAssets = await HardwareAsset.find(baseQuery)
      .select('assetName brand assetModel serialNumber status')
      .sort({ assetName: 1 })
      .limit(100);

    // Get all active allocations to filter out truly assigned assets
    const activeAllocations = await HardwareAllocation.find({
      companyId,
      status: 'ACTIVE',
      isDeleted: false
    }).select('hardwareAssetId');

    const assignedAssetIds = new Set(activeAllocations.map(alloc => alloc.hardwareAssetId.toString()));

    // Filter assets to only include those that are truly available
    const availableAssets = allAssets.filter(asset => {
      // Include if asset status is AVAILABLE or if it doesn't have an active allocation
      const assetIdString = (asset._id as any).toString();
      return asset.status === 'AVAILABLE' || !assignedAssetIds.has(assetIdString);
    });

    // Update asset status for consistency if needed
    for (const asset of availableAssets) {
      const assetIdString = (asset._id as any).toString();
      if (asset.status !== 'AVAILABLE' && !assignedAssetIds.has(assetIdString)) {
        // Asset should be available but status is wrong, fix it
        await HardwareAsset.findByIdAndUpdate(asset._id, {
          status: 'AVAILABLE',
          updatedBy: companyId,
        });
        asset.status = 'AVAILABLE'; // Update in memory for response
      }
    }

    // Remove status from response and limit results
    const assets = availableAssets.slice(0, 50).map(asset => ({
      _id: asset._id,
      assetName: asset.assetName,
      brand: asset.brand,
      assetModel: asset.assetModel,
      serialNumber: asset.serialNumber,
    }));

    res.json({ assets });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get available software for allocation
export const getAvailableSoftware = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const companyId = id;
    const q = (req.query.q as string) || '';

    const query: any = {
      companyId: new mongoose.Types.ObjectId(companyId),
      availableLicenseCount: { $gt: 0 },
      status: { $ne: 'EXPIRED' }, // Exclude expired software from available list
      isDeleted: false
    };

    if (q) {
      query.$or = [
        { softwareName: { $regex: q, $options: 'i' } },
        { vendor: { $regex: q, $options: 'i' } },
      ];
    }

    const assets = await SoftwareAsset.find(query)
      .select('softwareName vendor totalLicenseCount availableLicenseCount startDate endDate customFields status')
      .sort({ softwareName: 1 })
      .limit(50);

    // Check and update expiry status for each asset
    const assetsWithExpiryCheck = await Promise.all(
      assets.map(async (asset) => {
        return await checkAndUpdateSoftwareAssetExpiry(asset);
      })
    );

    res.json({ assets: assetsWithExpiryCheck });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get company users for allocation
export const getCompanyUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const companyId = id;
    const q = (req.query.q as string) || '';

    const query: any = {
      companyId,
      isActive: true
    };

    if (q) {
      query.$or = [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('username email')
      .sort({ username: 1 })
      .limit(50);

    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Utility method to check and update expired software assets and allocations
export const checkExpiredSoftware = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    // Check both software assets and allocations
    await checkAndUpdateAllExpiredSoftware();
    await checkAndUpdateAllExpiredAllocations();

    res.json({ message: 'Expired software and allocations check completed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Log fetching endpoints
export const getHardwareAssetLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { assetId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    // Verify asset belongs to company
    const asset = await HardwareAsset.findOne({ _id: assetId, companyId, isDeleted: false });
    if (!asset) {
      return res.status(404).json({ message: 'Hardware asset not found' });
    }

    const logs = await HardwareAssetLog.find({ hardwareAssetId: assetId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSoftwareAssetLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { assetId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    // Verify asset belongs to company
    const asset = await SoftwareAsset.findOne({ _id: assetId, companyId, isDeleted: false });
    if (!asset) {
      return res.status(404).json({ message: 'Software asset not found' });
    }

    const logs = await SoftwareAssetLog.find({ softwareAssetId: assetId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getHardwareAllocationLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { allocationId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    // Verify allocation belongs to company and get asset info
    const allocation = await HardwareAllocation.findOne({ _id: allocationId, companyId, isDeleted: false })
      .populate('hardwareAssetId', 'assetName brand assetModel')
      .populate('userId', 'username email');

    if (!allocation) {
      return res.status(404).json({ message: 'Hardware allocation not found' });
    }

    // Get asset name from the allocation (this is our reliable source)
    const assetName = (allocation.hardwareAssetId as any)?.assetName || 'Unknown Asset';
    const userName = (allocation.userId as any)?.username || 'Unknown User';
    const userEmail = (allocation.userId as any)?.email || '';

    // Convert allocationId to ObjectId for proper querying
    const logs = await HardwareAllocationLog.find({
      hardwareAllocationId: new mongoose.Types.ObjectId(allocationId)
    })
      .populate('performedBy', 'username email')
      .populate('hardwareAssetId', 'assetName brand assetModel serialNumber')
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();


    // Transform logs to include asset and user information
    // Use the asset name from each log's hardwareAssetId (for return logs, this will be the old asset)
    // For assign logs, this will be the new asset
    // Fetch asset names directly from database if populate failed - don't use current allocation's asset name as fallback
    let transformedLogs = await Promise.all(logs.map(async (log, index) => {

      // Get asset name from populated hardwareAssetId
      let logAssetName = (log.hardwareAssetId as any)?.assetName;

      // If populate didn't work, fetch the asset name directly from database
      if (!logAssetName && log.hardwareAssetId) {
        const assetId = (log.hardwareAssetId as any)?._id || log.hardwareAssetId;

        if (assetId) {
          try {
            const asset = await HardwareAsset.findById(assetId).select('assetName').lean();
            logAssetName = asset?.assetName;
          } catch (error) {
            console.error(`[DEBUG] Failed to fetch asset name for ${assetId}:`, error);
          }
        }
      }

      return {
        ...log,
        assetName: logAssetName || 'Unknown Asset', // Don't use current allocation's asset name as fallback
        allocatedToUserName: log.allocatedToUserName || userName,
        allocatedToUserEmail: log.allocatedToUserEmail || userEmail,
      };
    }));

    // Filter by status in backend if statusFilter is provided and not 'all'
    if (statusFilter && statusFilter !== 'all') {
      transformedLogs = transformedLogs.filter(log => {
        // Calculate log status: infer from action
        // Hardware logs use 'return', software logs use 'revoke'
        const logAction = (log as any).action;
        const logStatus = (logAction === 'return' || logAction === 'revoke') ? 'RETURNED' : 'ACTIVE';
        return logStatus === statusFilter;
      });
    }

    // Debug: Log what we're returning AFTER transformation and filtering
    const returnLogs = transformedLogs.filter(log => log.action === 'return');
    const assignLogs = transformedLogs.filter(log => log.action === 'assign');

    res.json({ logs: transformedLogs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSoftwareAllocationLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { allocationId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    // Verify allocation belongs to company and get asset info
    const allocation = await SoftwareAllocation.findOne({ _id: allocationId, companyId, isDeleted: false })
      .populate('softwareAssetId', 'softwareName version')
      .populate('userId', 'username email');

    if (!allocation) {
      return res.status(404).json({ message: 'Software allocation not found' });
    }

    // Get asset name from the allocation (this is our reliable source)
    const assetName = (allocation.softwareAssetId as any)?.softwareName || 'Unknown Asset';
    const userName = (allocation.userId as any)?.username || 'Unknown User';
    const userEmail = (allocation.userId as any)?.email || '';

    // Convert allocationId to ObjectId for proper querying
    const logs = await SoftwareAllocationLog.find({
      softwareAllocationId: new mongoose.Types.ObjectId(allocationId)
    })
      .populate('performedBy', 'username email')
      .populate('softwareAssetId', 'softwareName version')
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    // Transform logs to include asset and user information
    // Fetch asset names directly from database if populate failed - don't use current allocation's asset name as fallback
    let transformedLogs = await Promise.all(logs.map(async (log) => {
      // Get asset name from populated softwareAssetId
      let logAssetName = (log.softwareAssetId as any)?.softwareName;

      // If populate didn't work, fetch the asset name directly from database
      if (!logAssetName && log.softwareAssetId) {
        const assetId = (log.softwareAssetId as any)?._id || log.softwareAssetId;
        if (assetId) {
          try {
            const asset = await SoftwareAsset.findById(assetId).select('softwareName').lean();
            logAssetName = asset?.softwareName;
          } catch (error) {
            console.error(`[DEBUG] Failed to fetch software asset name for ${assetId}:`, error);
          }
        }
      }

      return {
        ...log,
        assetName: logAssetName || 'Unknown Asset', // Don't use current allocation's asset name as fallback
        allocatedToUserName: log.allocatedToUserName || userName,
        allocatedToUserEmail: log.allocatedToUserEmail || userEmail,
      };
    }));

    // Filter by status in backend if statusFilter is provided and not 'all'
    if (statusFilter && statusFilter !== 'all') {
      transformedLogs = transformedLogs.filter(log => {
        // Calculate log status: infer from action
        // Hardware logs use 'return', software logs use 'revoke'
        const logAction = (log as any).action;
        const logStatus = (logAction === 'return' || logAction === 'revoke') ? 'RETURNED' : 'ACTIVE';
        return logStatus === statusFilter;
      });
    }

    res.json({ logs: transformedLogs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get all allocation history for a specific asset
export const getHardwareAssetAllocationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { assetId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    // Verify asset belongs to company
    const asset = await HardwareAsset.findOne({ _id: assetId, companyId, isDeleted: false });
    if (!asset) {
      return res.status(404).json({ message: 'Hardware asset not found' });
    }

    // Check if there are any allocation logs for this asset
    const allLogsCount = await HardwareAllocationLog.countDocuments({
      hardwareAssetId: new mongoose.Types.ObjectId(assetId)
    });

    // Also check if there are any allocations for this asset
    const allocationsCount = await HardwareAllocation.countDocuments({
      hardwareAssetId: new mongoose.Types.ObjectId(assetId),
      isDeleted: false
    });

    // Get existing logs from database
    const logs = await HardwareAllocationLog.find({
      hardwareAssetId: new mongoose.Types.ObjectId(assetId)
    })
      .populate('hardwareAssetId', 'assetName brand assetModel')
      .populate('userId', 'username email')
      .populate('allocatedToUserId', 'username email')
      .populate('performedBy', 'username email')
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();

    // Debug: Log what actions we have before filtering
    const returnLogsBeforeFilter = logs.filter(log => log.action === 'return');
    const assignLogsBeforeFilter = logs.filter(log => log.action === 'assign');

    // Filter out any synthetic logs that might have been created (they have string IDs starting with 'synthetic-')
    const realLogs = logs.filter(log => {
      const logId = log._id?.toString() || '';
      return !logId.startsWith('synthetic-');
    });

    // Debug: Check return logs after filtering synthetic logs
    const returnLogsAfterFilter = realLogs.filter(log => log.action === 'return');

    // If no real logs found, create synthetic history from allocation records
    let finalLogs: any[] = realLogs;
    if (realLogs.length === 0 && allocationsCount > 0) {
      // Get all allocations for this asset (including deleted ones for history)
      const allocations = await HardwareAllocation.find({
        hardwareAssetId: new mongoose.Types.ObjectId(assetId)
      })
        .populate('userId', 'username email')
        .populate('createdBy', 'companyName')
        .populate('updatedBy', 'companyName')
        .sort({ createdAt: -1 })
        .lean();

      // Get company info for better "performed by" information
      const company = await Company.findById(companyId).select('companyName contactName email');
      const performedByName = company?.contactName || company?.companyName || 'System Admin';
      const performedByEmail = company?.email || `admin@${company?.companyName?.toLowerCase().replace(/\s+/g, '') || 'company'}.com`;

      // Create synthetic logs from allocations
      const syntheticLogs: any[] = allocations.flatMap(allocation => {
        const logs: any[] = [];

        // Create allocation log
        logs.push({
          _id: `synthetic-assign-${allocation._id}`,
          action: 'assign',
          hardwareAssetId: allocation.hardwareAssetId,
          allocatedToUserId: allocation.userId,
          allocatedToUserName: (allocation.userId as any)?.username || 'Unknown User',
          allocatedToUserEmail: (allocation.userId as any)?.email || '',
          allocatedDate: allocation.assignedDate || allocation.createdAt,
          remarks: allocation.remarks,
          timestamp: allocation.createdAt,
          performedByName: performedByName,
          performedByEmail: performedByEmail,
          details: `Asset allocated to ${(allocation.userId as any)?.username || 'user'}`,
          assetName: asset.assetName
        });

        // Create return log if allocation was returned
        if (allocation.status === 'RETURNED' || allocation.isDeleted) {
          logs.push({
            _id: `synthetic-return-${allocation._id}`,
            action: 'return',
            hardwareAssetId: allocation.hardwareAssetId,
            allocatedToUserId: allocation.userId,
            allocatedToUserName: (allocation.userId as any)?.username || 'Unknown User',
            allocatedToUserEmail: (allocation.userId as any)?.email || '',
            allocatedDate: allocation.assignedDate || allocation.createdAt,
            returnedDate: allocation.returnedDate || allocation.updatedAt,
            remarks: allocation.remarks,
            timestamp: allocation.returnedDate || allocation.updatedAt,
            performedByName: performedByName,
            performedByEmail: performedByEmail,
            details: `Asset returned by ${(allocation.userId as any)?.username || 'user'}`,
            assetName: asset.assetName
          });
        }

        return logs;
      });

      finalLogs = syntheticLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else if (realLogs.length > 0) {
      // If real logs exist, use only real logs to avoid duplicates
      // Remove duplicates based on log ID and timestamp
      const uniqueLogsMap = new Map();
      realLogs.forEach(log => {
        const logId = log._id?.toString() || '';
        const key = `${logId}-${log.timestamp?.toString() || ''}`;
        if (!uniqueLogsMap.has(key)) {
          uniqueLogsMap.set(key, log);
        }
      });
      finalLogs = Array.from(uniqueLogsMap.values());
    }

    // Transform logs to include asset name and user information
    // Fetch asset names directly from database if populate failed - don't use current asset's name as fallback
    let transformedLogs = await Promise.all(finalLogs.map(async (log) => {
      // Get asset name from populated hardwareAssetId or from log.assetName
      let logAssetName = log.assetName || (log.hardwareAssetId as any)?.assetName;

      // If populate didn't work, fetch the asset name directly from database
      if (!logAssetName && log.hardwareAssetId) {
        const assetId = (log.hardwareAssetId as any)?._id || log.hardwareAssetId;
        if (assetId) {
          try {
            const fetchedAsset = await HardwareAsset.findById(assetId).select('assetName').lean();
            logAssetName = fetchedAsset?.assetName;
          } catch (error) {
            console.error(`[DEBUG] Failed to fetch asset name for ${assetId}:`, error);
          }
        }
      }

      return {
        ...log,
        assetName: logAssetName || 'Unknown Asset', // Don't use current asset's name as fallback
        // Ensure user information is properly formatted
        allocatedToUserName: log.allocatedToUserName || (log.allocatedToUserId as any)?.username || (log.userId as any)?.username || 'Unknown User',
        allocatedToUserEmail: log.allocatedToUserEmail || (log.allocatedToUserId as any)?.email || (log.userId as any)?.email || '',
      };
    }));

    // Filter by status in backend if statusFilter is provided and not 'all'
    if (statusFilter && statusFilter !== 'all') {
      transformedLogs = transformedLogs.filter(log => {
        // Calculate log status: infer from action
        // Hardware logs use 'return', software logs use 'revoke'
        const logAction = (log as any).action;
        const logStatus = (logAction === 'return' || logAction === 'revoke') ? 'RETURNED' : 'ACTIVE';
        return logStatus === statusFilter;
      });
    }

    // Debug: Log what we're returning
    const returnLogs = transformedLogs.filter(log => log.action === 'return');
    const assignLogs = transformedLogs.filter(log => log.action === 'assign');

    res.json({ logs: transformedLogs });
  } catch (error: any) {
    console.error(`Error in getHardwareAssetAllocationHistory:`, error);
    res.status(500).json({ message: error.message });
  }
};

export const getSoftwareAssetAllocationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { assetId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    // Verify asset belongs to company
    const asset = await SoftwareAsset.findOne({ _id: assetId, companyId, isDeleted: false });
    if (!asset) {
      return res.status(404).json({ message: 'Software asset not found' });
    }

    // Check if there are any allocation logs for this asset
    const allLogsCount = await SoftwareAllocationLog.countDocuments({
      softwareAssetId: new mongoose.Types.ObjectId(assetId)
    });

    // Also check if there are any allocations for this asset
    const allocationsCount = await SoftwareAllocation.countDocuments({
      softwareAssetId: new mongoose.Types.ObjectId(assetId),
      isDeleted: false
    });

    // Get existing logs from database
    const logs = await SoftwareAllocationLog.find({
      softwareAssetId: new mongoose.Types.ObjectId(assetId)
    })
      .populate('softwareAssetId', 'softwareName version')
      .populate('userId', 'username email')
      .populate('allocatedToUserId', 'username email')
      .populate('performedBy', 'username email')
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();

    // Filter out any synthetic logs that might have been created (they have string IDs starting with 'synthetic-')
    const realLogs = logs.filter(log => {
      const logId = log._id?.toString() || '';
      return !logId.startsWith('synthetic-');
    });

    // If no real logs found, create synthetic history from allocation records
    let finalLogs: any[] = realLogs;
    if (realLogs.length === 0 && allocationsCount > 0) {
      // Get all allocations for this asset (including deleted ones for history)
      const allocations = await SoftwareAllocation.find({
        softwareAssetId: new mongoose.Types.ObjectId(assetId)
      })
        .populate('userId', 'username email')
        .populate('createdBy', 'companyName')
        .populate('updatedBy', 'companyName')
        .sort({ createdAt: -1 })
        .lean();

      // Get company info for better "performed by" information
      const company = await Company.findById(companyId).select('companyName contactName email');
      const performedByName = company?.contactName || company?.companyName || 'System Admin';
      const performedByEmail = company?.email || `admin@${company?.companyName?.toLowerCase().replace(/\s+/g, '') || 'company'}.com`;

      // Create synthetic logs from allocations
      const syntheticLogs: any[] = allocations.flatMap(allocation => {
        const logs: any[] = [];

        // Create allocation log
        logs.push({
          _id: `synthetic-assign-${allocation._id}`,
          action: 'assign',
          softwareAssetId: allocation.softwareAssetId,
          allocatedToUserId: allocation.userId,
          allocatedToUserName: (allocation.userId as any)?.username || 'Unknown User',
          allocatedToUserEmail: (allocation.userId as any)?.email || '',
          allocatedDate: allocation.assignedDate || allocation.createdAt,
          expiryDate: allocation.expiryDate,
          licenseCount: allocation.licenseCount,
          remarks: allocation.remarks,
          timestamp: allocation.createdAt,
          performedByName: performedByName,
          performedByEmail: performedByEmail,
          details: `Software allocated to ${(allocation.userId as any)?.username || 'user'} (${allocation.licenseCount} license${allocation.licenseCount > 1 ? 's' : ''})`,
          assetName: asset.softwareName
        });

        // Create return/delete log if allocation was deleted
        if (allocation.status === 'DELETED' || allocation.isDeleted) {
          logs.push({
            _id: `synthetic-return-${allocation._id}`,
            action: 'return',
            softwareAssetId: allocation.softwareAssetId,
            allocatedToUserId: allocation.userId,
            allocatedToUserName: (allocation.userId as any)?.username || 'Unknown User',
            allocatedToUserEmail: (allocation.userId as any)?.email || '',
            allocatedDate: allocation.assignedDate || allocation.createdAt,
            expiryDate: allocation.expiryDate,
            licenseCount: allocation.licenseCount,
            remarks: allocation.remarks,
            timestamp: allocation.updatedAt,
            performedByName: performedByName,
            performedByEmail: performedByEmail,
            details: `Software allocation revoked from ${(allocation.userId as any)?.username || 'user'}`,
            assetName: asset.softwareName
          });
        }

        return logs;
      });

      finalLogs = syntheticLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else if (realLogs.length > 0) {
      // If real logs exist, use only real logs to avoid duplicates
      // Remove duplicates based on log ID and timestamp
      const uniqueLogsMap = new Map();
      realLogs.forEach(log => {
        const logId = log._id?.toString() || '';
        const key = `${logId}-${log.timestamp?.toString() || ''}`;
        if (!uniqueLogsMap.has(key)) {
          uniqueLogsMap.set(key, log);
        }
      });
      finalLogs = Array.from(uniqueLogsMap.values());
    }

    // Transform logs to include asset name and user information
    // Fetch asset names directly from database if populate failed - don't use current asset's name as fallback
    let transformedLogs = await Promise.all(finalLogs.map(async (log) => {
      // Get asset name from populated softwareAssetId or from log.assetName
      let logAssetName = log.assetName || (log.softwareAssetId as any)?.softwareName;

      // If populate didn't work, fetch the asset name directly from database
      if (!logAssetName && log.softwareAssetId) {
        const assetId = (log.softwareAssetId as any)?._id || log.softwareAssetId;
        if (assetId) {
          try {
            const fetchedAsset = await SoftwareAsset.findById(assetId).select('softwareName').lean();
            logAssetName = fetchedAsset?.softwareName;
          } catch (error) {
            console.error(`[DEBUG] Failed to fetch software asset name for ${assetId}:`, error);
          }
        }
      }

      return {
        ...log,
        assetName: logAssetName || 'Unknown Asset', // Don't use current asset's name as fallback
        // Ensure user information is properly formatted
        allocatedToUserName: log.allocatedToUserName || (log.allocatedToUserId as any)?.username || (log.userId as any)?.username || 'Unknown User',
        allocatedToUserEmail: log.allocatedToUserEmail || (log.allocatedToUserId as any)?.email || (log.userId as any)?.email || '',
      };
    }));

    // Filter by status in backend if statusFilter is provided and not 'all'
    if (statusFilter && statusFilter !== 'all') {
      transformedLogs = transformedLogs.filter(log => {
        // Calculate log status: infer from action
        // Hardware logs use 'return', software logs use 'revoke'
        const logAction = (log as any).action;
        const logStatus = (logAction === 'return' || logAction === 'revoke') ? 'RETURNED' : 'ACTIVE';
        return logStatus === statusFilter;
      });
    }

    res.json({ logs: transformedLogs });
  } catch (error: any) {
    console.error(`Error in getSoftwareAssetAllocationHistory:`, error);
    res.status(500).json({ message: error.message });
  }
};

// Get user allocation history
export const getUserHardwareAllocationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { userId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    // Verify user belongs to company
    const user = await User.findOne({ _id: userId, companyId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Query logs by allocatedToUserId (user who received allocation) OR userId (for backward compatibility)
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const logs = await HardwareAllocationLog.find({
      $or: [
        { allocatedToUserId: userIdObjectId },
        { userId: userIdObjectId }
      ]
    })
      .populate('hardwareAssetId', 'assetName brand assetModel serialNumber')
      .populate('userId', 'username email')
      .populate('allocatedToUserId', 'username email')
      .populate('performedBy', 'username email')
      .sort({ timestamp: -1 })
      .limit(500) // Increased limit to get complete history
      .lean();

    // Transform logs to include asset name and user information
    // Fetch asset names directly from database if populate failed
    let transformedLogs = await Promise.all(logs.map(async (log) => {
      // Get asset name from populated hardwareAssetId
      let logAssetName = (log.hardwareAssetId as any)?.assetName;
      let logAssetBrand = (log.hardwareAssetId as any)?.brand;
      let logAssetModel = (log.hardwareAssetId as any)?.assetModel;
      let logAssetSerialNumber = (log.hardwareAssetId as any)?.serialNumber;

      // If populate didn't work, fetch the asset name directly from database
      if (!logAssetName && log.hardwareAssetId) {
        const assetId = (log.hardwareAssetId as any)?._id || log.hardwareAssetId;
        if (assetId) {
          try {
            const asset = await HardwareAsset.findById(assetId).select('assetName brand assetModel serialNumber').lean();
            logAssetName = asset?.assetName;
            logAssetBrand = asset?.brand;
            logAssetModel = asset?.assetModel;
            logAssetSerialNumber = asset?.serialNumber;
          } catch (error) {
            console.error(`[DEBUG] Failed to fetch asset name for ${assetId}:`, error);
          }
        }
      }

      return {
        ...log,
        assetName: logAssetName || 'Unknown Asset',
        assetBrand: logAssetBrand,
        assetModel: logAssetModel,
        assetSerialNumber: logAssetSerialNumber,
        // Ensure user information is properly formatted
        allocatedToUserName: log.allocatedToUserName || (log.allocatedToUserId as any)?.username || (log.userId as any)?.username || user.username || 'Unknown User',
        allocatedToUserEmail: log.allocatedToUserEmail || (log.allocatedToUserId as any)?.email || (log.userId as any)?.email || user.email || '',
      };
    }));

    // Group logs by hardwareAssetId to create device-centric view
    const deviceGroups = new Map<string, any>();
    const deviceStatusMap = new Map<string, 'ACTIVE' | 'RETURNED'>();

    // Filter logs for device grouping - only include assign and return actions
    const deviceGroupLogs = transformedLogs.filter((log: any) =>
      log.action === 'assign' || log.action === 'return'
    );

    deviceGroupLogs.forEach((log: any) => {
      // Robust ID extraction matching frontend fix
      let rawId = (log.hardwareAssetId as any)?._id?.toString() || log.hardwareAssetId?.toString();
      if (rawId === 'undefined' || rawId === 'null') rawId = null;

      const validAssetName = (log.assetName && log.assetName !== 'Unknown Asset') ? log.assetName : null;
      // Group Key: Prefer ID, fallback to Name (if unique enough), fallback to 'unknown'
      const groupKey = rawId || validAssetName || 'unknown_asset';

      if (!deviceGroups.has(groupKey)) {
        deviceGroups.set(groupKey, {
          hardwareAssetId: rawId || groupKey, // Ensure we have a key for frontend
          assetName: validAssetName || 'Unknown Asset',
          assetBrand: log.assetBrand,
          assetModel: log.assetModel,
          assetSerialNumber: log.assetSerialNumber,
          logs: [],
          firstAssignedDate: null,
          lastReturnedDate: null,
          currentStatus: 'UNKNOWN' as 'ACTIVE' | 'RETURNED' | 'UNKNOWN',
        });
      }

      const deviceGroup = deviceGroups.get(groupKey);
      deviceGroup.logs.push(log);

      // Determine device status (First encounter in Newest-to-Oldest logs wins)
      if (!deviceStatusMap.has(groupKey)) {
        if (log.action === 'assign') {
          deviceStatusMap.set(groupKey, 'ACTIVE');
        } else if (log.action === 'return') {
          deviceStatusMap.set(groupKey, 'RETURNED');
        }
      }

      // Track dates
      if (log.action === 'assign') {
        if (!deviceGroup.firstAssignedDate || new Date(log.timestamp) < new Date(deviceGroup.firstAssignedDate)) {
          deviceGroup.firstAssignedDate = log.timestamp;
        }
      } else if (log.action === 'return') {
        if (!deviceGroup.lastReturnedDate || new Date(log.timestamp) > new Date(deviceGroup.lastReturnedDate)) {
          deviceGroup.lastReturnedDate = log.timestamp;
        }
      }
    });

    // Update device statuses
    deviceGroups.forEach((deviceGroup, key) => {
      deviceGroup.currentStatus = deviceStatusMap.get(key) || 'UNKNOWN';
      // Sort logs within each device group by timestamp (newest first)
      deviceGroup.logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });

    // Convert Map to Array and sort by most recent activity
    const deviceGroupsArray = Array.from(deviceGroups.values()).sort((a, b) => {
      const aLatest = a.logs[0]?.timestamp || '';
      const bLatest = b.logs[0]?.timestamp || '';
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

    // Calculate summary statistics
    const totalDevices = deviceGroupsArray.length;
    const activeDevices = deviceGroupsArray.filter(d => d.currentStatus === 'ACTIVE').length;
    const returnedDevices = deviceGroupsArray.filter(d => d.currentStatus === 'RETURNED').length;

    // Filter by status if statusFilter is provided and not 'all'
    let filteredDeviceGroups = deviceGroupsArray;
    if (statusFilter && statusFilter !== 'all') {
      filteredDeviceGroups = deviceGroupsArray.filter(deviceGroup => {
        return deviceGroup.currentStatus === statusFilter;
      });
    }

    // Also filter flat logs for backward compatibility
    let filteredLogs = transformedLogs;
    if (statusFilter && statusFilter !== 'all') {
      filteredLogs = transformedLogs.filter(log => {
        const logAction = (log as any).action;
        const logStatus = (logAction === 'return' || logAction === 'revoke') ? 'RETURNED' : 'ACTIVE';
        return logStatus === statusFilter;
      });
    }

    res.json({
      logs: filteredLogs, // Flat list for timeline view
      deviceGroups: filteredDeviceGroups, // Grouped by device for device-centric view
      summary: {
        totalDevices,
        activeDevices,
        returnedDevices,
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserSoftwareAllocationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role !== 'company_super_admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin only.' });
    }

    const { userId } = req.params;
    const { statusFilter } = req.query; // Get statusFilter from query params
    const companyId = id;

    // Verify user belongs to company
    const user = await User.findOne({ _id: userId, companyId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert userId to ObjectId for proper querying and populate asset info
    const logs = await SoftwareAllocationLog.find({
      userId: new mongoose.Types.ObjectId(userId)
    })
      .populate('softwareAssetId', 'softwareName version')
      .populate('userId', 'username email')
      .populate('allocatedToUserId', 'username email')
      .populate('performedBy', 'username email')
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();

    // Transform logs to include asset name and user information
    // Fetch asset names directly from database if populate failed
    let transformedLogs = await Promise.all(logs.map(async (log) => {
      // Get asset name from populated softwareAssetId
      let logAssetName = (log.softwareAssetId as any)?.softwareName;

      // If populate didn't work, fetch the asset name directly from database
      if (!logAssetName && log.softwareAssetId) {
        const assetId = (log.softwareAssetId as any)?._id || log.softwareAssetId;
        if (assetId) {
          try {
            const asset = await SoftwareAsset.findById(assetId).select('softwareName').lean();
            logAssetName = asset?.softwareName;
          } catch (error) {
            console.error(`[DEBUG] Failed to fetch software asset name for ${assetId}:`, error);
          }
        }
      }

      return {
        ...log,
        assetName: logAssetName || 'Unknown Asset',
        // Ensure user information is properly formatted
        allocatedToUserName: log.allocatedToUserName || (log.allocatedToUserId as any)?.username || (log.userId as any)?.username || user.username || 'Unknown User',
        allocatedToUserEmail: log.allocatedToUserEmail || (log.allocatedToUserId as any)?.email || (log.userId as any)?.email || user.email || '',
      };
    }));

    // Filter by status in backend if statusFilter is provided and not 'all'
    if (statusFilter && statusFilter !== 'all') {
      transformedLogs = transformedLogs.filter(log => {
        // Calculate log status: infer from action
        // Hardware logs use 'return', software logs use 'revoke'
        const logAction = (log as any).action;
        const logStatus = (logAction === 'return' || logAction === 'revoke') ? 'RETURNED' : 'ACTIVE';
        return logStatus === statusFilter;
      });
    }

    res.json({ logs: transformedLogs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};