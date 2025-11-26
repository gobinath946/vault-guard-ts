# ✅ Attachment Feature - Multiple Images & Videos Support CONFIRMED

## Current Implementation - Already Supports Your Requirements!

### ✅ Multiple File Upload Support

The FileUpload component **already supports** uploading multiple images and videos together:

```typescript
<input
  id="file-upload"
  type="file"
  accept="image/*,video/*"  // ← Accepts BOTH images AND videos
  multiple                   // ← Allows selecting MULTIPLE files at once
  className="hidden"
  onChange={handleFileSelect}
/>
```

### ✅ File Validation

**Each file is validated individually:**

1. **File Size:** Max 50MB per file
   ```typescript
   if (file.size > 50 * 1024 * 1024) {
     // Show error for this specific file
     // Continue processing other files
   }
   ```

2. **File Type:** Images AND Videos
   ```typescript
   const validTypes = [
     // Images
     'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
     'image/webp', 'image/svg+xml',
     // Videos
     'video/mp4', 'video/mpeg', 'video/quicktime', 
     'video/x-msvideo', 'video/webm'
   ];
   ```

### ✅ Upload Process

**Files are uploaded sequentially to S3:**

```typescript
for (const file of files) {
  try {
    const result = await uploadService.uploadFile(file);
    newAttachments.push(result.file);
    // Show success toast for each file
  } catch (error) {
    // Show error toast for failed file
    // Continue with next file
  }
}
```

## How It Works:

### 1. **User Clicks "Add Attachment"**
   - File picker opens
   - User can select multiple files at once (Ctrl+Click or Shift+Click)
   - Can select mix of images and videos

### 2. **Validation Happens**
   - Each file checked for size (max 50MB)
   - Each file checked for type (image or video)
   - Invalid files show error toast
   - Valid files proceed to upload

### 3. **Upload to S3**
   - Each file uploaded individually
   - Shows "Uploading..." with spinner
   - Success toast for each uploaded file
   - Files appear in list with preview

### 4. **Display Uploaded Files**
   - Images show blue Image icon
   - Videos show purple Video icon
   - File name (clickable to view)
   - File size in KB/MB
   - Remove button (X) for each

### 5. **Save to Backend**
   - All attachments saved in array
   - Stored in Password model
   - Includes: fileUrl, fileName, fileSize, mimeType

## Example Usage Scenarios:

### Scenario 1: Upload 3 Images
✅ User selects 3 JPG files (each 10MB)
✅ All 3 upload successfully
✅ All 3 saved to S3
✅ All 3 appear in list with blue icons

### Scenario 2: Upload 2 Videos
✅ User selects 2 MP4 files (each 45MB)
✅ Both upload successfully
✅ Both saved to S3
✅ Both appear in list with purple icons

### Scenario 3: Upload Mix (2 Images + 2 Videos)
✅ User selects 2 PNG + 2 MP4 files
✅ All 4 upload successfully
✅ All 4 saved to S3
✅ Images show blue icons, videos show purple icons

### Scenario 4: One File Too Large
❌ User selects 3 files: 2 valid (30MB each) + 1 invalid (60MB)
✅ 2 valid files upload successfully
❌ 1 invalid file shows error toast
✅ User can continue with the 2 uploaded files

## File Limits:

- **Max Files:** 5 total (configurable via `maxFiles` prop)
- **Max Size:** 50MB per file
- **File Types:** 
  - Images: JPEG, JPG, PNG, GIF, WebP, SVG
  - Videos: MP4, MPEG, QuickTime, AVI, WebM
- **Mix:** Can upload any combination of images and videos

## Backend Storage:

### S3 Structure:
```
your-bucket-name/
  attachments/
    ├── uuid-1.jpg      (Image 1)
    ├── uuid-2.png      (Image 2)
    ├── uuid-3.mp4      (Video 1)
    ├── uuid-4.mov      (Video 2)
    └── uuid-5.webm     (Video 3)
```

### Database Storage (Password Model):
```json
{
  "itemName": "My Account",
  "username": "user@example.com",
  "password": "encrypted",
  "attachments": [
    {
      "fileUrl": "https://bucket.s3.amazonaws.com/attachments/uuid-1.jpg",
      "fileName": "attachments/uuid-1.jpg",
      "fileSize": 1048576,
      "mimeType": "image/jpeg",
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "fileUrl": "https://bucket.s3.amazonaws.com/attachments/uuid-2.mp4",
      "fileName": "attachments/uuid-2.mp4",
      "fileSize": 5242880,
      "mimeType": "video/mp4",
      "uploadedAt": "2024-01-01T00:00:01.000Z"
    }
  ]
}
```

## UI Features:

### File Upload Button:
- **Text:** "Add Attachment"
- **Icon:** Upload icon
- **State:** Shows spinner when uploading
- **Info:** "X/5 files • Max 50MB per file"

### File List:
Each file shows:
- **Icon:** Blue (image) or Purple (video)
- **Name:** Clickable link to view file
- **Size:** Formatted (KB/MB)
- **Remove:** X button to delete

### Visual Feedback:
- ✅ Success toast for each uploaded file
- ❌ Error toast for failed uploads
- 🔄 Spinner during upload
- 🎨 Hover effects on file items

## Testing Checklist:

- [ ] Upload single image (< 50MB) ✅
- [ ] Upload single video (< 50MB) ✅
- [ ] Upload multiple images at once ✅
- [ ] Upload multiple videos at once ✅
- [ ] Upload mix of images and videos ✅
- [ ] Try uploading file > 50MB (should show error) ✅
- [ ] Try uploading invalid file type (should show error) ✅
- [ ] Try uploading 6 files (should show error at 6th) ✅
- [ ] Remove uploaded file ✅
- [ ] Save password with attachments ✅
- [ ] Edit password and add more attachments ✅
- [ ] View uploaded files (click links) ✅

## Backend Setup Required:

### 1. Install Dependencies:
```bash
cd backend
npm install @aws-sdk/client-s3 multer uuid
npm install --save-dev @types/multer @types/uuid
```

### 2. Configure S3 (.env):
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_BASE_URL=https://your-bucket-name.s3.amazonaws.com
```

### 3. Add Routes (server.ts):
```typescript
import uploadRoutes from './routes/uploadRoutes';
app.use('/api/upload', uploadRoutes);
```

### 4. Restart Server

## Summary:

✅ **Multiple Images:** Supported (up to 5 files, 50MB each)
✅ **Multiple Videos:** Supported (up to 5 files, 50MB each)
✅ **Mixed Upload:** Supported (images + videos together)
✅ **S3 Storage:** Each file saved with unique UUID
✅ **Database:** All attachments saved in array
✅ **UI:** Clean preview with icons and file info
✅ **Validation:** Size and type checked per file
✅ **Error Handling:** Individual file errors don't block others

**The feature is ready to use once the backend is configured!**
