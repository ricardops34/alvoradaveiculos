import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Autenticação dos Clientes da loja pública — token próprio, separado dos usuários do CRM
// (auth.ts/authMiddleware). Usa o mesmo JWT_SECRET do servidor (já validado em middleware/auth.ts
// para nunca ficar com um segredo fraco em produção), mas o payload tem `tipo: 'cliente'` e o
// middleware recusa um token de usuário do CRM tentando se passar por cliente (e vice-versa).
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-nao-usar-em-producao';
const JWT_EXPIRES_IN = '30d';

export interface ClienteAuthPayload {
  id: number;
  nome: string;
  tipo: 'cliente';
}

export interface ClienteAuthRequest extends Request {
  cliente?: ClienteAuthPayload;
}

export function signClienteToken(payload: ClienteAuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function clienteAuthMiddleware(req: ClienteAuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Faça login para continuar.' });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as ClienteAuthPayload;
    if (payload.tipo !== 'cliente') {
      res.status(401).json({ error: 'Token inválido.' });
      return;
    }
    req.cliente = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada, faça login novamente.' });
  }
}
