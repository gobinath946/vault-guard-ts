# Quick Start: Bulk Operations

## For Users

### Bulk Selection (Move Multiple Passwords)
1. Go to Password page
2. Click **"Bulk Selection"** button
3. Select passwords you want to move
4. Choose target Collection or Folder
5. Click **"Move"**

### Bulk Operation (Create Multiple Passwords)
1. Go to Password page
2. Click **"Bulk Operation"** button
3. Select Organization and Collection
4. Fill in password details for each entry
5. Click **"Add Entry"** to create more
6. Click **"Save All"**

## For Developers

### Running the Application

**Frontend:**
```bash
cd vault-guard-ts
npm install
npm run dev
```

**Backend:**
```bash
cd vault-guard-ts/backend
npm install
npm run dev
```

### New Files Added

**Frontend:**
- `src/components/common/BulkSelectionDialog.tsx`
- `src/components/common/BulkOperationForm.tsx`

**Backend:**
- Added functions in `backend/src/controllers/passwordController.ts`:
  - `bulkCreatePasswords()`
  - `bulkMovePasswords()`

**Modified:**
- `src/pages/password-creation.tsx` (added buttons and dialogs)
- `src/services/passwordService.ts` (added API methods)
- `backend/src/routes/passwordRoutes.ts` (added routes)

### API Endpoints

```
POST /api/passwords/bulk-create
POST /api/passwords/bulk-move
```

### Testing

1. **Test Bulk Selection:**
   - Create some passwords first
   - Open Bulk Selection dialog
   - Select multiple passwords
   - Move to a collection/folder
   - Verify they moved correctly

2. **Test Bulk Operation:**
   - Open Bulk Operation dialog
   - Create 3-5 entries
   - Fill all required fields
   - Save all entries
   - Verify they appear in the list

### Key Features

✅ No changes to existing password creation
✅ Full permission support
✅ Activity logging
✅ Error handling
✅ Partial success support
✅ Password encryption
✅ Duplicate name prevention

### Documentation

- **Full Guide:** `BULK_OPERATIONS_GUIDE.md`
- **Implementation Details:** `IMPLEMENTATION_SUMMARY.md`
- **This Quick Start:** `QUICK_START_BULK_OPERATIONS.md`

## Common Issues

**"No passwords available"**
- Create some passwords first using the regular Add Password button

**"Permission denied"**
- Ensure you have access to the target collection/folder
- Contact admin for permissions

**Validation errors**
- Fill all required fields (Item Name, Username, Password)
- Check for duplicate names in the same location

## Support

For detailed information, see `BULK_OPERATIONS_GUIDE.md`
