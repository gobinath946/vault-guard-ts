import AuditLog from '../models/AuditLog';
import axios from 'axios';

interface LocationData {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// Cache for IP location lookups to avoid repeated API calls
const locationCache = new Map<string, LocationData>();

/**
 * Get location data from IP address using ip-api.com (free, no API key required)
 */
async function getLocationFromIP(ipAddress: string): Promise<LocationData> {
  // Check cache first
  if (locationCache.has(ipAddress)) {
    return locationCache.get(ipAddress)!;
  }

  // Skip location lookup for localhost/private IPs
  if (
    ipAddress === '127.0.0.1' ||
    ipAddress === '::1' ||
    ipAddress === 'localhost' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.')
  ) {
    const localLocation: LocationData = {
      country: 'Local',
      region: 'Local',
      city: 'Local',
    };
    locationCache.set(ipAddress, localLocation);
    return localLocation;
  }

  try {
    // Using ip-api.com free tier (no API key needed, 45 requests/minute limit)
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}`, {
      timeout: 3000,
    });

    if (response.data && response.data.status === 'success') {
      const location: LocationData = {
        country: response.data.country,
        region: response.data.regionName,
        city: response.data.city,
        latitude: response.data.lat,
        longitude: response.data.lon,
      };
      
      // Cache the result
      locationCache.set(ipAddress, location);
      return location;
    }
  } catch (error) {
    console.error('Failed to fetch location from IP:', error);
  }

  // Return empty location if lookup fails
  const emptyLocation: LocationData = {};
  locationCache.set(ipAddress, emptyLocation);
  return emptyLocation;
}

/**
 * Extract IP address from request
 */
export function getClientIP(req: any): string {
  // Check various headers for the real IP (in case of proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }

  return (
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * Log user login activity
 */
export async function logLoginActivity(
  userId: string,
  userEmail: string,
  userName: string,
  userRole: string,
  companyId: string,
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  try {
    const location = await getLocationFromIP(ipAddress);

    await AuditLog.create({
      userId,
      userEmail,
      userName,
      userRole,
      companyId,
      action: 'login',
      ipAddress,
      location,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log login activity:', error);
  }
}

/**
 * Log password view/copy activity
 */
export async function logPasswordActivity(
  userId: string,
  userEmail: string,
  userName: string,
  userRole: string,
  companyId: string,
  action: 'view_username' | 'copy_username' | 'view_password' | 'copy_password',
  passwordId: string,
  passwordName: string,
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  try {
    const location = await getLocationFromIP(ipAddress);

    await AuditLog.create({
      userId,
      userEmail,
      userName,
      userRole,
      companyId,
      action,
      resourceType: 'password',
      resourceId: passwordId,
      resourceName: passwordName,
      ipAddress,
      location,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log password activity:', error);
  }
}

/**
 * Log password edit activity (only when actual changes are made)
 */
export async function logPasswordEdit(
  userId: string,
  userEmail: string,
  userName: string,
  userRole: string,
  companyId: string,
  passwordId: string,
  passwordName: string,
  changes: { field: string; oldValue?: string; newValue?: string }[],
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  try {
    // Only log if there are actual changes
    if (changes.length === 0) {
      return;
    }

    const location = await getLocationFromIP(ipAddress);

    await AuditLog.create({
      userId,
      userEmail,
      userName,
      userRole,
      companyId,
      action: 'edit_password',
      resourceType: 'password',
      resourceId: passwordId,
      resourceName: passwordName,
      changes,
      ipAddress,
      location,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log password edit:', error);
  }
}

/**
 * Get audit logs for a specific resource
 */
export async function getAuditLogsForResource(
  resourceId: string,
  limit: number = 100
) {
  try {
    return await AuditLog.find({ resourceId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a user
 */
export async function getAuditLogsForUser(
  userId: string,
  limit: number = 100
) {
  try {
    return await AuditLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a company
 */
export async function getAuditLogsForCompany(
  companyId: string,
  limit: number = 100,
  skip: number = 0
) {
  try {
    const logs = await AuditLog.find({ companyId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AuditLog.countDocuments({ companyId });

    return { logs, total };
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return { logs: [], total: 0 };
  }
}
