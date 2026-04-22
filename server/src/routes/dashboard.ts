import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Buscar todos os dados necessários em paralelo
    const [vehiclesRes, movementsRes, banksRes] = await Promise.all([
      pool.query('SELECT * FROM veiculos'),
      pool.query('SELECT * FROM movimentos'),
      pool.query('SELECT * FROM bancos')
    ]);

    const vehicles = vehiclesRes.rows;
    const movements = movementsRes.rows;
    const banks = banksRes.rows;

    // 1. Total em estoque
    const totalStockValue = vehicles
      .filter(v => v.status !== 'Vendido')
      .reduce((sum, v) => sum + parseFloat(v.valor_compra || 0), 0);

    const vehiclesCount = vehicles.filter(v => v.status !== 'Vendido').length;
    const soldVehiclesCount = vehicles.filter(v => v.status === 'Vendido').length;

    // 2. Saldo bancário = saldos iniciais + movimentos
    const totalInitialBalance = banks.reduce((sum, b) => sum + parseFloat(b.saldo_inicial || 0), 0);
    const totalMovements = movements.reduce((sum, m) => sum + parseFloat(m.valor), 0);
    const totalBankBalance = totalInitialBalance + totalMovements;

    // 3. Receitas vs Despesas do mês atual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthMovements = movements.filter(m => {
      const d = new Date(m.data);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const revenue = monthMovements
      .filter(m => m.tipo === 'Crédito')
      .reduce((sum, m) => sum + parseFloat(m.valor), 0);
    const expenses = monthMovements
      .filter(m => m.tipo === 'Débito')
      .reduce((sum, m) => sum + Math.abs(parseFloat(m.valor)), 0);

    // 4. Veículos por status
    const statusCounts: { [key: string]: number } = {};
    vehicles.forEach(v => {
      statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
    });

    res.json({
      totalStockValue,
      vehiclesCount,
      soldVehiclesCount,
      totalBankBalance,
      revenue,
      expenses,
      statusCounts
    });
  } catch (err) {
    console.error('Erro ao calcular dashboard:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
