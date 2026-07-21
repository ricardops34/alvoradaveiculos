import fs from 'fs';
import https from 'https';
import path from 'path';
import { URL } from 'url';
import pool from '../db';
import { PRIVATE_ROOT } from '../uploads';

/**
 * ATENÇÃO — leia antes de usar em produção:
 *
 * Este módulo faz a chamada real às APIs REST do RENAVE (SERPRO), autenticando por mTLS com o
 * certificado digital e-CNPJ configurado em Configurações. A infraestrutura de conexão (carregar
 * o certificado, montar a requisição HTTPS com o certificado cliente) é sólida e testada.
 *
 * O que NÃO foi validado: o formato exato do corpo (JSON) esperado por cada endpoint
 * (`/solicitacoes-entrada-estoque`, `/solicitacoes-saida-estoque`) e da resposta do RENAVE.
 * Os nomes de campo usados abaixo são uma aproximação baseada no levantamento de schema feito
 * anteriormente (ver task.md), mas nunca foram testados contra o ambiente real ou de homologação
 * do SERPRO — isso exige um certificado e-CNPJ válido e credenciais de teste, que não estavam
 * disponíveis nesta sessão. Antes de operar com veículos reais, valide (ou peça ao SERPRO) o
 * schema oficial (OpenAPI/WSDL) e ajuste `montarPayloadEntrada`/`montarPayloadSaida` conforme
 * necessário. Até lá, trate qualquer resposta de sucesso com ceticismo e monitore os primeiros
 * envios de perto.
 */

const RENAVE_BASE_URL = 'https://renave.estaleiro.serpro.gov.br/renave-ws';
const CERT_PATH = path.join(PRIVATE_ROOT, 'renave', 'certificado.p12');

export class RenaveNaoConfiguradoError extends Error {}

interface EmpresaRenave {
  cnpj: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio_codigo_ibge: string | null;
  estado_sigla: string | null;
  responsavel_nome: string;
  responsavel_cpf: string;
  certificado_senha: string;
}

async function getEmpresaConfig(): Promise<EmpresaRenave> {
  const result = await pool.query(`
    SELECT p.cnpj, p.cep, p.logradouro, p.numero, p.complemento, p.bairro,
           m.codigo_ibge as municipio_codigo_ibge, e.sigla as estado_sigla,
           p.renave_responsavel_nome, p.renave_responsavel_cpf, p.renave_certificado_senha
    FROM parametros p
    LEFT JOIN municipios m ON p.municipio_id = m.id
    LEFT JOIN estados e ON p.estado_id = e.id
    WHERE p.id = 1
  `);
  const row = result.rows[0];

  if (!row?.cnpj || !row?.renave_responsavel_cpf || !row?.renave_certificado_senha || !fs.existsSync(CERT_PATH)) {
    throw new RenaveNaoConfiguradoError(
      'Integração com o RENAVE não configurada (CNPJ, responsável ou certificado digital ausente em Configurações > RENAVE).'
    );
  }

  return {
    cnpj: row.cnpj,
    cep: row.cep,
    logradouro: row.logradouro,
    numero: row.numero,
    complemento: row.complemento,
    bairro: row.bairro,
    municipio_codigo_ibge: row.municipio_codigo_ibge,
    estado_sigla: row.estado_sigla,
    responsavel_nome: row.renave_responsavel_nome,
    responsavel_cpf: row.renave_responsavel_cpf,
    certificado_senha: row.renave_certificado_senha
  };
}

