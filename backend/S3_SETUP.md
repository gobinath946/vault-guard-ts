# S3 Configuration Setup

## Required npm packages

Run the following command to install required dependencies:

```bash
npm install @aws-sdk/client-s3 multer uuid
npm install --save-dev @types/multer @types/uuid
```

## Environment Variables

Update your `.env` file with the following S3 configuration:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_BASE_URL=https://your-bucket-name.s3.amazonaws.com
```

## AWS S3 Bucket Setup

1. **Create S3 Bucket:**
   - Go to AWS Console → S3
   - Create a new bucket
   - Choose a unique bucket name
   - Select your preferred region

2. **Configure Bucket Permissions:**
   - Go to Bucket → Permissions
   - Edit Block Public Access settings
   - Uncheck "Block all public access" (or configure as needed)
   - Add bucket policy for public read access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

3. **Create IAM User:**
   - Go to IAM → Users → Create User
   - Attach policy: `AmazonS3FullAccess`
   - Generate Access Key and Secret Key
   - Copy credentials to `.env` file

4. **Enable CORS (if needed):**
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

## Supported File Types

- **Images:** JPEG, JPG, PNG, GIF, WebP, SVG
- **Videos:** MP4, MPEG, QuickTime, AVI, WebM

## File Size Limit

- Maximum file size: **50MB**

## API Endpoints

### Upload File
```
POST /api/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: 
- file: (binary file)
```

### Delete File
```
DELETE /api/upload
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "fileName": "attachments/uuid.jpg"
}
```

## Integration with Server

Add the upload routes to your `server.ts`:

```typescript
import uploadRoutes from './routes/uploadRoutes';

app.use('/api/upload', uploadRoutes);
```
