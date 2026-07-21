import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const DEV_FALLBACK_SECRET = 'dev-secret-nao-usar-em-producao';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET antes de iniciar o servidor em produção.');
}

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET não configurado — usando segredo de desenvolvimento inseguro. Não use isto em produção.');
}

const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;
const JWT_EXPIRES_IN = '7d';

export const ADMIN_PERFIL_ID = 1;

export interface AuthPayload {
  id: number;
  email: string;
  perfil_id: number | null;
  rotinas: string[];
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Deve ser usado sempre depois de authMiddleware. Administrador (perfil_id 1) tem acesso irrestrito;
// os demais perfis só passam se a rotina informada estiver na lista de rotinas do seu perfil.
export function requireRotina(rotina: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }
    if (req.user.perfil_id === ADMIN_PERFIL_ID) {
      next();
      return;
    }
    if (req.user.rotinas?.includes(rotina)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Você não tem permissão para acessar este recurso.' });
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }
  if (req.user.perfil_id !== ADMIN_PERFIL_ID) {
    res.status(403).json({ error: 'Apenas administradores podem acessar este recurso.' });
    return;
  }
  next();
}
