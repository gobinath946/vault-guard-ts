# Bulk Operations - Feature Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Password Creation Page                   │
│                  (password-creation.tsx)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Bulk      │  │     Bulk     │  │     Add      │     │
│  │  Selection   │  │  Operation   │  │   Password   │     │
│  │   Button     │  │    Button    │  │   Button     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                  │                                │
│         ▼                  ▼                                │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │BulkSelection │  │BulkOperation │                       │
│  │   Dialog     │  │     Form     │                       │
│  └──────┬───────┘  └──────┬───────┘                       │
└─────────┼──────────────────┼──────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Password Service                          │
│                 (passwordService.ts)                         │
├─────────────────────────────────────────────────────────────┤
│  • bulkMove(passwordIds, collectionId, folderId)            │
│  • bulkCreate(passwords[])                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API                               │
│              (Express.js Routes)                             │
├─────────────────────────────────────────────────────────────┤
│  POST /api/passwords/bulk-move                              │
│  POST /api/passwords/bulk-create                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Password Controller                           │
│          (passwordController.ts)                             │
├─────────────────────────────────────────────────────────────┤
│  • bulkMovePasswords()                                       │
│    - Validate permissions                                    │
│    - Update password locations                               │
│    - Create activity logs                                    │
│                                                              │
│  • bulkCreatePasswords()                                     │
│    - Validate data                                           │
│    - Check duplicates                                        │
│    - Encrypt passwords                                       │
│    - Create activity logs                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   MongoDB Database                           │
├─────────────────────────────────────────────────────────────┤
│  Collections:                                                │
│  • passwords (encrypted data)                                │
│  • passwordLogs (activity audit trail)                       │
│  • collections                                               │
│  • folders                                                   │
└─────────────────────────────────────────────────────────────┘
```

## Component Flow Diagrams

### Bulk Selection Flow

```
User Action                Component                    Backend
─────────────────────────────────────────────────────────────────

1. Click "Bulk Selection"
                    │
                    ▼
              Open Dialog
              Show password list
                    │
2. Select passwords │
   (checkboxes)     │
                    │
3. Choose target    │
   collection/folder│
                    │
4. Click "Move"     │
                    ├──────────► POST /bulk-move
                    │                    │
                    │                    ├─► Validate permissions
                    │                    │
                    │                    ├─► Update locations
                    │                    │
                    │                    ├─► Create logs
                    │                    │
                    │            ◄───────┤ Return success/errors
                    │
              Show success message
              Refresh password list
              Close dialog
```

### Bulk Operation Flow

```
User Action                Component                    Backend
─────────────────────────────────────────────────────────────────

1. Click "Bulk Operation"
                    │
                    ▼
              Open Dialog
              Show empty form
                    │
2. Select target    │
   org/collection/  │
   folder           │
                    │
3. Fill entry #1    │
   - Item name      │
   - Username       │
   - Password       │
   - URLs           │
   - Notes          │
                    │
4. Click "Add Entry"│
                    │
5. Fill entry #2-5  │
   (repeat)         │
                    │
6. Click "Save All" │
                    ├──────────► POST /bulk-create
                    │                    │
                    │                    ├─► Validate each entry
                    │                    │
                    │                    ├─► Check duplicates
                    │                    │
                    │                    ├─► Encrypt passwords
                    │                    │
                    │                    ├─► Create passwords
                    │                    │
                    │                    ├─► Create logs
                    │                    │
                    │            ◄───────┤ Return created count
                    │
              Show success message
              Refresh password list
              Close dialog
```

## Data Flow

### Bulk Move Request/Response

**Request:**
```json
{
  "passwordIds": ["pwd1", "pwd2", "pwd3"],
  "collectionId": "col123",
  "folderId": "folder456"
}
```

**Processing:**
1. Authenticate user
2. Validate target exists
3. Check user permissions for each password
4. Check user permission for target
5. Update each password's location
6. Create activity log for each
7. Return results

**Response:**
```json
{
  "message": "Bulk move completed: 3 moved, 0 failed",
  "moved": 3,
  "failed": 0,
  "errors": []
}
```

### Bulk Create Request/Response

**Request:**
```json
{
  "passwords": [
    {
      "itemName": "Gmail",
      "username": "user@gmail.com",
      "password": "SecurePass123!",
      "websiteUrls": ["https://gmail.com"],
      "notes": "Personal email",
      "organizationId": "org123",
      "collectionId": "col456",
      "folderId": "folder789"
    },
    // ... more entries
  ]
}
```

**Processing:**
1. Authenticate user
2. Validate each entry
3. Check for duplicate names
4. Encrypt sensitive fields
5. Create password documents
6. Create activity logs
7. Return results

**Response:**
```json
{
  "message": "Bulk create completed: 5 created, 0 failed",
  "created": 5,
  "failed": 0,
  "errors": []
}
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Authentication                                     │
│  ├─ JWT token validation                                     │
│  └─ User session verification                                │
│                                                              │
│  Layer 2: Authorization                                      │
│  ├─ Role-based access control                                │
│  ├─ Permission checking per operation                        │
│  └─ Resource ownership validation                            │
│                                                              │
│  Layer 3: Data Validation                                    │
│  ├─ Input sanitization                                       │
│  ├─ Required field validation                                │
│  └─ Duplicate name checking                                  │
│                                                              │
│  Layer 4: Encryption                                         │
│  ├─ Password encryption (AES-256)                            │
│  ├─ Username encryption                                      │
│  └─ Notes encryption                                         │
│                                                              │
│  Layer 5: Audit Logging                                      │
│  ├─ Activity tracking                                        │
│  ├─ User identification                                      │
│  └─ Timestamp recording                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Permission Matrix

