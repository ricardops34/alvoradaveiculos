import { Router, Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    const result = await pool.query(
      'SELECT u.*, p.nome as perfil_nome, p.rotinas FROM usuarios u LEFT JOIN perfis p ON u.perfil_id = p.id WHERE u.email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const user = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    res.json({
      id: user.id.toString(),
      email: user.email,
      name: user.nome,
      role: user.perfil_id === 1 ? 'admin' : 'user',
      permissoes: user.rotinas || [],
      theme: user.theme || 'light'
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
