// Pequenos recursos compartilhados: respostas JSON, leitura do corpo e erros esperados.
export class ErroHttp extends Error {
  // Associa mensagem e status à mesma falha para que o tratamento HTTP preserve o motivo informado.
  constructor(status, mensagem) {
    // Mantém a mensagem na classe Error para que o tratamento central possa apresentá-la.
    super(mensagem);
    // Guarda o status da falha prevista; um erro de validação não deve virar erro interno 500.
    this.status = status;
  }
}
// Padroniza as respostas JSON e impede que informações de sessão fiquem em cache.
export function responder(res, status, dados, cabecalhos = {}) {
  // Envia o status e os cabeçalhos antes do corpo para que o navegador interprete a resposta corretamente.
  res.writeHead(status, {
    // Informa ao navegador o formato e a codificação da resposta.
    'Content-Type': 'application/json; charset=utf-8',
    // Evita reaproveitar em cache respostas que podem conter dados de uma sessão.
    'Cache-Control': 'no-store',
    // Impede o navegador de adivinhar outro formato para este conteúdo.
    'X-Content-Type-Options': 'nosniff',
    ...cabecalhos,
  });
  // Finaliza a resposta para o navegador não continuar aguardando dados.
  res.end(JSON.stringify(dados));
}
// Recebe o corpo aos poucos, limita seu tamanho e só aceita um objeto JSON.
export async function lerJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) {
    throw new ErroHttp(415, 'Envie os dados como JSON.');
  }
  // Corpo completo recebido do navegador, que ainda precisa ser convertido e conferido como objeto JSON.
  const texto = await new Promise((resolve, reject) => {
    // Acumula os trechos recebidos até ser possível interpretar o JSON completo.
    const partes = [];
    // Soma os bytes recebidos para aplicar o limite antes de processar um corpo muito grande.
    let tamanho = 0;
    // Marca um corpo rejeitado para que seus próximos trechos não sejam guardados.
    let excedeu = false;
    // Processa o evento quando o trecho de dados ou o término da operação é informado pelo Node.
    req.on('data', (parte) => {
      tamanho += parte.length;
      // Recusa o corpo acima do limite antes de manter seus próximos trechos em memória.
      if (tamanho > 65536) {
        excedeu = true;
        // Descarta os bytes acumulados de um pedido já recusado para liberar a memória utilizada.
        partes.length = 0;
        // Sinaliza a falha à rotina que está aguardando o corpo, sem tentar interpretar dados incompletos.
        reject(new ErroHttp(413, 'Os dados enviados são muito grandes.'));
      } else // Um corpo já recusado não deve voltar ao fluxo normal de leitura.
      if (!excedeu) {
        partes.push(parte);
      }
    });
    // Processa o evento quando o trecho de dados ou o término da operação é informado pelo Node.
    req.on('end', () => {
      // Um corpo já recusado não deve voltar ao fluxo normal de leitura.
      if (!excedeu) {
        // Entrega o corpo completo ao processamento assíncrono quando a leitura termina.
        resolve(Buffer.concat(partes).toString('utf8'));
      }
    });
    // Processa o evento quando o trecho de dados ou o término da operação é informado pelo Node.
    req.on('error', reject);
  });
  try {
    // Dados de entrada ou resposta, cujo formato será conferido antes do uso.
    const dados = JSON.parse(texto);
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
      throw new Error();
    }
    return dados;
  } catch {
    throw new ErroHttp(400, 'O conteúdo JSON está inválido.');
  }
}
// Recusa envios de outro site; o painel usa o mesmo endereço do backend.
export function conferirOrigem(req) {
  // O painel e o backend estão no mesmo endereço. Rejeita envios vindos de outro site.
  if (!req.headers.origin) {
    return;
  } // Permite clientes locais como curl/Postman.
  let origem;
  try {
    origem = new URL(req.headers.origin);
  } catch {
    throw new ErroHttp(403, 'Origem não permitida.');
  }
  // Mantém a conferência de origem compatível com o uso local de HTTP ou com HTTPS.
  const protocolo = process.env.COOKIE_SECURE === 'true' ? 'https:' : 'http:';
  // A comparação de origem permite o painel local e rejeita pedidos de outro site.
  if (origem.host !== req.headers.host || origem.protocol !== protocolo) {
    throw new ErroHttp(403, 'Origem não permitida.');
  }
}
