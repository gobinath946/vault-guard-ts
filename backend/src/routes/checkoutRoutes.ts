import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import {
    initiateCheckout,
    getCheckoutList,
    getCheckoutDetails,
    updateCheckoutStep,
    proceedCheckout,
    uploadCheckoutDocument,
    generatePreviewPDF,
    resendOffboardingMail,
    uploadStepAttachment,
    serveAttachmentFile,
    debugAttachment,
    testS3File,
    deleteStepAttachment,
} from '../controllers/checkoutController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/initiate', authenticate, initiateCheckout);
router.get('/list', authenticate, getCheckoutList);
router.get('/:checkoutId', authenticate, getCheckoutDetails);
router.put('/:checkoutId/step', authenticate, updateCheckoutStep);
router.post('/:checkoutId/proceed', authenticate, proceedCheckout);
router.post('/:checkoutId/resend-email', authenticate, resendOffboardingMail);
router.get('/:checkoutId/preview-pdf', authenticate, generatePreviewPDF);
router.post('/upload', authenticate, upload.single('document'), uploadCheckoutDocument);
router.post('/:checkoutId/step/:stepIndex/upload', authenticate, upload.single('attachment'), uploadStepAttachment);
router.get('/:checkoutId/step/:stepIndex/attachment', authenticate, serveAttachmentFile);
router.delete('/:checkoutId/step/:stepIndex/attachment', authenticate, deleteStepAttachment);
router.get('/:checkoutId/step/:stepIndex/attachment/debug', authenticate, debugAttachment);
router.get('/:checkoutId/step/:stepIndex/attachment/test', authenticate, testS3File);

export default router;
