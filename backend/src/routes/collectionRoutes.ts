import express from 'express';
import {
  getAllCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  softDeleteCollection,
} from '../controllers/collectionController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllCollections);
router.get('/:id', getCollectionById);
router.post('/', createCollection);
router.put('/:id', updateCollection);
router.delete('/:id', softDeleteCollection);

export default router;