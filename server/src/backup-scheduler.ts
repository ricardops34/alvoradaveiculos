import fs from 'fs';
import path from 'path';
import { ensureBackupsDir } from './uploads';
import { buildBackupSnapshot } from './routes/backup';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // checa a cada hora se já é hora de um novo backup
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000; // não repete backup antes de ~20h do último (tolerante a reinícios)
const MAX_BACKUPS = 14; // mantém as últimas 2 semanas de backups diários

async function runBackupIfDue() {
  try {
    const dir = ensureBackupsDir();
    const existentes = fs.readdirSync(dir).filter(f => f.startsWith('auto_') && f.endsWith('.json')).sort();
    const ultimo = existentes[existentes.length - 1];

    if (ultimo) {
      const idadeMs = Date.now() - fs.statSync(path.join(dir, ultimo)).mtimeMs;
      if (idadeMs < MIN_INTERVAL_MS) return;
    }

    const snapshot = await buildBackupSnapshot();
    const filename = `auto_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(snapshot));
    console.log(`🗄️  Backup automático salvo: ${filename}`);

    const atualizados = fs.readdirSync(dir).filter(f => f.startsWith('auto_') && f.endsWith('.json')).sort();
    const excedentes = atualizados.slice(0, Math.max(0, atualizados.length - MAX_BACKUPS));
    for (const antigo of excedentes) {
      fs.unlinkSync(path.join(dir, antigo));
    }
  } catch (err) {
    console.error('Erro no backup automático:', err);
  }
}

// Chamado uma vez na subida do servidor (server/src/index.ts). Roda um backup na hora (se
// já não tiver rodado um nas últimas ~20h) e depois verifica a cada hora — assim funciona
// mesmo que o container reinicie no meio do dia, sem precisar de um cron externo.
export function startBackupScheduler() {
  runBackupIfDue();
  setInterval(runBackupIfDue, CHECK_INTERVAL_MS);
}
