import { Router, Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.perfil_id, u.theme, p.nome as perfil_nome
       FROM usuarios u LEFT JOIN perfis p ON u.perfil_id = p.id ORDER BY u.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, email, senha, perfil_id, theme } = req.body;
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO usuarios (nome, email, senha, perfil_id, theme) VALUES ($1,$2,$3,$4,$5) RETURNING id, nome, email, perfil_id, theme',
      [nome, email, senhaHash, perfil_id, theme || 'light']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, perfil_id, theme } = req.body;

    // Se senha foi fornecida, atualizar com hash
    if (senha) {
      const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
      const result = await pool.query(
        'UPDATE usuarios SET nome=$1, email=$2, senha=$3, perfil_id=$4, theme=$5 WHERE id=$6 RETURNING id, nome, email, perfil_id, theme',
        [nome, email, senhaHash, perfil_id, theme, id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }
      res.json(result.rows[0]);
    } else {
      const result = await pool.query(
        'UPDATE usuarios SET nome=$1, email=$2, perfil_id=$3, theme=$4 WHERE id=$5 RETURNING id, nome, email, perfil_id, theme',
        [nome, email, perfil_id, theme, id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH - Atualizar apenas o tema
router.patch('/:id/theme', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { theme } = req.body;
    await pool.query('UPDATE usuarios SET theme = $1 WHERE id = $2', [theme, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar tema:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
