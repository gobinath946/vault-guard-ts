# SecurePro Backend

Complete backend API for SecurePro password management system.

## Setup Instructions

1. **Install Dependencies**
```bash
cd backend
npm install
```

2. **Environment Configuration**
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Update the following variables:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string for JWT signing
- `ENCRYPTION_KEY`: A 32-character string for data encryption

3. **Create Master Admin**
Before running the app, you need to create a master admin account. You can do this via MongoDB shell or create a seed script.

Example seed script (create `src/seeds/createMasterAdmin.ts`):
```typescript
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import MasterAdmin from '../models/MasterAdmin';
import dotenv from 'dotenv';

dotenv.config();

const createMasterAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const existingAdmin = await MasterAdmin.findOne();
    if (existingAdmin) {
      console.log('Master admin already exists');
      process.exit(0);
    }

    const password = await bcrypt.hash('your-secure-password', 12);
    
    await MasterAdmin.create({
      email: 'admin@securepro.com',
      password,
    });

    console.log('Master admin created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createMasterAdmin();
```

4. **Run Development Server**
```bash
npm run dev
```

5. **Build for Production**
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register company
- `POST /api/auth/login` - Login (all roles)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify JWT token

### Master Admin
- `GET /api/master/dashboard` - Dashboard stats
- `GET /api/master/companies` - Get all companies
- `PUT /api/master/companies/:id` - Update company
- `DELETE /api/master/companies/:id` - Delete company

### Company Super Admin
- `GET /api/company/dashboard` - Dashboard stats
- `GET /api/company/users` - Get all users
- `POST /api/company/users` - Create user
- `PUT /api/company/users/:id` - Update user
- `DELETE /api/company/users/:id` - Delete user
- `PUT /api/company/users/:id/permissions` - Update permissions

### Passwords
- `GET /api/passwords` - Get all passwords (permission-based)
- `GET /api/passwords/:id` - Get specific password (decrypted)
- `POST /api/passwords` - Create password entry
- `PUT /api/passwords/:id` - Update password entry
- `DELETE /api/passwords/:id` - Delete password entry
- `POST /api/passwords/generate` - Generate password

### Folders
- `GET /api/folders` - Get all folders
- `GET /api/folders/:id` - Get specific folder
- `POST /api/folders` - Create folder
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Collections
- `GET /api/collections` - Get all collections
- `GET /api/collections/:id` - Get specific collection
- `POST /api/collections` - Create collection
- `PUT /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection

## Security Features

- **Double Password Hashing**: Passwords hashed on frontend, then re-hashed on backend
- **Data Encryption**: Sensitive data (usernames, passwords, notes) encrypted with AES-256-CBC
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Master Admin, Company Super Admin, Company User roles
- **Permission System**: Granular access control for company users

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── masterAdminController.ts
│   │   ├── companyController.ts
│   │   ├── passwordController.ts
│   │   ├── folderController.ts
│   │   └── collectionController.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── models/
│   │   ├── MasterAdmin.ts
│   │   ├── Company.ts
│   │   ├── User.ts
│   │   ├── Password.ts
│   │   ├── Folder.ts
│   │   └── Collection.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── masterAdminRoutes.ts
│   │   ├── companyRoutes.ts
│   │   ├── passwordRoutes.ts
│   │   ├── folderRoutes.ts
│   │   └── collectionRoutes.ts
│   ├── utils/
│   │   ├── encryption.ts
│   │   └── passwordGenerator.ts
│   └── server.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

This backend can be deployed to any Node.js hosting service:
- Heroku
- DigitalOcean
- AWS EC2
- Google Cloud Platform
- Your own VPS

Make sure to:
1. Set all environment variables
2. Use a production MongoDB instance (MongoDB Atlas recommended)
3. Enable HTTPS
4. Set `NODE_ENV=production`
