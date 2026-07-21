import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import seed from './seed';
import { authMiddleware, requireRotina, requireAdmin } from './middleware/auth';
import { UPLOADS_ROOT, ensureUploadsDir } from './uploads';

// Rotas
import authRoutes from './routes/auth';
import perfisRoutes from './routes/perfis';
import bancosRoutes from './routes/bancos';
import pessoasRoutes from './routes/pessoas';
import centrosCustoRoutes from './routes/centros-custo';
import veiculosRoutes from './routes/veiculos';
import movimentosRoutes from './routes/movimentos';
import usuariosRoutes from './routes/usuarios';
import dashboardRoutes from './routes/dashboard';
import marcasRoutes from './routes/marcas';
import modelosRoutes from './routes/modelos';
import configRoutes from './routes/config';
import vendedoresRoutes from './routes/vendedores';
import contasRoutes from './routes/contas';
import backupRoutes from './routes/backup';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// Uploads persistentes (logo/favicon/fundo de login, fotos de veículos) — pasta montada
// como volume Docker em produção para sobreviver a redeploys (ver docker-compose.yml).
ensureUploadsDir('.');
app.use('/uploads', express.static(UPLOADS_ROOT));

// Rotas da API
// Cada módulo exige, além de um token válido, que o perfil do usuário tenha a rotina correspondente
// (Administrador sempre passa). Marcas/Modelos são sub-recursos de Veículos e usam a mesma rotina.
app.use('/api/auth', authRoutes);
app.use('/api/perfis', authMiddleware, requireRotina('perfis'), perfisRoutes);
app.use('/api/bancos', authMiddleware, requireRotina('bancos'), bancosRoutes);
app.use('/api/pessoas', authMiddleware, requireRotina('pessoas'), pessoasRoutes);
app.use('/api/centros-custo', authMiddleware, requireRotina('centros_custo'), centrosCustoRoutes);
app.use('/api/veiculos', authMiddleware, requireRotina('veiculos'), veiculosRoutes);
app.use('/api/movimentos', authMiddleware, requireRotina('movimentos'), movimentosRoutes);
app.use('/api/usuarios', authMiddleware, requireRotina('usuarios'), usuariosRoutes);
app.use('/api/dashboard', authMiddleware, requireRotina('dashboard'), dashboardRoutes);
app.use('/api/marcas', authMiddleware, requireRotina('veiculos'), marcasRoutes);
app.use('/api/modelos', authMiddleware, requireRotina('veiculos'), modelosRoutes);
app.use('/api/vendedores', authMiddleware, requireRotina('relatorio_despesas'), vendedoresRoutes);
app.use('/api/contas', authMiddleware, requireRotina('contas'), contasRoutes);
app.use('/api/backup', authMiddleware, requireAdmin, backupRoutes);
// /api/config protege cada rota individualmente (GET /parametros fica público para a tela de login,
// o resto exige perfil Administrador — ver config.ts)
app.use('/api/config', configRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicialização
async function start() {
  try {
    // Executar seed (cria tabelas e dados se necessário)
    await seed();
    console.log('✅ Banco de dados inicializado.');

    app.listen(PORT, () => {
      console.log(`🚀 Alvorada API rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Erro ao iniciar servidor:', err);
    process.exit(1);
  }
}

start();
