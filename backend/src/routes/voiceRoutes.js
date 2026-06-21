import { Router } from 'express';
import multer from 'multer';
import { transcribe } from '../controllers/voiceController.js';

// multer em memória — sem gravar no disco antes de passar ao controller
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const router = Router();

// POST /voice/transcribe — recebe áudio via FormData (campo "file") e devolve texto
router.post('/transcribe', upload.single('file'), transcribe);

export default router;
