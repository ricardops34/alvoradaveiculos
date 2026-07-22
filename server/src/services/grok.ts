import pool from '../db';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-4-fast';

async function getGrokConfig() {
  const result = await pool.query('SELECT grok_api_key, grok_ativo FROM parametros WHERE id = 1');
  const row = result.rows[0];
  if (!row?.grok_ativo || !row?.grok_api_key) {
    throw new Error('Assistente de IA não configurado.');
  }
  return row;
}

export async function grokEstaConfigurado(): Promise<boolean> {
  try {
    await getGrokConfig();
    return true;
  } catch {
    return false;
  }
}

// Contexto passado ao modelo a cada pergunta: só os veículos publicados no site (nunca dados
// internos como custo de aquisição) + ficha técnica quando existir. Mantém curto (top 40) pra
// não estourar o limite de tokens do prompt.
export async function montarContextoEstoque(): Promise<string> {
  const result = await pool.query(`
    SELECT v.id, v.tipo_veiculo, ma.nome as marca_nome, mo.nome as modelo_nome, v.versao,
           v.ano_fabricacao, v.ano_modelo, v.cor, v.quilometragem, v.valor_avaliacao, v.valor_fipe,
           v.opcionais,
           f.motor, f.potencia, f.cambio, f.consumo_cidade, f.consumo_estrada
    FROM veiculos v
    LEFT JOIN marcas ma ON v.marca_id = ma.id
    LEFT JOIN modelos mo ON v.modelo_id = mo.id
    LEFT JOIN fichas_tecnicas f ON f.modelo_id = v.modelo_id
    WHERE v.publicado = true AND v.status IN ('Estoque', 'Preparação')
    ORDER BY v.id DESC
    LIMIT 40
  `);

  if (result.rows.length === 0) return 'Nenhum veículo disponível no momento.';

  return result.rows.map(v => {
    const preco = v.valor_avaliacao || v.valor_fipe;
    const partes = [
      `#${v.id}: ${v.marca_nome || ''} ${v.modelo_nome || ''} ${v.versao || ''}`.trim(),
      `Ano ${v.ano_fabricacao || '?'}/${v.ano_modelo || '?'}`,
      `Cor ${v.cor || '?'}`,
      `${v.quilometragem ?? '?'} km`,
      preco ? `R$ ${Number(preco).toLocaleString('pt-BR')}` : 'preço sob consulta',
      v.motor ? `Motor ${v.motor}` : null,
      v.cambio ? `Câmbio ${v.cambio}` : null,
      v.opcionais?.length ? `Opcionais: ${v.opcionais.join(', ')}` : null
    ].filter(Boolean);
    return '- ' + partes.join(' | ');
  }).join('\n');
}

export async function perguntarAoAssistente(pergunta: string, historico: { role: string; content: string }[] = []): Promise<string> {
  const config = await getGrokConfig();
  const contexto = await montarContextoEstoque();

  const systemPrompt = `Você é o assistente virtual de uma loja de veículos (carros, motos, caminhões e náutica). Responda de forma breve, simpática e SOMENTE com base no estoque abaixo — nunca invente veículo, preço ou opcional que não esteja listado. Se o cliente perguntar algo fora do estoque ou pedir para falar com um vendedor, oriente a usar o botão de WhatsApp da página do veículo ou entrar em contato pelo site.

Estoque disponível agora:
${contexto}`;

  const resp = await fetch(GROK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.grok_api_key}`
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historico.slice(-10),
        { role: 'user', content: pergunta }
      ],
      temperature: 0.4
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Grok retornou erro (${resp.status}): ${errText.slice(0, 300)}`);
  }

  const data = await resp.json() as any;
  return data?.choices?.[0]?.message?.content || 'Não consegui gerar uma resposta agora, tente novamente.';
}
