import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import seed from './seed';

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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/perfis', perfisRoutes);
app.use('/api/bancos', bancosRoutes);
app.use('/api/pessoas', pessoasRoutes);
app.use('/api/centros-custo', centrosCustoRoutes);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/movimentos', movimentosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/marcas', marcasRoutes);
app.use('/api/modelos', modelosRoutes);
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
