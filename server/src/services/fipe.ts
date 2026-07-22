import pool from '../db';

/**
 * ATENÇÃO: assim como o cliente do RENAVE (ver renave.ts), esta integração com a API da
 * Invertexto (https://api.invertexto.com/api-tabela-fipe) foi implementada sem um token real
 * para testar — a estrutura de endpoints abaixo é a documentada publicamente pelo serviço, mas
 * nunca foi validada contra uma resposta real. Ajuste os caminhos/campos se a resposta vier
 * diferente do esperado assim que houver um token disponível para teste.
 */

const FIPE_BASE_URL = 'https://api.invertexto.com/v1/fipe';

// 1 = carros, 2 = motos, 3 = caminhões (códigos da tabela FIPE) — nosso `tipo_veiculo` não tem
// "Náutica" na FIPE, então não há mapeamento pra esse tipo.
const TIPO_VEICULO_FIPE: Record<string, number> = {
  Carro: 1,
  Moto: 2,
  Caminhão: 3
};

async function getToken(): Promise<string> {
  const result = await pool.query('SELECT invertexto_token FROM parametros WHERE id = 1');
  const token = result.rows[0]?.invertexto_token;
  if (!token) {
    throw new Error('Token da tabela FIPE (Invertexto) não configurado em Configurações.');
  }
  return token;
}

async function fipeGet(path: string): Promise<any> {
  const token = await getToken();
  const resp = await fetch(`${FIPE_BASE_URL}${path}${path.includes('?') ? '&' : '?'}token=${token}`);
  if (!resp.ok) {
    throw new Error(`Tabela FIPE retornou erro (${resp.status})`);
  }
  return resp.json();
}

export async function buscarMarcasFipe(tipoVeiculo: string) {
  const tipo = TIPO_VEICULO_FIPE[tipoVeiculo];
  if (!tipo) throw new Error(`Tipo de veículo "${tipoVeiculo}" não é suportado pela tabela FIPE.`);
  return fipeGet(`/brands/${tipo}`);
}

export async function buscarModelosFipe(tipoVeiculo: string, marcaFipeId: string) {
  const tipo = TIPO_VEICULO_FIPE[tipoVeiculo];
  if (!tipo) throw new Error(`Tipo de veículo "${tipoVeiculo}" não é suportado pela tabela FIPE.`);
  return fipeGet(`/models/${tipo}/${marcaFipeId}`);
}

export async function buscarAnosFipe(tipoVeiculo: string, marcaFipeId: string, modeloFipeId: string) {
  const tipo = TIPO_VEICULO_FIPE[tipoVeiculo];
  if (!tipo) throw new Error(`Tipo de veículo "${tipoVeiculo}" não é suportado pela tabela FIPE.`);
  return fipeGet(`/years/${tipo}/${marcaFipeId}/${modeloFipeId}`);
}

export async function buscarPrecoFipe(tipoVeiculo: string, marcaFipeId: string, modeloFipeId: string, anoFipeId: string) {
  const tipo = TIPO_VEICULO_FIPE[tipoVeiculo];
  if (!tipo) throw new Error(`Tipo de veículo "${tipoVeiculo}" não é suportado pela tabela FIPE.`);
  return fipeGet(`/price/${tipo}/${marcaFipeId}/${modeloFipeId}/${anoFipeId}`);
}
