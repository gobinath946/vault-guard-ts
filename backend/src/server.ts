import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRoutes from './routes/authRoutes';
import masterAdminRoutes from './routes/masterAdminRoutes';
import companyRoutes from './routes/companyRoutes';
import passwordRoutes from './routes/passwordRoutes';
import folderRoutes from './routes/folderRoutes';
import collectionRoutes from './routes/collectionRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/master', masterAdminRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/collections', collectionRoutes);

// Error Handler
app.use(errorHandler);

// Connect to Database and Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

export default app;
