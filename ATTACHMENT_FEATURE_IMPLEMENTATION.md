# Attachment Feature Implementation Guide

## ✅ Backend Implementation Complete

### Files Created:

1. **`backend/src/utils/s3Upload.ts`**
   - S3 upload/delete utilities
   - File validation (type and size)
   - Supports images and videos up to 50MB

2. **`backend/src/controllers/uploadController.ts`**
   - Upload file endpoint
   - Delete file endpoint
   - File validation logic

3. **`backend/src/middleware/upload.ts`**
   - Multer configuration for file handling
   - Memory storage for direct S3 upload
   - File type filtering

4. **`backend/src/routes/uploadRoutes.ts`**
   - POST `/api/upload` - Upload file
   - DELETE `/api/upload` - Delete file

5. **`backend/src/models/Password.ts`** (Updated)
   - Added `attachments` array field
   - Stores: fileUrl, fileName, fileSize, mimeType, uploadedAt

6. **`backend/.env`** (Updated)
   - Added S3 configuration variables

7. **`backend/S3_SETUP.md`**
   - Complete setup instructions
   - AWS configuration guide

### Required npm Packages:

```bash
cd backend
npm install @aws-sdk/client-s3 multer uuid
npm install --save-dev @types/multer @types/uuid
```

### Server Integration:

Add to `backend/src/server.ts`:

```typescript
import uploadRoutes from './routes/uploadRoutes';

// Add after other routes
app.use('/api/upload', uploadRoutes);
```

## 📋 Frontend Implementation Needed

### 1. Create Upload Service (`src/services/uploadService.ts`):

```typescript
import { api } from '@/lib/api';

export const uploadService = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteFile: async (fileName: string) => {
    const response = await api.delete('/upload', {
      data: { fileName },
    });
    return response.data;
  },
};
```

### 2. Create File Upload Component (`src/components/common/FileUpload.tsx`):

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, File, Image, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadService } from '@/services/uploadService';

interface FileUploadProps {
  attachments: any[];
  onAttachmentsChange: (attachments: any[]) => void;
  maxFiles?: number;
}

export const FileUpload = ({ 
  attachments, 
  onAttachmentsChange,
  maxFiles = 5 
}: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (attachments.length + files.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `Maximum ${maxFiles} files allowed`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    
    for (const file of files) {
      try {
        const result = await uploadService.uploadFile(file);
        onAttachmentsChange([...attachments, result.file]);
        
        toast({
          title: 'Success',
          description: 'File uploaded successfully',
        });
      } catch (error: any) {
        toast({
          title: 'Upload failed',
          description: error.response?.data?.message || 'Failed to upload file',
          variant: 'destructive',
        });
      }
    }
    
    setUploading(false);
    e.target.value = '';
  };

  const handleRemove = async (index: number) => {
    const attachment = attachments[index];
    
    try {
      await uploadService.deleteFile(attachment.fileName);
      onAttachmentsChange(attachments.filter((_, i) => i !== index));
      
      toast({
        title: 'Success',
        description: 'File removed successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || attachments.length >= maxFiles}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading...' : 'Add Attachment'}
        </Button>
        <span className="text-xs text-muted-foreground">
          {attachments.length}/{maxFiles} files
        </span>
      </div>
      
      <input
        id="file-upload"
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 border rounded-md"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getFileIcon(attachment.mimeType)}
                <a
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm truncate hover:underline"
                >
                  {attachment.fileName.split('/').pop()}
                </a>
                <span className="text-xs text-muted-foreground">
                  ({(attachment.fileSize / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 3. Update AddPasswordForm Component:

Add before the notes field:

```typescript
import { FileUpload } from '@/components/common/FileUpload';

// In state:
const [attachments, setAttachments] = useState<any[]>([]);

// In form (before notes field):
<div className="space-y-2">
  <Label>Attachments (Optional)</Label>
  <FileUpload
    attachments={attachments}
    onAttachmentsChange={setAttachments}
  />
</div>

// In handleSubmit, include attachments:
const passwordData = {
  // ... other fields
  attachments: attachments,
};
```

### 4. Update BulkOperationForm Component:

Same as above - add FileUpload component before the notes field in each entry.

### 5. Update Password Controller (Backend):

The password controller already handles the attachments field since it's part of the Password model. No changes needed.

## 🔧 Configuration Steps:

1. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install @aws-sdk/client-s3 multer uuid
   npm install --save-dev @types/multer @types/uuid
   ```

2. **Configure AWS S3:**
   - Create S3 bucket
   - Create IAM user with S3 access
   - Update `.env` with credentials

3. **Add Upload Routes to Server:**
   ```typescript
   import uploadRoutes from './routes/uploadRoutes';
   app.use('/api/upload', uploadRoutes);
   ```

4. **Restart Backend Server**

5. **Implement Frontend Components** (as shown above)

## 📝 Features:

- ✅ Upload images and videos (up to 50MB)
- ✅ Multiple file attachments per password
- ✅ File preview with icons
- ✅ Delete attachments
- ✅ S3 storage with public URLs
- ✅ Secure file handling
- ✅ Works in both Password Creation and Bulk Operation

## 🎯 Next Steps:

1. Install npm packages
2. Configure AWS S3
3. Add upload routes to server
4. Create frontend components
5. Test file upload/delete functionality
