# Install Required Dependencies for File Upload

## Step 1: Install npm packages

Run this command in the `backend` directory:

```bash
npm install @aws-sdk/client-s3 multer uuid
npm install --save-dev @types/multer @types/uuid
```

## Step 2: Configure AWS S3

Update your `.env` file with your AWS S3 credentials:

```env
# AWS S3 Configuration (already added to .env)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_BASE_URL=https://your-bucket-name.s3.amazonaws.com
```

Replace the placeholder values with your actual AWS credentials.

## Step 3: Restart the Backend Server

After installing dependencies and configuring S3:

```bash
npm run dev
```

## Verification

Once the server restarts, the upload endpoint should be available:
- POST `/api/upload` - Upload file
- DELETE `/api/upload` - Delete file

## Files Already Created:

✅ `src/utils/s3Upload.ts` - S3 upload utilities
✅ `src/controllers/uploadController.ts` - Upload controller
✅ `src/middleware/upload.ts` - Multer middleware
✅ `src/routes/uploadRoutes.ts` - Upload routes
✅ `src/server.ts` - Routes registered (just updated)
✅ `src/models/Password.ts` - Attachments field added

## Next Steps:

1. Install dependencies (above)
2. Configure S3 credentials
3. Restart server
4. Test file upload from frontend

The 404 error will be resolved once you restart the server after installing dependencies!