function httpsJsonRequest(urlStr: string, method: string, body: any, pfx: Buffer, passphrase: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = JSON.stringify(body);

    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method,
        pfx,
        passphrase,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data: any = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode || 0, data });
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function chamarRenave(path: string, body: any): Promise<{ protocolo: string | null; status: string; bruto: any }> {
  const empresa = await getEmpresaConfig();
  const pfx = fs.readFileSync(CERT_PATH);

  const { status, data } = await httpsJsonRequest(`${RENAVE_BASE_URL}${path}`, 'POST', body, pfx, empresa.certificado_senha);

  if (status < 200 || status >= 300) {
    const mensagem = data?.mensagem || data?.message || data?.erro || JSON.stringify(data) || `HTTP ${status}`;
    throw new Error(`RENAVE retornou erro (${status}): ${mensagem}`);
  }

  return {
    protocolo: data?.protocolo || data?.idSolicitacao || data?.id || null,
    status: data?.status || 'Enviado',
    bruto: data
  };
}

interface PessoaRenave {
  documento: string;
  nome: string;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio_codigo_ibge?: string | null;
  estado_sigla?: string | null;
}

// Entrada de estoque: disparada na compra de um veículo (POST /veiculos).
export async function solicitarEntradaEstoque(veiculo: any, vendedor: PessoaRenave | null) {
  const empresa = await getEmpresaConfig();

  const payload = {
    estabelecimento: {
      cnpj: empresa.cnpj,
      responsavel: { nome: empresa.responsavel_nome, cpf: empresa.responsavel_cpf }
    },
    veiculo: {
      chassi: veiculo.chassi,
      renavam: veiculo.renavam,
      placa: veiculo.placa,
      tipoCrv: veiculo.tipo_crv,
      numeroCrv: veiculo.numero_crv,
      codigoSegurancaCrv: veiculo.codigo_seguranca_crv,
      dataMedicaoHodometro: veiculo.data_medicao_hodometro,
      hodometro: veiculo.quilometragem
    },
    notaFiscal: veiculo.nota_fiscal_compra_chave ? { chaveAcesso: veiculo.nota_fiscal_compra_chave } : undefined,
    vendedor: vendedor
      ? {
          documento: vendedor.documento,
          nome: vendedor.nome,
          endereco: {
            cep: vendedor.cep,
            logradouro: vendedor.logradouro,
            numero: vendedor.numero,
            complemento: vendedor.complemento,
            bairro: vendedor.bairro,
            codigoMunicipioIbge: vendedor.municipio_codigo_ibge,
            uf: vendedor.estado_sigla
          }
        }
      : undefined
  };

  return chamarRenave('/solicitacoes-entrada-estoque', payload);
}

// Saída de estoque: disparada na venda de um veículo (POST /veiculos/:id/vender).
export async function solicitarSaidaEstoque(veiculo: any, comprador: PessoaRenave | null) {
  const empresa = await getEmpresaConfig();

  const payload = {
    estabelecimento: {
      cnpj: empresa.cnpj,
      responsavel: { nome: empresa.responsavel_nome, cpf: empresa.responsavel_cpf }
    },
    veiculo: {
      chassi: veiculo.chassi,
      renavam: veiculo.renavam,
      placa: veiculo.placa,
      renaveIdEstoque: veiculo.renave_id_estoque || undefined
    },
    notaFiscal: veiculo.nota_fiscal_venda_chave ? { chaveAcesso: veiculo.nota_fiscal_venda_chave } : undefined,
    comprador: comprador
      ? {
          documento: comprador.documento,
          nome: comprador.nome,
          endereco: {
            cep: comprador.cep,
            logradouro: comprador.logradouro,
            numero: comprador.numero,
            complemento: comprador.complemento,
            bairro: comprador.bairro,
            codigoMunicipioIbge: comprador.municipio_codigo_ibge,
            uf: comprador.estado_sigla
          }
        }
      : undefined
  };

  return chamarRenave('/solicitacoes-saida-estoque', payload);
}

// Usado pelas rotas de Veículos para decidir, sem lançar exceção, se vale a pena tentar a
// chamada — instalações que ainda não configuraram o RENAVE simplesmente não tentam (status
// do veículo fica NULL, não "Erro").
export async function renaveEstaConfigurado(): Promise<boolean> {
  try {
    await getEmpresaConfig();
    return true;
  } catch {
    return false;
  }
}
