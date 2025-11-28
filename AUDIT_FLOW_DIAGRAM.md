# Audit Logging Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  1. Login                                │
        │  2. View Username (click eye icon)       │
        │  3. Copy Username (click copy icon)      │
        │  4. View Password (click eye icon)       │
        │  5. Copy Password (click copy icon)      │
        │  6. Edit Password (save changes)         │
        └─────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                              │
│  (src/pages/password-creation.tsx)                              │
│  (src/services/auditService.ts)                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    API Call with JWT Token
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                               │
│  (backend/src/routes/passwordRoutes.ts)                         │
│  (backend/src/controllers/passwordController.ts)                │
│  (backend/src/controllers/authController.ts)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Extract IP Address
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   GEOLOCATION SERVICE                            │
│  (backend/src/utils/auditLogger.ts)                            │
│                                                                  │
│  1. Check cache for IP location                                 │
│  2. If not cached, call ip-api.com                             │
│  3. Cache the result                                            │
│  4. Return location data                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Create Audit Log Entry
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                              │
│  (backend/src/models/AuditLog.ts)                               │
│                                                                  │
│  MongoDB Collection: auditlogs                                   │
│  {                                                               │
│    userId, userEmail, userName, userRole,                       │
│    companyId, action, resourceId, resourceName,                 │
│    ipAddress, location, userAgent, timestamp                    │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Flow for Each Action

### 1. Login Flow

```
User enters credentials
        │
        ▼
Frontend: authService.login()
        │
        ▼
Backend: authController.login()
        │
        ├─► Validate credentials
        ├─► Generate JWT token
        ├─► Extract IP address (getClientIP)
        ├─► Get location from IP (ip-api.com)
        ├─► Create audit log (logLoginActivity)
        │   └─► Save to auditlogs collection
        │
        ▼
Return token to frontend
        │
        ▼
User is logged in
```

### 2. View Username Flow

```
User clicks eye icon on username
        │
        ▼
Frontend: toggleUsernameVisibility()
        │
        ├─► Fetch decrypted password (passwordService.getById)
        ├─► Display username
        ├─► Log action (auditService.logViewUsername)
        │
        ▼
Backend: logViewUsername endpoint
        │
        ├─► Extract IP address
        ├─► Get location from IP
        ├─► Get user name
        ├─► Create audit log (logPasswordActivity)
        │   └─► Save to auditlogs collection
        │
        ▼
Return success
```

### 3. Copy Username Flow

```
User clicks copy icon on username
        │
        ▼
Frontend: copyToClipboard()
        │
        ├─► Copy to clipboard
        ├─► Show toast notification
        ├─► Log action (auditService.logCopyUsername)
        │
        ▼
Backend: logCopyUsername endpoint
        │
        ├─► Extract IP address
        ├─► Get location from IP
        ├─► Get user name
        ├─► Create audit log (logPasswordActivity)
        │   └─► Save to auditlogs collection
        │
        ▼
Return success
```

### 4. View Password Flow

```
User clicks eye icon on password
        │
        ▼
Frontend: togglePasswordVisibility()
        │
        ├─► Fetch decrypted password (passwordService.getById)
        ├─► Display password
        ├─► Log action (auditService.logViewPassword)
        │
        ▼
Backend: logViewPassword endpoint
        │
        ├─► Extract IP address
        ├─► Get location from IP
        ├─► Get user name
        ├─► Create audit log (logPasswordActivity)
        │   └─► Save to auditlogs collection
        │
        ▼
Return success
```

### 5. Copy Password Flow

```
User clicks copy icon on password
        │
        ▼
Frontend: copyToClipboard()
        │
        ├─► Copy to clipboard
        ├─► Show toast notification
        ├─► Log action (auditService.logCopyPassword)
        │
        ▼
Backend: logCopyPassword endpoint
        │
        ├─► Extract IP address
        ├─► Get location from IP
        ├─► Get user name
        ├─► Create audit log (logPasswordActivity)
        │   └─► Save to auditlogs collection
        │
        ▼
Return success
```

### 6. Edit Password Flow

```
User opens edit form
        │
        ▼
User makes changes
        │
        ▼
User clicks save
        │
        ▼
Frontend: passwordService.update()
        │
        ▼
Backend: updatePassword endpoint
        │
        ├─► Validate permissions
        ├─► Get old password data
        ├─► Compare old vs new values
        │   │
        │   ├─► If itemName changed → Add to logEntries
        │   ├─► If username changed → Add to logEntries
        │   ├─► If password changed → Add to logEntries
        │   └─► If notes changed → Add to logEntries
        │
        ├─► Update password in database
        ├─► Create PasswordLog entries
        │
        ├─► If logEntries.length > 0:
        │   │
        │   ├─► Extract IP address
        │   ├─► Get location from IP
        │   ├─► Get user name
        │   └─► Create audit log (logPasswordEdit)
        │       └─► Save to auditlogs collection
        │
        ▼
Return updated password
        │
        ▼
Frontend shows success message
```

### 7. View Audit Logs Flow

```
User clicks History icon
        │
        ▼
Frontend: viewLogs()
        │
        ├─► Fetch password logs (passwordService.getById)
        └─► Fetch audit logs (auditService.getPasswordAuditLogs)
        │
        ▼
Backend: getPasswordAuditLogs endpoint
        │
        ├─► Validate permissions
        ├─► Query auditlogs collection
        │   └─► Filter by resourceId (password ID)
        │       └─► Sort by timestamp (newest first)
        │           └─► Limit results
        │
        ▼
Return audit logs
        │
        ▼
Frontend: Display in dialog
        │
        ├─► Audit Trail section
        │   └─► Show all access logs with IP and location
        │
        └─► Change History section
            └─► Show password modification logs
```

---

## Data Flow Diagram

```
┌──────────────┐
│   Browser    │
│  (Frontend)  │
└──────┬───────┘
       │
       │ HTTP Request + JWT Token
       │
       ▼
┌──────────────┐
│   Express    │
│   Server     │
│  (Backend)   │
└──────┬───────┘
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
┌──────────────┐            ┌──────────────┐
│  IP Address  │            │   User Info  │
│  Extraction  │            │  Retrieval   │
└──────┬───────┘            └──────┬───────┘
       │                           │
       ▼                           │
┌──────────────┐                   │
│ ip-api.com   │                   │
│ Geolocation  │                   │
└──────┬───────┘                   │
       │                           │
       │ Location Data             │
       │                           │
       └───────────┬───────────────┘
                   │
                   ▼
           ┌──────────────┐
           │  Audit Log   │
           │   Creation   │
           └──────┬───────┘
                  │
                  ▼
           ┌──────────────┐
           │   MongoDB    │
           │  auditlogs   │
           │  collection  │
           └──────────────┘
```

---

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENTS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  password-creation.tsx                                       │
│  ├─ toggleUsernameVisibility() ──┐                         │
│  ├─ togglePasswordVisibility() ───┤                         │
│  ├─ copyToClipboard() ────────────┤                         │
│  └─ viewLogs() ───────────────────┤                         │
│                                    │                         │
│  auditService.ts                   │                         │
│  ├─ logViewUsername() ◄────────────┤                         │
│  ├─ logCopyUsername() ◄────────────┤                         │
│  ├─ logViewPassword() ◄────────────┤                         │
│  ├─ logCopyPassword() ◄────────────┤                         │
│  └─ getPasswordAuditLogs() ◄───────┘                         │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ API Calls
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                    BACKEND COMPONENTS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  passwordRoutes.ts                                           │
│  ├─ POST /audit/view-username ──┐                          │
│  ├─ POST /audit/copy-username ──┤                          │
│  ├─ POST /audit/view-password ──┤                          │
│  ├─ POST /audit/copy-password ──┤                          │
│  └─ GET /:id/audit-logs ─────────┤                          │
│                                   │                          │
│  passwordController.ts            │                          │
│  ├─ logViewUsername() ◄───────────┤                          │
│  ├─ logCopyUsername() ◄───────────┤                          │
│  ├─ logViewPassword() ◄───────────┤                          │
│  ├─ logCopyPassword() ◄───────────┤                          │
│  ├─ getPasswordAuditLogs() ◄──────┤                          │
│  └─ updatePassword() ─────────────┤                          │
│                                   │                          │
│  auditLogger.ts                   │                          │
│  ├─ getClientIP() ◄───────────────┤                          │
│  ├─ logPasswordActivity() ◄───────┤                          │
│  ├─ logPasswordEdit() ◄───────────┤                          │
│  └─ getAuditLogsForResource() ◄───┘                          │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Database Operations
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                    DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AuditLog.ts (Model)                                         │
│  └─ MongoDB Collection: auditlogs                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Timing Diagram

```
User Action          Frontend              Backend              IP API         Database
    │                    │                    │                   │               │
    │  Click View        │                    │                   │               │
    │─────────────────►  │                    │                   │               │
    │                    │  API Call          │                   │               │
    │                    │─────────────────►  │                   │               │
    │                    │                    │  Get Location     │               │
    │                    │                    │────────────────►  │               │
    │                    │                    │  Location Data    │               │
    │                    │                    │◄────────────────  │               │
    │                    │                    │  Save Audit Log   │               │
    │                    │                    │───────────────────────────────►   │
    │                    │                    │  Success          │               │
    │                    │                    │◄───────────────────────────────   │
    │                    │  Response          │                   │               │
    │                    │◄─────────────────  │                   │               │
    │  Display Data      │                    │                   │               │
    │◄─────────────────  │                    │                   │               │
    │                    │                    │                   │               │
    
Note: Audit logging is asynchronous and doesn't block the user response
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    NORMAL FLOW                               │
│  User Action → API Call → IP Lookup → Save Log → Success    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  ERROR SCENARIOS                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Scenario 1: IP Geolocation API Fails                       │
│  ├─ Catch error                                             │
│  ├─ Log error to console                                    │
│  ├─ Use empty location data                                 │
│  └─ Continue with audit log creation                        │
│                                                              │
│  Scenario 2: Database Save Fails                            │
│  ├─ Catch error                                             │
│  ├─ Log error to console                                    │
│  └─ Don't block user operation                              │
│                                                              │
│  Scenario 3: User Not Authenticated                         │
│  ├─ Return 401 Unauthorized                                 │
│  └─ No audit log created                                    │
│                                                              │
│  Scenario 4: Permission Denied                              │
│  ├─ Return 403 Forbidden                                    │
│  └─ No audit log created                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Key Principle: Audit logging failures never block user operations
```

---

## Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  IP LOCATION CACHE                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  First Request for IP 203.0.113.45:                         │
│  ├─ Check cache → Not found                                 │
│  ├─ Call ip-api.com                                         │
│  ├─ Receive location data                                   │
│  ├─ Store in cache: Map<IP, Location>                       │
│  └─ Return location data                                    │
│                                                              │
│  Second Request for IP 203.0.113.45:                        │
│  ├─ Check cache → Found!                                    │
│  └─ Return cached location data (no API call)               │
│                                                              │
│  Benefits:                                                   │
│  ├─ Faster response time                                    │
│  ├─ Reduced API calls                                       │
│  ├─ Stays within rate limits                                │
│  └─ Better performance                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

This flow diagram provides a visual representation of how the audit logging system works from user action to database storage.
