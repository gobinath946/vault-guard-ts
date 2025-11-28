import express from 'express';
import {
  getAllPasswords,
  getPasswordById,
  createPassword,
  updatePassword,
  softDeletePassword,
  generatePasswordHandler,
  bulkCreatePasswords,
  bulkMovePasswords,
  addAttachment,
  deleteAttachment,
  getAttachments,
  logViewUsername,
  logCopyUsername,
  logViewPassword,
  logCopyPassword,
  getPasswordAuditLogs,
} from '../controllers/passwordController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllPasswords);
router.get('/:id', getPasswordById);
router.post('/', createPassword);
router.post('/bulk-create', bulkCreatePasswords);
router.post('/bulk-move', bulkMovePasswords);
router.put('/:id', updatePassword);
router.delete('/:id', softDeletePassword);
router.post('/generate', generatePasswordHandler);

// Attachment routes
router.get('/:id/attachments', getAttachments);
router.post('/:id/attachments', addAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

// Audit logging routes
router.post('/audit/view-username', logViewUsername);
router.post('/audit/copy-username', logCopyUsername);
router.post('/audit/view-password', logViewPassword);
router.post('/audit/copy-password', logCopyPassword);
router.get('/:id/audit-logs', getPasswordAuditLogs);

export default router;