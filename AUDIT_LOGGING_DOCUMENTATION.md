# Audit Logging System Documentation

## Overview

The audit logging system provides comprehensive tracking of all password-related activities including login events, view/copy actions, and edit operations. All logs include IP addresses, geolocation data, and timestamps.

## Features

### 1. Login Activity Tracking
- **What's Logged**: Every user login attempt
- **Data Captured**:
  - User ID, email, name, and role
  - Company ID
  - IP address
  - Geographic location (country, region, city, coordinates)
  - User agent (browser/device information)
  - Exact timestamp

### 2. Password View/Copy Tracking
- **What's Logged**: 
  - When a user views a username
  - When a user copies a username
  - When a user views a password
  - When a user copies a password
- **Data Captured**:
  - User information (ID, email, name, role)
  - Password resource (ID and name)
  - IP address and location
  - User agent
  - Exact timestamp

### 3. Password Edit Tracking
- **What's Logged**: Only when actual changes are made to a password
- **Smart Detection**: 
  - No log is created if user opens edit form but makes no changes
  - Logs are created only when fields are actually modified
- **Data Captured**:
  - User information
  - Password resource
  - Detailed change information (field name, old value, new value)
  - IP address and location
  - User agent
  - Exact timestamp

## Database Schema

### AuditLog Model
```typescript
{
  userId: ObjectId,              // User who performed the action
  userEmail: string,             // User's email
  userName: string,              // User's display name
  userRole: string,              // User's role (master_admin, company_super_admin, company_user)
  companyId: ObjectId,           // Company ID
  action: string,                // Action type (login, view_username, copy_username, view_password, copy_password, edit_password)
  resourceType: string,          // Type of resource (password)
  resourceId: ObjectId,          // ID of the resource
  resourceName: string,          // Name of the resource
  ipAddress: string,             // IP address of the user
  location: {                    // Geographic location from IP
    country: string,
    region: string,
    city: string,
    latitude: number,
    longitude: number
  },
  userAgent: string,             // Browser/device information
  changes: [{                    // Array of changes (for edit actions)
    field: string,
    oldValue: string,
    newValue: string
  }],
  timestamp: Date,               // When the action occurred
  metadata: Mixed                // Additional metadata
}
```

## API Endpoints

### Audit Logging Endpoints

#### 1. Log View Username
```
POST /api/passwords/audit/view-username
Body: {
  passwordId: string,
  passwordName: string
}
```

#### 2. Log Copy Username
```
POST /api/passwords/audit/copy-username
Body: {
  passwordId: string,
  passwordName: string
}
```

#### 3. Log View Password
```
POST /api/passwords/audit/view-password
Body: {
  passwordId: string,
  passwordName: string
}
```

#### 4. Log Copy Password
```
POST /api/passwords/audit/copy-password
Body: {
  passwordId: string,
  passwordName: string
}
```

#### 5. Get Password Audit Logs
```
GET /api/passwords/:id/audit-logs?limit=100
```

## Frontend Integration

### Service Layer
The `auditService` provides methods to log activities:

```typescript
import { auditService } from '@/services/auditService';

// Log view username
await auditService.logViewUsername(passwordId, passwordName);

// Log copy username
await auditService.logCopyUsername(passwordId, passwordName);

// Log view password
await auditService.logViewPassword(passwordId, passwordName);

// Log copy password
await auditService.logCopyPassword(passwordId, passwordName);

// Get audit logs
const logs = await auditService.getPasswordAuditLogs(passwordId, limit);
```

### Automatic Logging
The system automatically logs:
- **Login events**: Triggered in the auth controller when users log in
- **View actions**: Triggered when users click the eye icon to view username/password
- **Copy actions**: Triggered when users click the copy icon
- **Edit actions**: Triggered in the update controller when actual changes are saved

## Viewing Audit Logs

### In the Password Activity Dialog
1. Click the History icon next to any password
2. The dialog shows two sections:
   - **Audit Trail**: Detailed access logs with IP and location
   - **Change History**: Record of password modifications

### Audit Log Display
Each audit log entry shows:
- Action type (with color-coded badge)
- Timestamp
- User information (name and email)
- IP address
- Geographic location (city, region, country)
- Changes made (for edit actions)

