# Bulk Operations Feature Guide

This guide explains the new bulk operations features added to the VaultGuard password management system.

## Features Overview

### 1. Bulk Selection
Move multiple existing passwords to a different collection or folder in one operation.

### 2. Bulk Operation (Bulk Creation)
Create multiple password entries at once and save them all to the same location.

---

## Feature 1: Bulk Selection

### Purpose
Allows users to select multiple existing passwords from the list and move them all to a target collection or folder.

### How to Use

1. **Open Bulk Selection Dialog**
   - Navigate to the Password page
   - Click the "Bulk Selection" button in the top action bar

2. **Select Passwords**
   - Browse through the list of all your passwords
   - Click on individual passwords to select/deselect them
   - Use "Select All" / "Deselect All" button for quick selection
   - Selected count is displayed at the bottom

3. **Choose Target Location**
   - Select either "Collection" or "Folder" as the target type
   - Choose the specific collection or folder from the dropdown
   - Only accessible collections/folders are shown based on your permissions

4. **Move Passwords**
   - Click the "Move" button to execute the bulk move
   - A success message shows how many passwords were moved
   - The password list refreshes automatically

### UI Components
- **Password List**: Displays item name, username, and website URL for each password
- **Selection Checkboxes**: Click anywhere on the row to toggle selection
- **Target Type Toggle**: Radio buttons to choose between Collection and Folder
- **Target Selector**: Dropdown showing available destinations

### Backend API
- **Endpoint**: `POST /api/passwords/bulk-move`
- **Request Body**:
  ```json
  {
    "passwordIds": ["id1", "id2", "id3"],
    "collectionId": "collection_id",  // Optional
    "folderId": "folder_id"            // Optional
  }
  ```
- **Response**:
  ```json
  {
    "message": "Bulk move completed: 3 moved, 0 failed",
    "moved": 3,
    "failed": 0,
    "errors": []
  }
  ```

---

## Feature 2: Bulk Operation (Bulk Creation)

### Purpose
Allows users to create multiple password entries in a single session and save them all to the same collection/folder.

### How to Use

1. **Open Bulk Operation Dialog**
   - Navigate to the Password page
   - Click the "Bulk Operation" button in the top action bar

2. **Set Target Location**
   - Select the Organization where passwords will be saved
   - Select the Collection (required)
   - Optionally select a Folder within the collection
   - All entries will be saved to this location

3. **Create Password Entries**
   - The form starts with one empty entry
   - Fill in the required fields for each entry:
     - **Item Name** (required): Name/title for the password entry
     - **Username** (required): Username or email
     - **Password** (required): The password itself
     - **Website URLs** (optional): One or more website URLs
     - **Notes** (optional): Additional information

4. **Entry Management**
   - **Add Entry**: Click "Add Entry" to create a new blank entry
   - **Edit/Save**: Toggle between edit and view mode for each entry
   - **Remove**: Delete an entry (minimum 1 entry required)
   - **Generate Password**: Click the key icon to auto-generate a secure password
   - **Show/Hide Password**: Toggle password visibility with the eye icon

5. **Save All Entries**
   - Review all entries (you can toggle to view mode to see a summary)
   - Click "Save All (X)" button where X is the number of entries
   - All entries are validated and created in one operation
   - Success message shows how many were created

### Features per Entry
- **Password Generator Integration**: Each entry has a quick-generate button
- **Multiple Website URLs**: Add as many URLs as needed per entry
- **Edit/View Toggle**: Switch between editing and viewing mode
- **Password Visibility Toggle**: Show/hide passwords individually
- **Validation**: All required fields are validated before saving

### UI Components
- **Target Location Card**: Organization, Collection, and Folder selectors
- **Entry Cards**: Individual cards for each password entry
- **Entry Counter**: Shows total number of entries being created
- **Action Buttons**: Add Entry, Edit, Save, Remove for each entry
- **Password Tools**: Generate and visibility toggle buttons

### Backend API
- **Endpoint**: `POST /api/passwords/bulk-create`
- **Request Body**:
  ```json
  {
    "passwords": [
      {
        "itemName": "Gmail Account",
        "username": "user@example.com",
        "password": "SecurePass123!",
        "websiteUrls": ["https://gmail.com"],
        "notes": "Personal email",
        "organizationId": "org_id",
        "collectionId": "collection_id",
        "folderId": "folder_id"
      },
      {
        "itemName": "GitHub Account",
        "username": "developer",
        "password": "AnotherPass456!",
        "websiteUrls": ["https://github.com"],
        "notes": "Development account",
        "organizationId": "org_id",
        "collectionId": "collection_id",
        "folderId": "folder_id"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "message": "Bulk create completed: 2 created, 0 failed",
    "created": 2,
    "failed": 0,
    "errors": []
  }
  ```

