import { Router, type Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

router.post('/', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  const bucket = process.env.AWS_S3_BUCKET!;
  if (!bucket) {
    return res.status(500).json({ error: 'Bucket S3 no configurado' });
  }

  const ext = req.file.originalname.includes('.')
    ? req.file.originalname.split('.').pop()
    : '';
  const key = `adjuntos/${randomUUID()}${ext ? '.' + ext : ''}`;

  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const region = process.env.AWS_REGION || 'us-east-1';
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return res.status(200).json({ url, nombre: req.file.originalname });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