## IP Geolocation

### Service Used
- **Provider**: ip-api.com (free tier)
- **Rate Limit**: 45 requests per minute
- **Caching**: IP locations are cached to minimize API calls

### Handling Local/Private IPs
- Localhost (127.0.0.1, ::1) is labeled as "Local"
- Private IPs (192.168.x.x, 10.x.x.x, 172.x.x.x) are labeled as "Local"
- Failed lookups return empty location data

## Security Considerations

### Data Protection
- Sensitive field values (passwords) are never stored in plain text in audit logs
- Only field names and "changed" indicators are logged for password fields
- Username changes are logged but values are not exposed in audit trail

### Access Control
- Users can only view audit logs for passwords they have access to
- Same permission system applies to audit logs as to passwords
- Master admins can view all audit logs
- Company super admins can view logs for their company
- Company users can view logs for passwords they have permission to access

## Performance Optimization

### Asynchronous Logging
- All audit logging is performed asynchronously
- Logging failures don't block user operations
- Errors are logged to console but don't affect user experience

### Caching
- IP geolocation results are cached in memory
- Reduces API calls and improves performance
- Cache persists for the lifetime of the server process

### Indexing
The AuditLog collection has indexes on:
- `userId` + `timestamp`
- `companyId` + `timestamp`
- `resourceId` + `timestamp`
- `action` + `timestamp`

These indexes ensure fast queries even with large datasets.

## Backend Files

### New Files Created
1. **`backend/src/models/AuditLog.ts`**: Mongoose model for audit logs
2. **`backend/src/utils/auditLogger.ts`**: Utility functions for logging activities

### Modified Files
1. **`backend/src/controllers/authController.ts`**: Added login activity logging
2. **`backend/src/controllers/passwordController.ts`**: 
   - Added audit logging endpoints
   - Modified update function to track changes
   - Added helper functions for user name retrieval
3. **`backend/src/routes/passwordRoutes.ts`**: Added audit logging routes

## Frontend Files

### New Files Created
1. **`src/services/auditService.ts`**: Service for audit logging API calls

### Modified Files
1. **`src/pages/password-creation.tsx`**: 
   - Integrated audit logging for view/copy actions
   - Updated logs dialog to display audit trail
   - Added state management for audit logs

## Usage Examples

### Example 1: Viewing Audit Logs
```typescript
// Get audit logs for a password
const auditLogs = await auditService.getPasswordAuditLogs(passwordId, 100);

// Display logs
auditLogs.forEach(log => {
  console.log(`${log.action} by ${log.userName} from ${log.ipAddress}`);
  console.log(`Location: ${log.location.city}, ${log.location.country}`);
  console.log(`Time: ${new Date(log.timestamp).toLocaleString()}`);
});
```

### Example 2: Tracking Password Changes
When a user updates a password, the system automatically:
1. Compares old and new values for each field
2. Creates log entries only for changed fields
3. Logs the changes to both PasswordLog and AuditLog
4. Captures IP address and location
5. Returns success to the user

## Troubleshooting

### Issue: Location not showing
- **Cause**: IP geolocation API might be down or rate-limited
- **Solution**: Check console for errors, wait a minute and try again

### Issue: Audit logs not appearing
- **Cause**: Async logging might have failed silently
- **Solution**: Check server console logs for error messages

### Issue: Duplicate logs
- **Cause**: Multiple rapid clicks on view/copy buttons
- **Solution**: This is expected behavior - each action is logged

## Future Enhancements

Potential improvements:
1. Add filtering and search capabilities for audit logs
2. Export audit logs to CSV/PDF
3. Set up alerts for suspicious activities
4. Add retention policies for old audit logs
5. Implement real-time audit log streaming
6. Add dashboard with audit statistics and charts

## Compliance

This audit logging system helps meet compliance requirements for:
- **SOC 2**: Detailed access logs and change tracking
- **GDPR**: User activity tracking and data access logs
- **HIPAA**: Audit trails for sensitive data access
- **ISO 27001**: Security event logging and monitoring