```
┌──────────────────┬─────────────┬─────────────┬─────────────┐
│   Operation      │ Master Admin│ Super Admin │ Company User│
├──────────────────┼─────────────┼─────────────┼─────────────┤
│ Bulk Move        │     ✓       │      ✓      │  ✓ (limited)│
│ Bulk Create      │     ✓       │      ✓      │  ✓ (limited)│
│ View All Pwds    │     ✓       │      ✓      │  ✓ (limited)│
│ Access Any Loc   │     ✓       │      ✓      │      ✗      │
└──────────────────┴─────────────┴─────────────┴─────────────┘

Legend:
✓ = Full access
✓ (limited) = Access based on assigned permissions
✗ = No access
```

## Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   Error Handling Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend Validation                                         │
│  ├─ Empty required fields → Show inline error               │
│  ├─ Invalid format → Show inline error                      │
│  └─ No selection → Show toast notification                  │
│                                                              │
│  Backend Validation                                          │
│  ├─ Authentication failure → 401 Unauthorized               │
│  ├─ Permission denied → 403 Forbidden                       │
│  ├─ Resource not found → 404 Not Found                      │
│  ├─ Duplicate name → 400 Bad Request                        │
│  └─ Server error → 500 Internal Server Error                │
│                                                              │
│  Partial Success Handling                                    │
│  ├─ Some succeed, some fail → Return both counts            │
│  ├─ Show detailed error list                                │
│  └─ Allow retry of failed items                             │
│                                                              │
│  User Feedback                                               │
│  ├─ Success → Green toast with count                        │
│  ├─ Partial → Yellow toast with details                     │
│  └─ Failure → Red toast with error message                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Impact

### Password Document
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,
  itemName: String,
  username: String (encrypted),
  password: String (encrypted),
  websiteUrls: [String],
  notes: String (encrypted),
  organizationId: ObjectId,
  collectionId: ObjectId,
  folderId: ObjectId,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  lastModified: Date,
  logs: [ObjectId] // References to PasswordLog
}
```

### PasswordLog Document
```javascript
{
  _id: ObjectId,
  passwordId: ObjectId,
  action: String, // 'create', 'update', 'delete', 'view'
  field: String,
  oldValue: String,
  newValue: String,
  performedBy: ObjectId,
  performedByName: String,
  performedByEmail: String,
  timestamp: Date,
  details: String
}
```

## Performance Considerations

```
┌─────────────────────────────────────────────────────────────┐
│              Performance Optimization                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend                                                    │
│  ├─ Lazy loading of dialogs                                 │
│  ├─ Debounced search/filter                                 │
│  ├─ Virtual scrolling for large lists                       │
│  └─ Optimistic UI updates                                   │
│                                                              │
│  Backend                                                     │
│  ├─ Batch database operations                               │
│  ├─ Indexed queries on common fields                        │
│  ├─ Parallel permission checks                              │
│  └─ Connection pooling                                      │
│                                                              │
│  Scalability                                                 │
│  ├─ Limit bulk operations to 100 items                      │
│  ├─ Pagination for password lists                           │
│  ├─ Async processing for large batches                      │
│  └─ Rate limiting on API endpoints                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│            External System Integration                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Existing Features                                           │
│  ├─ Password Generator → Used in bulk operation             │
│  ├─ Add Password Form → Unchanged, works alongside          │
│  ├─ Permission System → Fully integrated                    │
│  ├─ Activity Logs → Automatic logging                       │
│  └─ Encryption → Applied to all passwords                   │
│                                                              │
│  UI Components                                               │
│  ├─ Dialog → From shadcn/ui                                 │
│  ├─ Button → From shadcn/ui                                 │
│  ├─ Checkbox → From shadcn/ui                               │
│  ├─ Select → From shadcn/ui                                 │
│  └─ Toast → From custom hook                                │
│                                                              │
│  Services                                                    │
│  ├─ passwordService → Extended with bulk methods            │
│  ├─ collectionService → Used for target selection           │
│  ├─ folderService → Used for target selection               │
│  └─ authService → Used for authentication                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Checklist

- [ ] Frontend build successful
- [ ] Backend build successful
- [ ] Database migrations (if any)
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Permission system verified
- [ ] Encryption working correctly
- [ ] Activity logs being created
- [ ] Error handling tested
- [ ] Performance tested with large datasets
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] User training materials prepared

## Monitoring & Metrics

```
Key Metrics to Track:
├─ Bulk operations per day
├─ Average items per bulk operation
├─ Success rate (created/moved vs failed)
├─ Response time for bulk operations
├─ Error rate by type
├─ User adoption rate
└─ Permission denial rate
```
