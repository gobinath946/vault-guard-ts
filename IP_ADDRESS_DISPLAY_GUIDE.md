# IP Address Capture and Display Guide

## ✅ IP Address is Already Implemented

Your audit logging system **already captures and displays IP addresses** for all activities. Here's how it works:

---

## 🔍 Where IP Addresses Are Captured

### 1. Backend - IP Extraction
**File**: `backend/src/utils/auditLogger.ts`

```typescript
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
```

**What it captures**:
- Real IP from `x-forwarded-for` header (for proxies/load balancers)
- Real IP from `x-real-ip` header
- Direct connection IP from socket
- Falls back to 'unknown' if IP cannot be determined

### 2. Backend - IP Storage
**File**: `backend/src/models/AuditLog.ts`

```typescript
ipAddress: {
  type: String,
  required: true,
}
```

Every audit log entry stores the IP address in the database.

---

## 📺 Where IP Addresses Are Displayed

### Frontend - Audit Trail Display
**File**: `src/pages/password-creation.tsx`

When you click the **History** icon on any password, the dialog shows:

```
┌─────────────────────────────────────────────────────────┐
│  Password Activity Logs                                 │
│  Gmail Account - Complete history of changes and access │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Audit Trail                                         │
│  Detailed access logs including IP addresses and        │
│  locations                                              │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ [VIEW PASSWORD]        Nov 28, 2025, 10:30:45 AM │ │
│  │                                                   │ │
│  │ User: John Doe (john@company.com)                │ │
│  │ IP Address: 203.0.113.45          ◄─── HERE!    │ │
│  │ Location: New York, New York, United States      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ [COPY PASSWORD]        Nov 28, 2025, 10:31:12 AM │ │
│  │                                                   │ │
│  │ User: John Doe (john@company.com)                │ │
│  │ IP Address: 203.0.113.45          ◄─── HERE!    │ │
│  │ Location: New York, New York, United States      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 How to See IP Addresses

### Step-by-Step Guide:

1. **Navigate to Password Page**
   - Go to your password management page

2. **Click History Icon**
   - Find any password in the list
   - Click the clock/history icon (⏱️) next to it

3. **View Audit Trail**
   - The dialog opens with two sections
   - Look at the **"Audit Trail"** section at the top

4. **See IP Address**
   - Each audit log entry shows:
     - Action type (VIEW PASSWORD, COPY USERNAME, etc.)
     - Timestamp
     - **User name and email**
     - **IP Address** ← This is where you see it!
     - **Location** (derived from IP)

---

## 📊 Example Audit Log Entry

```
┌─────────────────────────────────────────────────────────┐
│ [COPY PASSWORD]              Nov 28, 2025, 10:30:45 AM │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ User: John Doe (john@company.com)                       │
│ IP Address: 203.0.113.45                                │
│ Location: New York, New York, United States             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 IP Address Capture for Different Actions

### 1. Login
```typescript
// backend/src/controllers/authController.ts
const ipAddress = getClientIP(req);
logLoginActivity(userId, email, userName, role, companyId, ipAddress, userAgent);
```
**Result**: IP captured and stored in audit log

### 2. View Username/Password
```typescript
// backend/src/controllers/passwordController.ts
const ipAddress = getClientIP(req);
logPasswordActivity(userId, email, userName, role, companyId, 'view_username', 
                   passwordId, passwordName, ipAddress, userAgent);
```
**Result**: IP captured and stored in audit log

### 3. Copy Username/Password
```typescript
// backend/src/controllers/passwordController.ts
const ipAddress = getClientIP(req);
logPasswordActivity(userId, email, userName, role, companyId, 'copy_password', 
                   passwordId, passwordName, ipAddress, userAgent);
```
**Result**: IP captured and stored in audit log

### 4. Edit Password
```typescript
// backend/src/controllers/passwordController.ts
const ipAddress = getClientIP(req);
logPasswordEdit(userId, email, userName, role, companyId, passwordId, 
               passwordName, changes, ipAddress, userAgent);
```
**Result**: IP captured and stored in audit log

---

## 🌐 IP Address Types Handled

### Public IP Addresses
```
Example: 203.0.113.45
Display: 203.0.113.45
Location: New York, New York, United States
```

### Private/Local IP Addresses
```
Example: 192.168.1.100 or 127.0.0.1
Display: 192.168.1.100
Location: Local
```

### Behind Proxy/Load Balancer
```
Header: x-forwarded-for: 203.0.113.45, 10.0.0.1
Captured: 203.0.113.45 (first IP in chain)
Display: 203.0.113.45
Location: New York, New York, United States
```

### IPv6 Addresses
```
Example: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
Display: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
Location: (Geolocation service will attempt to resolve)
```

---

## 🧪 Testing IP Address Capture

### Test 1: View Your Own IP
1. Log in to the application
2. View or copy a password
3. Click History icon
4. Check the Audit Trail section
5. You should see your current IP address

### Test 2: Check Database
```javascript
// In MongoDB
db.auditlogs.find().pretty()

// You should see:
{
  "_id": ObjectId("..."),
  "ipAddress": "203.0.113.45",  // ← Your IP here
  "location": {
    "country": "United States",
    "region": "New York",
    "city": "New York"
  },
  // ... other fields
}
```

### Test 3: Different Locations
1. Access from different networks (home, office, mobile)
2. Each should show different IP addresses
3. Locations should update accordingly

---

## 🔍 Troubleshooting

### Issue: IP shows as "unknown"
**Possible Causes**:
- Request object doesn't have IP information
- All IP extraction methods failed

**Solution**:
- Check if you're behind a proxy
- Verify proxy headers are being forwarded
- Check server logs for IP extraction errors

### Issue: IP shows as "::1" or "127.0.0.1"
**Cause**: Accessing from localhost

**Solution**: This is normal for local development. In production, you'll see real IPs.

### Issue: Wrong IP displayed
**Cause**: Proxy/load balancer not configured correctly

**Solution**: 
- Ensure `x-forwarded-for` header is set
- Configure your proxy to forward real client IP
- Check nginx/Apache configuration

---

## 📝 Database Query Examples

### Get all audit logs with IP addresses
```javascript
db.auditlogs.find({}, { ipAddress: 1, userName: 1, action: 1, timestamp: 1 })
```

### Find logs from specific IP
```javascript
db.auditlogs.find({ ipAddress: "203.0.113.45" })
```

### Find logs from specific country
```javascript
db.auditlogs.find({ "location.country": "United States" })
```

### Count actions by IP
```javascript
db.auditlogs.aggregate([
  { $group: { _id: "$ipAddress", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

---

## ✅ Summary

**IP Address Capture**: ✅ Fully Implemented
- Captured from request headers
- Handles proxies and load balancers
- Stored in database with every audit log

**IP Address Display**: ✅ Fully Implemented
- Shown in Audit Trail section
- Displayed alongside user info and location
- Visible in activity log dialog

**Geolocation**: ✅ Fully Implemented
- Automatic location lookup from IP
- Shows country, region, city
- Cached for performance

---

## 🎯 Where to Look

1. **Frontend Display**: 
   - Password page → Click History icon → See "IP Address" field

2. **Backend Code**:
   - `backend/src/utils/auditLogger.ts` → `getClientIP()` function

3. **Database**:
   - Collection: `auditlogs`
   - Field: `ipAddress`

4. **API Response**:
   - Endpoint: `GET /api/passwords/:id/audit-logs`
   - Response includes `ipAddress` field

---

**Your IP address capture and display is fully functional!** 🎉

Just click the History icon on any password to see the IP addresses in the Audit Trail section.
