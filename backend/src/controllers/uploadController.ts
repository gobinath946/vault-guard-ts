import { Response, Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Extend AuthRequest to include multer file
interface UploadRequest extends AuthRequest {
  file?: Express.Multer.File;
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/attachments');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Validation functions
const isValidFileType = (mimetype: string): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ];
  return allowedTypes.includes(mimetype);
};

const isValidFileSize = (size: number): boolean => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  return size <= maxSize;
};

/**
 * Upload file to local storage
 */
export const uploadFile = async (req: UploadRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // Validate file type
    if (!isValidFileType(mimetype)) {
      return res.status(400).json({ 
        message: 'Invalid file type. Only images and videos are allowed.' 
      });
    }

    // Validate file size
    if (!isValidFileSize(size)) {
      return res.status(400).json({ 
        message: 'File size exceeds 50MB limit.' 
      });
    }

    // Generate unique filename
    const fileExtension = path.extname(originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file to local storage
    fs.writeFileSync(filePath, buffer);

    // Generate URL for accessing the file
    const fileUrl = `/uploads/attachments/${fileName}`;

    res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        fileName,
        fileUrl,
        originalName: originalname,
        mimeType: mimetype,
        size,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload file',
      error: error.message 
    });
  }
};

/**
 * Delete file from local storage
 */
export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({ message: 'File name is required' });
    }

    const filePath = path.join(uploadsDir, fileName);

    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(200).json({
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      message: 'Failed to delete file',
      error: error.message 
    });
  }
};
