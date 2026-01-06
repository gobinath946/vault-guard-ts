import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import HardwareAssetLog from '../models/HardwareAssetLog';
import SoftwareAssetLog from '../models/SoftwareAssetLog';
import HardwareAllocationLog from '../models/HardwareAllocationLog';
import SoftwareAllocationLog from '../models/SoftwareAllocationLog';
import HardwareAsset from '../models/HardwareAsset';
import SoftwareAsset from '../models/SoftwareAsset';
import SoftwareAllocation from '../models/SoftwareAllocation';
import Company from '../models/Company';

/**
 * Safely convert a value to ObjectId, returning undefined if invalid
 */
function toObjectId(value: any): mongoose.Types.ObjectId | undefined {
  if (!value) return undefined;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === 'string') {
    // Check if it's a valid 24 character hex string
    if (/^[0-9a-fA-F]{24}$/.test(value)) {
      return new mongoose.Types.ObjectId(value);
    }
    // Try to extract ObjectId from stringified object (e.g., "new ObjectId('695a77dc2377a0d8aa07e9bc')")
    const objectIdMatch = value.match(/ObjectId\(['"]([0-9a-fA-F]{24})['"]\)/i);
    if (objectIdMatch && objectIdMatch[1]) {
      return new mongoose.Types.ObjectId(objectIdMatch[1]);
    }
    // Try to extract ObjectId from JSON-like string (e.g., '{\n  "_id": "695a77dc2377a0d8aa07e9bc"\n}')
    const jsonIdMatch = value.match(/["']_id["']\s*:\s*["']([0-9a-fA-F]{24})["']/i);
    if (jsonIdMatch && jsonIdMatch[1]) {
      return new mongoose.Types.ObjectId(jsonIdMatch[1]);
    }
  }
  // Handle case where value is an object with _id property (populated object)
  if (value && typeof value === 'object' && value._id) {
    return toObjectId(value._id);
  }
  // Handle case where value is an object with toString method (like ObjectId from populated fields)
  if (value && typeof value.toString === 'function') {
    const str = value.toString();
    if (/^[0-9a-fA-F]{24}$/.test(str)) {
      return new mongoose.Types.ObjectId(str);
    }
  }
  return undefined;
}

/**
 * Decrypt custom fields from allocation credentials
 */
function decryptCustomFields(allocation: any): { [key: string]: any } {
  try {
    if (!allocation || !allocation.credentials || !allocation.credentials.encryptedData || !allocation.credentials.iv) {
      return {};
    }

    // Create a temporary SoftwareAllocation instance to use the decryption method
    const tempAllocation = new SoftwareAllocation();
    tempAllocation.credentials = allocation.credentials;

    const decrypted = tempAllocation.decryptCredentials();
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting custom fields for logging:', error);
    return {};
  }
}

/**
 * Get company information for logging
 */
async function getCompanyInfo(companyId: string) {
  try {
    const company = await Company.findById(companyId).select('companyName contactName email');
    return {
      name: company?.contactName || company?.companyName || 'System Admin',
      email: company?.email || `admin@${company?.companyName?.toLowerCase().replace(/\s+/g, '') || 'company'}.com`,
    };
  } catch (error) {
    console.error('Error fetching company info:', error);
    return {
      name: 'System Admin',
      email: 'admin@system.com',
    };
  }
}

/**
 * Log hardware/software asset creation
 */
export async function logAssetCreate(
  type: 'hardware' | 'software',
  assetId: string,
  assetName: string,
  req: AuthRequest
): Promise<void> {
  try {
    const companyId = req.user?.id || '';
    const companyInfo = await getCompanyInfo(companyId);

    if (type === 'hardware') {
      await HardwareAssetLog.create({
        hardwareAssetId: assetId,
        action: 'create' as const,
        performedBy: companyId,
        performedByName: companyInfo.name,
        performedByEmail: companyInfo.email,
        timestamp: new Date(),
        details: `Hardware asset "${assetName}" created`,
        assetName,
      });
    } else {
      await SoftwareAssetLog.create({
        softwareAssetId: assetId,
        action: 'create' as const,
        performedBy: companyId,
        performedByName: companyInfo.name,
        performedByEmail: companyInfo.email,
        timestamp: new Date(),
        details: `Software asset "${assetName}" created`,
        assetName,
      });
    }
  } catch (error) {
    console.error(`Failed to log ${type} asset creation:`, error);
  }
}

/**
 * Log hardware/software asset update
 */
export async function logAssetUpdate(
  type: 'hardware' | 'software',
  assetId: string,
  oldAsset: any,
  newAsset: any,
  assetName: string,
  req: AuthRequest
): Promise<void> {
  try {
    const companyId = req.user?.id || '';
    const companyInfo = await getCompanyInfo(companyId);

    // Find changed fields
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

    const fieldsToCheck = type === 'hardware'
      ? ['assetName', 'assetType', 'brand', 'assetModel', 'serialNumber', 'purchaseDate', 'status', 'remarks']
      : ['softwareName', 'vendor', 'totalLicenseCount', 'availableLicenseCount', 'startDate', 'endDate', 'status', 'customFields'];

    for (const field of fieldsToCheck) {
      const oldValue = oldAsset[field];
      const newValue = newAsset[field];

      // Handle dates - format them as dd/mm/yyyy instead of ISO strings
      const formatDateForLog = (date: Date): string => {
        return date.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      };

      const oldVal = oldValue instanceof Date ? formatDateForLog(oldValue) : (oldValue?.toString() || '');
      const newVal = newValue instanceof Date ? formatDateForLog(newValue) : (newValue?.toString() || '');

      // Handle objects (like customFields) - but NOT Date objects since we already formatted them
      const oldValStr = (typeof oldValue === 'object' && oldValue !== null && !(oldValue instanceof Date)) ? JSON.stringify(oldValue) : oldVal;
      const newValStr = (typeof newValue === 'object' && newValue !== null && !(newValue instanceof Date)) ? JSON.stringify(newValue) : newVal;

      if (oldValStr !== newValStr) {
        changes.push({
          field,
          oldValue: oldValStr,
          newValue: newValStr,
        });
      }
    }

    // Log each change
    for (const change of changes) {
      if (type === 'hardware') {
        await HardwareAssetLog.create({
          hardwareAssetId: assetId,
          action: 'update' as const,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          performedBy: companyId,
          performedByName: companyInfo.name,
          performedByEmail: companyInfo.email,
          timestamp: new Date(),
          details: `Hardware asset "${assetName}" updated: ${change.field} changed`,
          assetName,
        });
      } else {
        await SoftwareAssetLog.create({
          softwareAssetId: assetId,
          action: 'update' as const,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          performedBy: companyId,
          performedByName: companyInfo.name,
          performedByEmail: companyInfo.email,
          timestamp: new Date(),
          details: `Software asset "${assetName}" updated: ${change.field} changed`,
          assetName,
        });
      }
    }
  } catch (error) {
    console.error(`Failed to log ${type} asset update:`, error);
  }
}

/**
 * Log hardware/software asset deletion
 */
export async function logAssetDelete(
  type: 'hardware' | 'software',
  assetId: string,
  asset: any,
  assetName: string,
  req: AuthRequest
): Promise<void> {
  try {
    const companyId = req.user?.id || '';
    const companyInfo = await getCompanyInfo(companyId);

    if (type === 'hardware') {
      await HardwareAssetLog.create({
        hardwareAssetId: assetId,
        action: 'delete' as const,
        performedBy: companyId,
        performedByName: companyInfo.name,
        performedByEmail: companyInfo.email,
        timestamp: new Date(),
        details: `Hardware asset "${assetName}" deleted`,
        assetName,
      });
    } else {
      await SoftwareAssetLog.create({
        softwareAssetId: assetId,
        action: 'delete' as const,
        performedBy: companyId,
        performedByName: companyInfo.name,
        performedByEmail: companyInfo.email,
        timestamp: new Date(),
        details: `Software asset "${assetName}" deleted`,
        assetName,
      });
    }
  } catch (error) {
    console.error(`Failed to log ${type} asset deletion:`, error);
  }
}

/**
 * Log hardware/software allocation creation
 */
export async function logAllocationCreate(
  type: 'hardware' | 'software',
  allocationId: string,
  data: any,
  req: AuthRequest
): Promise<void> {
  try {
    const companyId = req.user?.id;
    if (!companyId) {
      console.error('Cannot log allocation: companyId is missing');
      return;
    }
    const companyInfo = await getCompanyInfo(companyId);

    if (type === 'hardware') {
      const allocationObjectId = toObjectId(allocationId);
      const companyObjectId = toObjectId(companyId);

      if (!allocationObjectId || !companyObjectId) {
        console.error('Invalid ObjectId for allocation logging:', { allocationId, companyId });
        return;
      }

      // Extract hardwareAssetId - handle both populated objects and ObjectIds
      const hardwareAssetId = data.hardwareAssetId?._id || data.hardwareAssetId;
      let assetIdToSave = toObjectId(hardwareAssetId);

      // If toObjectId failed, try to create from string directly
      if (!assetIdToSave && hardwareAssetId) {
        const hardwareAssetIdStr = typeof hardwareAssetId === 'string'
          ? hardwareAssetId
          : hardwareAssetId?.toString();

        if (hardwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(hardwareAssetIdStr)) {
          assetIdToSave = new mongoose.Types.ObjectId(hardwareAssetIdStr);
        } else {
          console.error('[ERROR] Failed to convert hardwareAssetId to ObjectId in logAllocationCreate:', {
            hardwareAssetId: data.hardwareAssetId,
            extracted: hardwareAssetId,
            stringValue: hardwareAssetIdStr,
          });
        }
      }

      await HardwareAllocationLog.create({
        hardwareAllocationId: allocationObjectId,
        hardwareAssetId: assetIdToSave || null, // Use null instead of undefined
        userId: toObjectId(data.userId),
        action: 'assign' as const,
        performedBy: companyObjectId,
        performedByName: companyInfo.name,
        performedByEmail: companyInfo.email,
        timestamp: new Date(),
        allocatedToUserId: toObjectId(data.userId),
        allocatedToUserName: data.userName || 'Unknown',
        allocatedToUserEmail: data.userEmail || '',
        allocatedDate: data.allocatedDate || new Date(),
        remarks: data.remarks,
        details: `Hardware asset "${data.assetName || 'Unknown'}" allocated to ${data.userName || 'user'}`,
      });
    } else {
      // Extract softwareAssetId - handle both populated objects and ObjectIds
      const softwareAssetId = data.softwareAssetId?._id || data.softwareAssetId;
      let assetIdToSave = toObjectId(softwareAssetId);

      // If toObjectId failed, try to create from string directly
      if (!assetIdToSave && softwareAssetId) {
        const softwareAssetIdStr = typeof softwareAssetId === 'string'
          ? softwareAssetId
          : softwareAssetId?.toString();

        if (softwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(softwareAssetIdStr)) {
          assetIdToSave = new mongoose.Types.ObjectId(softwareAssetIdStr);
        } else {
          console.error('[ERROR] Failed to convert softwareAssetId to ObjectId in logAllocationCreate:', {
            softwareAssetId: data.softwareAssetId,
            extracted: softwareAssetId,
            stringValue: softwareAssetIdStr,
          });
        }
      }

      // Extract userId - handle both populated objects and ObjectIds
      const userId = data.userId?._id || data.userId;
      let userIdToSave = toObjectId(userId);

      // If toObjectId failed, try to create from string directly
      if (!userIdToSave && userId) {
        const userIdStr = typeof userId === 'string'
          ? userId
          : userId?.toString();

        if (userIdStr && /^[0-9a-fA-F]{24}$/.test(userIdStr)) {
          userIdToSave = new mongoose.Types.ObjectId(userIdStr);
        } else {
          console.error('[ERROR] Failed to convert userId to ObjectId in logAllocationCreate:', {
            userId: data.userId,
            extracted: userId,
            stringValue: userIdStr,
          });
        }
      }

      const allocationObjectId = toObjectId(allocationId);
      const companyObjectId = toObjectId(companyId);

      if (!allocationObjectId || !companyObjectId) {
        console.error('Invalid ObjectId for software allocation logging:', { allocationId, companyId });
        return;
      }

      await SoftwareAllocationLog.create({
        softwareAllocationId: allocationObjectId,
        softwareAssetId: assetIdToSave || null,
        userId: userIdToSave || null,
        action: 'allocate' as const,
        performedBy: companyObjectId,
        performedByName: companyInfo.name,
        performedByEmail: companyInfo.email,
        timestamp: new Date(),
        allocatedToUserId: userIdToSave || null,
        allocatedToUserName: data.userName || 'Unknown',
        allocatedToUserEmail: data.userEmail || '',
        allocatedDate: data.allocatedDate || new Date(),
        expiryDate: data.expiryDate,
        licenseCount: data.licenseCount,
        remarks: data.remarks,
        details: `Software asset "${data.assetName || 'Unknown'}" allocated to ${data.userName || 'user'} (${data.licenseCount || 0} license${(data.licenseCount || 0) > 1 ? 's' : ''})`,
      });
    }
  } catch (error) {
    console.error(`Failed to log ${type} allocation creation:`, error);
  }
}

/**
 * Log hardware/software allocation update
 */
export async function logAllocationUpdate(
  type: 'hardware' | 'software',
  allocationId: string,
  oldAllocation: any,
  newAllocation: any,
  req: AuthRequest
): Promise<void> {
  try {
    const companyId = req.user?.id;
    if (!companyId) {
      console.error('Cannot log allocation update: companyId is missing');
      return;
    }
    const companyInfo = await getCompanyInfo(companyId);
    const allocationObjectId = toObjectId(allocationId);
    const companyObjectId = toObjectId(companyId);

    if (!allocationObjectId || !companyObjectId) {
      console.error('Invalid ObjectId for allocation update logging:', { allocationId, companyId });
      return;
    }

    if (type === 'hardware') {
      // Extract hardware asset IDs - handle both populated objects and ObjectIds
      const oldHardwareAssetId = oldAllocation.hardwareAssetId?._id || oldAllocation.hardwareAssetId;
      const newHardwareAssetId = newAllocation.hardwareAssetId?._id || newAllocation.hardwareAssetId;

      // Normalize to strings for comparison (handle null/undefined)
      const oldHardwareAssetIdStr = oldHardwareAssetId ? oldHardwareAssetId.toString() : null;
      const newHardwareAssetIdStr = newHardwareAssetId ? newHardwareAssetId.toString() : null;

      // Fetch asset names directly from database to ensure we have the correct names
      let oldAssetName = 'Unknown Asset';
      let newAssetName = 'Unknown Asset';

      if (oldHardwareAssetId) {
        const oldAsset = await HardwareAsset.findById(oldHardwareAssetId).select('assetName').lean();
        oldAssetName = oldAsset?.assetName || oldAllocation.hardwareAssetId?.assetName || 'Unknown Asset';
      } else {
        oldAssetName = oldAllocation.hardwareAssetId?.assetName || 'Unknown Asset';
      }

      if (newHardwareAssetId) {
        const newAsset = await HardwareAsset.findById(newHardwareAssetId).select('assetName').lean();
        newAssetName = newAsset?.assetName || newAllocation.hardwareAssetId?.assetName || 'Unknown Asset';
      } else {
        newAssetName = newAllocation.hardwareAssetId?.assetName || 'Unknown Asset';
      }
      const userId = newAllocation.userId?._id || newAllocation.userId || oldAllocation.userId?._id || oldAllocation.userId;
      const userName = (newAllocation.userId as any)?.username || (oldAllocation.userId as any)?.username || 'Unknown';
      const userEmail = (newAllocation.userId as any)?.email || (oldAllocation.userId as any)?.email || '';
      const oldRemarks = oldAllocation.remarks || '';
      const newRemarks = newAllocation.remarks || '';
      const remarksChanged = oldRemarks !== newRemarks;

      // Compare normalized strings - hardware asset changed if:
      // 1. Both exist and are different, OR
      // 2. Old exists but new doesn't (removed), OR
      // 3. New exists but old doesn't (added)
      const hardwareAssetChanged = (oldHardwareAssetIdStr && newHardwareAssetIdStr &&
        oldHardwareAssetIdStr !== newHardwareAssetIdStr) ||
        (oldHardwareAssetIdStr && !newHardwareAssetIdStr) ||
        (!oldHardwareAssetIdStr && newHardwareAssetIdStr);

      // Scenario 1 & 3: Hardware asset changed - Log return for old + assign for new
      if (hardwareAssetChanged) {
        // Get allocated date from old allocation for return log
        const allocatedDate = oldAllocation.allocatedDate || oldAllocation.assignedDate || new Date();

        // Log return for old asset (only if old asset exists)
        if (oldHardwareAssetIdStr && oldHardwareAssetId) {
          let oldAssetIdToSave = toObjectId(oldHardwareAssetId);

          // Ensure hardwareAssetId is not undefined before creating log
          if (!oldAssetIdToSave) {
            console.error('[ERROR] Failed to convert oldHardwareAssetId to ObjectId:', {
              oldHardwareAssetId,
              oldHardwareAssetId_type: typeof oldHardwareAssetId,
              oldHardwareAssetIdStr,
            });
            // Try to create ObjectId directly from string
            if (oldHardwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(oldHardwareAssetIdStr)) {
              oldAssetIdToSave = new mongoose.Types.ObjectId(oldHardwareAssetIdStr);
            } else {
              console.error('[ERROR] Cannot create log without valid hardwareAssetId - skipping RETURN log');
            }
          }

          // Only create log if we have a valid hardwareAssetId
          if (oldAssetIdToSave) {
            await HardwareAllocationLog.create({
              hardwareAllocationId: allocationObjectId,
              hardwareAssetId: oldAssetIdToSave,
              userId: toObjectId(userId),
              action: 'return' as const,
              performedBy: companyObjectId,
              performedByName: companyInfo.name,
              performedByEmail: companyInfo.email,
              timestamp: new Date(),
              allocatedToUserId: toObjectId(userId),
              allocatedToUserName: userName,
              allocatedToUserEmail: userEmail,
              allocatedDate: allocatedDate instanceof Date ? allocatedDate : new Date(allocatedDate),
              returnedDate: new Date(),
              details: `${oldAssetName} was returned/handed over`,
            });
          }
        }

        // Log assign for new asset (only if new asset exists)
        if (newHardwareAssetIdStr && newHardwareAssetId) {
          let newAssetIdToSave = toObjectId(newHardwareAssetId);
          const assignDetails = remarksChanged
            ? `${newAssetName} was assigned (Remarks: ${newRemarks || 'None'})`
            : `${newAssetName} was assigned`;

          // Ensure hardwareAssetId is not undefined before creating log
          if (!newAssetIdToSave) {
            console.error('[ERROR] Failed to convert newHardwareAssetId to ObjectId:', {
              newHardwareAssetId,
              newHardwareAssetId_type: typeof newHardwareAssetId,
              newHardwareAssetIdStr,
            });
            // Try to create ObjectId directly from string
            if (newHardwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(newHardwareAssetIdStr)) {
              newAssetIdToSave = new mongoose.Types.ObjectId(newHardwareAssetIdStr);
            } else {
              console.error('[ERROR] Cannot create log without valid hardwareAssetId - skipping ASSIGN log');
            }
          }

          // Only create log if we have a valid hardwareAssetId
          if (newAssetIdToSave) {
            await HardwareAllocationLog.create({
              hardwareAllocationId: allocationObjectId,
              hardwareAssetId: newAssetIdToSave,
              userId: toObjectId(userId),
              action: 'assign' as const,
              performedBy: companyObjectId,
              performedByName: companyInfo.name,
              performedByEmail: companyInfo.email,
              timestamp: new Date(),
              allocatedToUserId: toObjectId(userId),
              allocatedToUserName: userName,
              allocatedToUserEmail: userEmail,
              allocatedDate: new Date(),
              remarks: newRemarks,
              details: assignDetails,
            });
          }
        }
      }
      // Scenario 2: Only remarks changed - Log as update
      else if (remarksChanged) {
        let assetIdToSave = toObjectId(oldHardwareAssetId);

        // If toObjectId failed, try to create from string directly
        if (!assetIdToSave && oldHardwareAssetId) {
          const oldHardwareAssetIdStr = typeof oldHardwareAssetId === 'string'
            ? oldHardwareAssetId
            : oldHardwareAssetId?.toString();

          if (oldHardwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(oldHardwareAssetIdStr)) {
            assetIdToSave = new mongoose.Types.ObjectId(oldHardwareAssetIdStr);
          } else {
            console.error('[ERROR] Failed to convert oldHardwareAssetId to ObjectId in remarks update log:', {
              oldHardwareAssetId,
              stringValue: oldHardwareAssetIdStr,
            });
          }
        }

        await HardwareAllocationLog.create({
          hardwareAllocationId: allocationObjectId,
          hardwareAssetId: assetIdToSave || null, // Use null instead of undefined
          userId: toObjectId(userId),
          action: 'update' as const,
          field: 'remarks',
          oldValue: oldRemarks,
          newValue: newRemarks,
          performedBy: companyObjectId,
          performedByName: companyInfo.name,
          performedByEmail: companyInfo.email,
          timestamp: new Date(),
          allocatedToUserId: toObjectId(userId),
          allocatedToUserName: userName,
          allocatedToUserEmail: userEmail,
          details: `Remarks updated`,
        });
      }
    } else {
      // Software allocation update logic - similar to hardware
      // Extract software asset IDs - handle both populated objects and ObjectIds
      const oldSoftwareAssetId = oldAllocation.softwareAssetId?._id || oldAllocation.softwareAssetId;
      const newSoftwareAssetId = newAllocation.softwareAssetId?._id || newAllocation.softwareAssetId;

      // Normalize to strings for comparison
      const oldSoftwareAssetIdStr = oldSoftwareAssetId ? oldSoftwareAssetId.toString() : null;
      const newSoftwareAssetIdStr = newSoftwareAssetId ? newSoftwareAssetId.toString() : null;

      // Fetch software names directly from database
      let oldSoftwareName = 'Unknown Software';
      let newSoftwareName = 'Unknown Software';

      if (oldSoftwareAssetId) {
        const oldSoftware = await SoftwareAsset.findById(oldSoftwareAssetId).select('softwareName vendor').lean();
        oldSoftwareName = oldSoftware?.softwareName || (oldAllocation.softwareAssetId as any)?.softwareName || 'Unknown Software';
      } else {
        oldSoftwareName = (oldAllocation.softwareAssetId as any)?.softwareName || 'Unknown Software';
      }

      if (newSoftwareAssetId) {
        const newSoftware = await SoftwareAsset.findById(newSoftwareAssetId).select('softwareName vendor').lean();
        newSoftwareName = newSoftware?.softwareName || (newAllocation.softwareAssetId as any)?.softwareName || 'Unknown Software';
      } else {
        newSoftwareName = (newAllocation.softwareAssetId as any)?.softwareName || 'Unknown Software';
      }

      const userId = newAllocation.userId?._id || newAllocation.userId || oldAllocation.userId?._id || oldAllocation.userId;
      const userName = (newAllocation.userId as any)?.username || (oldAllocation.userId as any)?.username || 'Unknown';
      const userEmail = (newAllocation.userId as any)?.email || (oldAllocation.userId as any)?.email || '';
      const oldRemarks = oldAllocation.remarks || '';
      const newRemarks = newAllocation.remarks || '';
      const remarksChanged = oldRemarks !== newRemarks;

      // Check if software asset changed
      const softwareAssetChanged = (oldSoftwareAssetIdStr && newSoftwareAssetIdStr &&
        oldSoftwareAssetIdStr !== newSoftwareAssetIdStr) ||
        (oldSoftwareAssetIdStr && !newSoftwareAssetIdStr) ||
        (!oldSoftwareAssetIdStr && newSoftwareAssetIdStr);

      // Extract ObjectIds for logging
      let oldSoftwareAssetIdToSave = toObjectId(oldSoftwareAssetId);
      let newSoftwareAssetIdToSave = toObjectId(newSoftwareAssetId);
      let userIdToSave = toObjectId(userId);

      if (!oldSoftwareAssetIdToSave && oldSoftwareAssetId) {
        const oldSoftwareAssetIdStr = typeof oldSoftwareAssetId === 'string'
          ? oldSoftwareAssetId
          : oldSoftwareAssetId?.toString();
        if (oldSoftwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(oldSoftwareAssetIdStr)) {
          oldSoftwareAssetIdToSave = new mongoose.Types.ObjectId(oldSoftwareAssetIdStr);
        }
      }

      if (!newSoftwareAssetIdToSave && newSoftwareAssetId) {
        const newSoftwareAssetIdStr = typeof newSoftwareAssetId === 'string'
          ? newSoftwareAssetId
          : newSoftwareAssetId?.toString();
        if (newSoftwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(newSoftwareAssetIdStr)) {
          newSoftwareAssetIdToSave = new mongoose.Types.ObjectId(newSoftwareAssetIdStr);
        }
      }

      if (!userIdToSave && userId) {
        const userIdStr = typeof userId === 'string'
          ? userId
          : userId?.toString();
        if (userIdStr && /^[0-9a-fA-F]{24}$/.test(userIdStr)) {
          userIdToSave = new mongoose.Types.ObjectId(userIdStr);
        }
      }

      const allocationObjectId = toObjectId(allocationId);
      const companyObjectId = toObjectId(companyId);

      if (!allocationObjectId || !companyObjectId) {
        console.error('Invalid ObjectId for software allocation update logging:', { allocationId, companyId });
        return;
      }

      // Scenario 1: Software asset changed - Log revoke for old + allocate for new
      if (softwareAssetChanged) {
        // Get allocated date from old allocation for revoke log
        const allocatedDate = oldAllocation.allocatedDate || oldAllocation.assignedDate || new Date();
        const oldLicenseCount = oldAllocation.licenseCount ?? 0;
        const newLicenseCount = newAllocation.licenseCount ?? 0;

        // Log revoke for old software (only if old software exists)
        if (oldSoftwareAssetIdStr && oldSoftwareAssetId && oldSoftwareAssetIdToSave) {
          await SoftwareAllocationLog.create({
            softwareAllocationId: allocationObjectId,
            softwareAssetId: oldSoftwareAssetIdToSave,
            userId: userIdToSave || null,
            action: 'revoke' as const,
            performedBy: companyObjectId,
            performedByName: companyInfo.name,
            performedByEmail: companyInfo.email,
            timestamp: new Date(),
            allocatedToUserId: userIdToSave || null,
            allocatedToUserName: userName,
            allocatedToUserEmail: userEmail,
            allocatedDate: allocatedDate instanceof Date ? allocatedDate : new Date(allocatedDate),
            expiryDate: oldAllocation.expiryDate,
            licenseCount: oldLicenseCount,
            remarks: oldRemarks,
            details: `${oldSoftwareName} was revoked/returned (${oldLicenseCount} license${oldLicenseCount !== 1 ? 's' : ''})`,
          });
        }

        // Log allocate for new software (only if new software exists)
        if (newSoftwareAssetIdStr && newSoftwareAssetId && newSoftwareAssetIdToSave) {
          const allocateDetails = remarksChanged
            ? `${newSoftwareName} was allocated (Remarks: ${newRemarks || 'None'})`
            : `${newSoftwareName} was allocated`;

          await SoftwareAllocationLog.create({
            softwareAllocationId: allocationObjectId,
            softwareAssetId: newSoftwareAssetIdToSave,
            userId: userIdToSave || null,
            action: 'allocate' as const,
            performedBy: companyObjectId,
            performedByName: companyInfo.name,
            performedByEmail: companyInfo.email,
            timestamp: new Date(),
            allocatedToUserId: userIdToSave || null,
            allocatedToUserName: userName,
            allocatedToUserEmail: userEmail,
            allocatedDate: new Date(),
            expiryDate: newAllocation.expiryDate,
            licenseCount: newLicenseCount,
            remarks: newRemarks,
            details: `${allocateDetails} (${newLicenseCount} license${newLicenseCount !== 1 ? 's' : ''})`,
          });
        }
      } else {
        // Scenario 2: Only other fields changed - Log as update with field details
        const updateLogs: any[] = [];
        const logTimestamp = new Date();
        const fieldsToCheck = ['licenseCount', 'expiryDate', 'remarks'];

        for (const field of fieldsToCheck) {
          const oldValue = oldAllocation[field];
          const newValue = newAllocation[field];

          // Skip if this is a customFields change - we handle that separately
          if (field === 'customFields') continue;

          // Handle dates and objects - format dates as dd/mm/yyyy
          const formatDateForLog = (date: Date): string => {
            return date.toLocaleDateString('en-GB', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          };

          const oldVal = oldValue instanceof Date ? formatDateForLog(oldValue) :
            (typeof oldValue === 'object' && oldValue !== null && !(oldValue instanceof Date) ? JSON.stringify(oldValue) : (oldValue?.toString() || ''));
          const newVal = newValue instanceof Date ? formatDateForLog(newValue) :
            (typeof newValue === 'object' && newValue !== null && !(newValue instanceof Date) ? JSON.stringify(newValue) : (newValue?.toString() || ''));

          if (oldVal !== newVal) {
            updateLogs.push({
              field,
              oldValue: oldVal,
              newValue: newVal,
              details: `Software allocation updated: ${field} changed from "${oldVal || 'Empty'}" to "${newVal || 'Empty'}"`
            });
          }
        }

        // Check for custom fields changes using smart rename detection
        const oldCustomFields = decryptCustomFields(oldAllocation);
        const newCustomFields = decryptCustomFields(newAllocation);

        // Also check for legacy unencrypted customFields
        const oldLegacyFields = oldAllocation.customFields || {};
        const newLegacyFields = newAllocation.customFields || {};

        // Combine encrypted and legacy fields (encrypted takes priority)
        const combinedOldFields = { ...oldLegacyFields, ...oldCustomFields };
        const combinedNewFields = { ...newLegacyFields, ...newCustomFields };

        console.log('DEBUG - Custom Fields Logging:', {
          oldCustomFields,
          newCustomFields,
          oldLegacyFields,
          newLegacyFields,
          combinedOldFields,
          combinedNewFields
        });

        // Only proceed if we have actual custom fields data
        const hasOldCustomFields = Object.keys(combinedOldFields).length > 0;
        const hasNewCustomFields = Object.keys(combinedNewFields).length > 0;

        if (hasOldCustomFields || hasNewCustomFields) {
          const oldKeys = Object.keys(combinedOldFields);
          const newKeys = Object.keys(combinedNewFields);

          const removedKeys = oldKeys.filter(k => !newKeys.includes(k));
          const addedKeys = newKeys.filter(k => !oldKeys.includes(k));
          const commonKeys = oldKeys.filter(k => newKeys.includes(k));

          console.log('DEBUG - Key Analysis:', {
            oldKeys,
            newKeys,
            removedKeys,
            addedKeys,
            commonKeys
          });

          // Smart Rename Detection - try to pair removed keys with added keys
          if (removedKeys.length === 1 && addedKeys.length === 1 && commonKeys.length === 0) {
            const oldK = removedKeys[0];
            const newK = addedKeys[0];

            console.log('DEBUG - Smart Rename Detected:', { oldK, newK });

            // Show the complete configuration change (key: value format)
            const oldConfig = `${oldK}: ${combinedOldFields[oldK]}`;
            const newConfig = `${newK}: ${combinedNewFields[newK]}`;

            updateLogs.push({
              field: 'Software Configuration',
              oldValue: oldConfig,
              newValue: newConfig,
              details: `Configuration updated from "${oldConfig}" to "${newConfig}"`
            });
          } else {
            console.log('DEBUG - Using improved multiple fields logging');
            
            // For multiple fields, show each complete configuration field change
            // First, let's try to intelligently pair old and new fields
            const processedOldKeys = new Set();
            const processedNewKeys = new Set();
            
            // Try to pair fields that might be renames (similar keys or values)
            for (const oldKey of removedKeys) {
              if (processedOldKeys.has(oldKey)) continue;
              
              const oldValue = combinedOldFields[oldKey];
              let bestMatch = null;
              let bestScore = 0;
              
              // Look for potential matches in added keys
              for (const newKey of addedKeys) {
                if (processedNewKeys.has(newKey)) continue;
                
                const newValue = combinedNewFields[newKey];
                let score = 0;
                
                // Score based on key similarity
                if (oldKey.includes(newKey) || newKey.includes(oldKey)) score += 2;
                // Score based on value similarity  
                if (oldValue === newValue) score += 3;
                // Score based on partial value match
                if (oldValue && newValue && (oldValue.includes(newValue) || newValue.includes(oldValue))) score += 1;
                
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = newKey;
                }
              }
              
              if (bestMatch && bestScore > 0) {
                // Found a likely pair - log as configuration update
                const oldConfig = `${oldKey}: ${oldValue}`;
                const newConfig = `${bestMatch}: ${combinedNewFields[bestMatch]}`;
                
                updateLogs.push({
                  field: 'Software Configuration',
                  oldValue: oldConfig,
                  newValue: newConfig,
                  details: `Configuration updated from "${oldConfig}" to "${newConfig}"`
                });
                
                processedOldKeys.add(oldKey);
                processedNewKeys.add(bestMatch);
              }
            }
            
            // Handle remaining removals (no matches found)
            for (const oldKey of removedKeys) {
              if (processedOldKeys.has(oldKey)) continue;
              
              const oldConfig = `${oldKey}: ${combinedOldFields[oldKey]}`;
              updateLogs.push({
                field: 'Software Configuration',
                oldValue: oldConfig,
                newValue: 'Removed',
                details: `Configuration "${oldConfig}" was removed`
              });
            }
            
            // Handle remaining additions (no matches found)
            for (const newKey of addedKeys) {
              if (processedNewKeys.has(newKey)) continue;
              
              const newConfig = `${newKey}: ${combinedNewFields[newKey]}`;
              updateLogs.push({
                field: 'Software Configuration',
                oldValue: 'Not Set',
                newValue: newConfig,
                details: `Configuration "${newConfig}" was added`
              });
            }
            
            // Handle value updates for fields with same keys
            for (const key of commonKeys) {
              const oldValue = combinedOldFields[key];
              const newValue = combinedNewFields[key];
              
              if (oldValue !== newValue) {
                const oldConfig = `${key}: ${oldValue}`;
                const newConfig = `${key}: ${newValue}`;
                
                updateLogs.push({
                  field: 'Software Configuration',
                  oldValue: oldConfig,
                  newValue: newConfig,
                  details: `Configuration value updated from "${oldConfig}" to "${newConfig}"`
                });
              }
            }
          }
        }

        // Process all collected updates with a UNIFIED timestamp to ensure grouping in the UI
        for (const logData of updateLogs) {
          await SoftwareAllocationLog.create({
            softwareAllocationId: allocationObjectId,
            softwareAssetId: newSoftwareAssetIdToSave || oldSoftwareAssetIdToSave || null,
            userId: userIdToSave || null,
            action: 'update' as const,
            field: logData.field,
            oldValue: logData.oldValue || 'Empty',
            newValue: logData.newValue || 'Empty',
            performedBy: companyObjectId,
            performedByName: companyInfo.name,
            performedByEmail: companyInfo.email,
            timestamp: logTimestamp, // Use shared timestamp
            allocatedToUserId: userIdToSave || null,
            allocatedToUserName: userName,
            allocatedToUserEmail: userEmail,
            allocatedDate: oldAllocation.allocatedDate || oldAllocation.assignedDate || new Date(),
            expiryDate: newAllocation.expiryDate || oldAllocation.expiryDate,
            licenseCount: newAllocation.licenseCount ?? oldAllocation.licenseCount ?? 0,
            remarks: newRemarks || oldRemarks,
            details: logData.details,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Failed to log ${type} allocation update:`, error);
  }
}

/**
 * Log hardware/software allocation deletion (not used currently, but available)
 */
export async function logAllocationDelete(
  type: 'hardware' | 'software',
  allocationId: string,
  allocation: any,
  req: AuthRequest
): Promise<void> {
  try {
    const companyId = req.user?.id;
    if (!companyId) {
      console.error('Cannot log allocation deletion: companyId is missing');
      return;
    }
    const companyInfo = await getCompanyInfo(companyId);

    if (type === 'hardware') {
      const allocationObjectId = toObjectId(allocationId);
      const companyObjectId = toObjectId(companyId);

      if (!allocationObjectId || !companyObjectId) {
        console.error('Invalid ObjectId for allocation deletion logging:', { allocationId, companyId });
        return;
      }

      // Extract hardwareAssetId - handle both populated objects and ObjectIds
      const hardwareAssetId = allocation.hardwareAssetId?._id || allocation.hardwareAssetId;
      let assetIdToSave = toObjectId(hardwareAssetId);

      // If toObjectId failed, try to create from string directly
      if (!assetIdToSave && hardwareAssetId) {
        const hardwareAssetIdStr = typeof hardwareAssetId === 'string'
          ? hardwareAssetId
          : hardwareAssetId?.toString();

        if (hardwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(hardwareAssetIdStr)) {
          assetIdToSave = new mongoose.Types.ObjectId(hardwareAssetIdStr);
        } else {
          console.error('[ERROR] Failed to convert hardwareAssetId to ObjectId in logAllocationDelete:', {
            hardwareAssetId: allocation.hardwareAssetId,
            extracted: hardwareAssetId,
            stringValue: hardwareAssetIdStr,
          });
        }
      }

      await HardwareAllocationLog.create({
        hardwareAllocationId: allocationObjectId,
        hardwareAssetId: assetIdToSave || null, // Use null instead of undefined
        userId: toObjectId(allocation.userId),
        action: 'delete' as const,
        performedBy: companyObjectId,
        performedByName: companyInfo.name,
        performedByEmail: companyInfo.email,
        timestamp: new Date(),
        details: 'Hardware allocation deleted',
      });
    } else {
      // Extract softwareAssetId - handle both populated objects and ObjectIds
      const softwareAssetId = allocation.softwareAssetId?._id || allocation.softwareAssetId;
      let assetIdToSave = toObjectId(softwareAssetId);

      // If toObjectId failed, try to create from string directly
      if (!assetIdToSave && softwareAssetId) {
        const softwareAssetIdStr = typeof softwareAssetId === 'string'
          ? softwareAssetId
          : softwareAssetId?.toString();

        if (softwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(softwareAssetIdStr)) {
          assetIdToSave = new mongoose.Types.ObjectId(softwareAssetIdStr);
        }
      }

      // Extract userId - handle both populated objects and ObjectIds
      const userId = allocation.userId?._id || allocation.userId;
      let userIdToSave = toObjectId(userId);

      // If toObjectId failed, try to create from string directly
      if (!userIdToSave && userId) {
        const userIdStr = typeof userId === 'string'
          ? userId
          : userId?.toString();

        if (userIdStr && /^[0-9a-fA-F]{24}$/.test(userIdStr)) {
          userIdToSave = new mongoose.Types.ObjectId(userIdStr);
        }
      }

      const allocationObjectId = toObjectId(allocationId);
      const companyObjectId = toObjectId(companyId);

      if (!allocationObjectId || !companyObjectId) {
        console.error('Invalid ObjectId for software allocation deletion logging:', { allocationId, companyId });
        return;
      }

      await SoftwareAllocationLog.create({
        softwareAllocationId: allocationObjectId,
        softwareAssetId: assetIdToSave || null,
        userId: userIdToSave || null,
        action: 'delete' as const,
        performedBy: companyObjectId,
        performedByName: companyInfo.name,
        performedByEmail: companyInfo.email,
        timestamp: new Date(),
        details: 'Software allocation deleted',
      });
    }
  } catch (error) {
    console.error(`Failed to log ${type} allocation deletion:`, error);
  }
}

/**
 * Log hardware/software allocation return/revoke
 */
export async function logAllocationReturn(
  type: 'hardware' | 'software',
  allocationId: string,
  allocation: any,
  req: AuthRequest
): Promise<void> {
  try {
    const companyId = req.user?.id;
    if (!companyId) {
      console.error('Cannot log allocation return: companyId is missing');
      return;
    }
    const companyInfo = await getCompanyInfo(companyId);

    if (type === 'hardware') {
      const allocationObjectId = toObjectId(allocationId);
      const companyObjectId = toObjectId(companyId);

      if (!allocationObjectId || !companyObjectId) {
        console.error('Invalid ObjectId for allocation return logging:', { allocationId, companyId });
        return;
      }

      // Extract hardwareAssetId - handle both populated objects and ObjectIds
      const hardwareAssetId = allocation.hardwareAssetId?._id || allocation.hardwareAssetId;
      let assetIdToSave = toObjectId(hardwareAssetId);

      // If toObjectId failed, try to create from string directly
      if (!assetIdToSave && hardwareAssetId) {
        const hardwareAssetIdStr = typeof hardwareAssetId === 'string'
          ? hardwareAssetId
          : hardwareAssetId?.toString();

        if (hardwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(hardwareAssetIdStr)) {
          assetIdToSave = new mongoose.Types.ObjectId(hardwareAssetIdStr);
        } else {
          console.error('[ERROR] Failed to convert hardwareAssetId to ObjectId in logAllocationReturn:', {
            hardwareAssetId: allocation.hardwareAssetId,
            extracted: hardwareAssetId,
            stringValue: hardwareAssetIdStr,
          });
        }
      }

      await HardwareAllocationLog.create({
        hardwareAllocationId: allocationObjectId,
        hardwareAssetId: assetIdToSave || null, // Use null instead of undefined
        userId: toObjectId(allocation.userId),
        action: 'return' as const,
        performedBy: companyObjectId,
        performedByName: companyInfo.name,
        performedByEmail: companyInfo.email,
        timestamp: new Date(),
        allocatedToUserId: toObjectId(allocation.userId),
        allocatedToUserName: (allocation.userId as any)?.username || 'Unknown',
        allocatedToUserEmail: (allocation.userId as any)?.email || '',
        allocatedDate: allocation.assignedDate || allocation.createdAt,
        returnedDate: new Date(),
        remarks: allocation.remarks,
        details: `Hardware asset returned by ${(allocation.userId as any)?.username || 'user'}`,
      });
    } else {
      // Extract softwareAssetId - handle both populated objects and ObjectIds
      const softwareAssetId = allocation.softwareAssetId?._id || allocation.softwareAssetId;
      let assetIdToSave = toObjectId(softwareAssetId);

      // If toObjectId failed, try to create from string directly
      if (!assetIdToSave && softwareAssetId) {
        const softwareAssetIdStr = typeof softwareAssetId === 'string'
          ? softwareAssetId
          : softwareAssetId?.toString();

        if (softwareAssetIdStr && /^[0-9a-fA-F]{24}$/.test(softwareAssetIdStr)) {
          assetIdToSave = new mongoose.Types.ObjectId(softwareAssetIdStr);
        }
      }

      // Extract userId - handle both populated objects and ObjectIds
      const userId = allocation.userId?._id || allocation.userId;
      let userIdToSave = toObjectId(userId);

      // If toObjectId failed, try to create from string directly
      if (!userIdToSave && userId) {
        const userIdStr = typeof userId === 'string'
          ? userId
          : userId?.toString();

        if (userIdStr && /^[0-9a-fA-F]{24}$/.test(userIdStr)) {
          userIdToSave = new mongoose.Types.ObjectId(userIdStr);
        }
      }

      const allocationObjectId = toObjectId(allocationId);
      const companyObjectId = toObjectId(companyId);

      if (!allocationObjectId || !companyObjectId) {
        console.error('Invalid ObjectId for software allocation return logging:', { allocationId, companyId });
        return;
      }

      await SoftwareAllocationLog.create({
        softwareAllocationId: allocationObjectId,
        softwareAssetId: assetIdToSave || null,
        userId: userIdToSave || null,
        action: 'revoke' as const,
        performedBy: companyObjectId,
        performedByName: companyInfo.name,
        performedByEmail: companyInfo.email,
        timestamp: new Date(),
        allocatedToUserId: userIdToSave || null,
        allocatedToUserName: (allocation.userId as any)?.username || 'Unknown',
        allocatedToUserEmail: (allocation.userId as any)?.email || '',
        allocatedDate: allocation.assignedDate || allocation.createdAt,
        expiryDate: allocation.expiryDate,
        licenseCount: allocation.licenseCount,
        remarks: allocation.remarks,
        details: `Software allocation revoked from ${(allocation.userId as any)?.username || 'user'}`,
      });
    }
  } catch (error) {
    console.error(`Failed to log ${type} allocation return:`, error);
  }
}
