import { Router, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
import { AuthRequest, ADMIN_PERFIL_ID } from '../middleware/auth';

const SALT_ROUNDS = 10;
const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const totalResult = await pool.query('SELECT COUNT(*) FROM usuarios');
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.cpf, u.perfil_id, u.theme, p.nome as perfil_nome
       FROM usuarios u LEFT JOIN perfis p ON u.perfil_id = p.id
       ORDER BY u.id LIMIT $1 OFFSET $2`,
      [Number(limit), offset]
    );

    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total: total
    });
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    // Somente Administrador pode definir o perfil de um novo usuário (evita
    // que um usuário comum crie contas com perfil elevado).
    if (req.user?.perfil_id !== ADMIN_PERFIL_ID) {
      res.status(403).json({ error: 'Apenas administradores podem cadastrar usuários.' });
      return;
    }

    const { nome, email, senha, cpf, perfil_id, theme } = req.body;
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO usuarios (nome, email, senha, cpf, perfil_id, theme) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, nome, email, cpf, perfil_id, theme',
      [nome, email, senhaHash, cpf || null, perfil_id, theme || 'light']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, cpf, theme } = req.body;
    const isAdmin = req.user?.perfil_id === ADMIN_PERFIL_ID;

    // Só o Administrador pode alterar o perfil de um usuário (evita auto-promoção).
    // Para chamadas de não-admin, mantém o perfil_id atual gravado no banco.
    let perfil_id = req.body.perfil_id;
    if (!isAdmin) {
      const current = await pool.query('SELECT perfil_id FROM usuarios WHERE id = $1', [id]);
      if (current.rows.length === 0) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }
      perfil_id = current.rows[0].perfil_id;
    }

    // Se senha foi fornecida, atualizar com hash
    if (senha) {
      const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
      const result = await pool.query(
        'UPDATE usuarios SET nome=$1, email=$2, senha=$3, cpf=$4, perfil_id=$5, theme=$6 WHERE id=$7 RETURNING id, nome, email, cpf, perfil_id, theme',
        [nome, email, senhaHash, cpf || null, perfil_id, theme, id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }
      res.json(result.rows[0]);
    } else {
      const result = await pool.query(
        'UPDATE usuarios SET nome=$1, email=$2, cpf=$3, perfil_id=$4, theme=$5 WHERE id=$6 RETURNING id, nome, email, cpf, perfil_id, theme',
        [nome, email, cpf || null, perfil_id, theme, id]
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
router.patch('/:id/theme', async (req: AuthRequest, res: Response) => {
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

router.delete('/:id', async (req: AuthRequest, res: Response) => {
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
