import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

console.log('🔧 Environment check:');
console.log('ENCRYPTION_KEY exists:', !!process.env.ENCRYPTION_KEY);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

// Import routes after dotenv config
import authRoutes from './routes/authRoutes';
import organizationRoutes from './routes/organizationRoutes';
import passwordRoutes from './routes/passwordRoutes';
import folderRoutes from './routes/folderRoutes';
import collectionRoutes from './routes/collectionRoutes';
import trashRoutes from './routes/trashRoutes'
import userRoutes from './routes/companyRoutes'
import extensionRoutes from './routes/extensionRoutes'


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes); // Add this line
app.use('/api/organizations', organizationRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/company', userRoutes);
app.use('/api/extension', extensionRoutes);



// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/password-manager';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((error) => console.log('❌ MongoDB connection error:', error));

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});