---

## Technical Implementation

### Frontend Components

1. **BulkSelectionDialog.tsx**
   - Location: `src/components/common/BulkSelectionDialog.tsx`
   - Handles password selection and bulk move operations
   - Uses Checkbox components for selection
   - Integrates with existing password service

2. **BulkOperationForm.tsx**
   - Location: `src/components/common/BulkOperationForm.tsx`
   - Manages multiple password entry creation
   - Includes password generator integration
   - Handles form validation and submission

3. **Updated password-creation.tsx**
   - Added state management for both dialogs
   - Integrated new buttons in the action bar
   - Connected to backend APIs via password service

### Backend Implementation

1. **Controller Functions**
   - `bulkCreatePasswords`: Creates multiple passwords in one transaction
   - `bulkMovePasswords`: Moves multiple passwords to a new location
   - Both include permission checking and error handling

2. **API Routes**
   - `POST /api/passwords/bulk-create`: Bulk creation endpoint
   - `POST /api/passwords/bulk-move`: Bulk move endpoint

3. **Features**
   - Duplicate name checking per location
   - Permission validation for all operations
   - Activity logging for audit trail
   - Partial success handling (some succeed, some fail)

### Service Layer Updates

**passwordService.ts** additions:
```typescript
bulkCreate: async (passwords: Partial<Password>[]) => {
  const response = await api.post('/passwords/bulk-create', { passwords });
  return response.data;
}

bulkMove: async (passwordIds: string[], collectionId?: string, folderId?: string) => {
  const response = await api.post('/passwords/bulk-move', {
    passwordIds,
    collectionId,
    folderId,
  });
  return response.data;
}
```

---

## Security & Permissions

### Permission Checks
- All operations respect user role permissions
- Company users can only access passwords in their permitted collections/folders
- Company super admins can access all passwords in their company
- Master admins have full access

### Data Encryption
- All passwords are encrypted before storage
- Usernames are encrypted
- Notes are encrypted
- Encryption happens automatically in the backend

### Audit Logging
- All bulk operations are logged
- Each password creation/move creates a log entry
- Logs include user information and timestamp
- Logs are viewable in the password history

---

## Error Handling

### Validation Errors
- Empty required fields are caught before submission
- Duplicate item names in the same location are prevented
- Clear error messages guide the user

### Partial Success
- If some passwords fail during bulk operations, successful ones are still saved
- Error details are provided for failed operations
- User is informed of both successes and failures

### Network Errors
- Failed API calls show user-friendly error messages
- No data is lost on failure
- Users can retry the operation

---

## Best Practices

### For Bulk Selection
1. Review selected passwords before moving
2. Ensure you have permission to the target location
3. Use filters to narrow down the password list first
4. Check the selection count before moving

### For Bulk Operation
1. Set the target location before creating entries
2. Use the password generator for secure passwords
3. Toggle to view mode to review entries before saving
4. Add descriptive item names for easy identification
5. Include website URLs for better organization

### General Tips
- Use bulk operations for initial setup or reorganization
- Regular passwords can still be added individually
- Bulk operations don't replace the existing Add Password feature
- Both features work alongside each other

---

## Troubleshooting

### "No passwords available" in Bulk Selection
- Ensure you have passwords created in your account
- Check if filters are applied that hide all passwords
- Verify you have permission to view passwords

### "You do not have permission" error
- Contact your administrator to grant necessary permissions
- Verify you're selecting a collection/folder you have access to
- Check your role and permission settings

### Bulk creation fails
- Verify all required fields are filled
- Check for duplicate item names in the target location
- Ensure you have permission to create in the selected location
- Try creating fewer entries at once if experiencing issues

### Passwords not appearing after bulk operation
- Refresh the page
- Check if filters are hiding the new passwords
- Verify the passwords were saved to the expected location
- Check the browser console for any errors

---

## Future Enhancements

Potential improvements for future versions:
- Bulk edit (modify multiple passwords at once)
- Bulk delete with confirmation
- Import from CSV file
- Export selected passwords
- Bulk sharing with users
- Template-based bulk creation
- Scheduled bulk operations

---

## Support

For issues or questions:
1. Check this guide first
2. Review the error messages carefully
3. Contact your system administrator
4. Report bugs to the development team

---

## Changelog

### Version 1.0.0 (Current)
- Initial release of bulk operations features
- Bulk Selection: Move multiple passwords
- Bulk Operation: Create multiple passwords
- Full permission integration
- Audit logging support
- Error handling and validation
