import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';

// Diretório persistente de uploads: relativo à raiz do projeto compilado (dist/../uploads = /app/uploads
// em produção), montado como volume Docker nomeado para sobreviver a redeploys (ver docker-compose.yml).
// Servido publicamente via express.static em /uploads — nunca gravar aqui nada sensível (segredos, chaves privadas).
export const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

// Diretório privado: mesma persistência via volume Docker, mas NUNCA montado com express.static.
// Usado para segredos que só o backend deve ler (ex: certificado digital do RENAVE).
export const PRIVATE_ROOT = path.join(__dirname, '..', 'private');

export function ensureUploadsDir(subdir: string): string {
  const dir = path.join(UPLOADS_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ensurePrivateDir(subdir: string): string {
  const dir = path.join(PRIVATE_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Storage privado com nome de arquivo previsível — usado para segredos "singleton" (ex: certificado
// digital), nunca acessível via HTTP. Um novo upload substitui o anterior.
export function createPrivateUploadMiddleware(subdir: string, filename: string) {
  const dir = ensurePrivateDir(subdir);
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, _file, cb) => cb(null, filename)
  });
  return multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
}

// Storage com nome de arquivo único: evita colisão entre uploads concorrentes (ex: várias
// fotos de veículos diferentes com o mesmo nome original "foto.jpg").
export function createUploadMiddleware(subdir: string) {
  const dir = ensureUploadsDir(subdir);
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, uniqueName);
    }
  });
  return multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } });
}

// Storage com nome de arquivo previsível (mesmo nome original, sanitizado): usado para
// arquivos "singleton" como logo/favicon, onde um novo upload deve substituir o anterior.
export function createPredictableUploadMiddleware(subdir: string) {
  const dir = ensureUploadsDir(subdir);
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => cb(null, path.basename(file.originalname))
  });
  return multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } });
}

export function deleteUploadedFile(subdir: string, filename: string) {
  const dir = path.join(UPLOADS_ROOT, subdir);
  const filePath = path.join(dir, path.basename(filename));
  if (filePath.startsWith(dir) && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
