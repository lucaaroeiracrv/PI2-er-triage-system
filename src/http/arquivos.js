// Publica somente o conteúdo de public; código do servidor e credenciais ficam fora.
import { readFile } from 'node:fs/promises';
// Resolve caminhos a partir do módulo, mantendo a execução após mover as pastas do projeto.
import { fileURLToPath } from 'node:url';
// Resolve caminhos a partir do módulo, mantendo a execução após mover as pastas do projeto.
import path from 'node:path';
// Compartilha erros e respostas HTTP para manter o mesmo tratamento entre os módulos.
import { ErroHttp } from './respostas.js';
// Caminho absoluto da pasta permitida, independente do diretório de onde o comando foi iniciado.
const pastaPublica = path.resolve(fileURLToPath(new URL('../../public/', import.meta.url)));
// Tipos de conteúdo aceitos; a lista também impede publicar arquivos privados de outras extensões.
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};
// Limita a leitura de arquivos à pasta pública, preservando o código privado e as credenciais.
export async function servirArquivo(res, pathname, inicio) {
  // Caminho pedido pelo navegador, que será conferido antes da leitura do arquivo.
  let relativo;
  try {
    relativo = decodeURIComponent(pathname).replace(/^\/+/, '');
  } catch {
    throw new ErroHttp(400, 'Endereço inválido.');
  }
  if (!relativo) {
    relativo = inicio;
  }
  if (relativo === 'ABRIR_PRIMEIRO.html') {
    // Envia o status e os cabeçalhos antes do corpo para que o navegador interprete a resposta corretamente.
    res.writeHead(302, {
      Location: '/index.html',
    });
    // Finaliza a resposta para o navegador não continuar aguardando dados.
    res.end();
    return;
  }
  // Endereço resolvido no disco; a conferência do prefixo impede sair da pasta pública.
  const caminho = path.resolve(pastaPublica, relativo);
  // Tipo HTTP do arquivo, necessário para o navegador interpretar o conteúdo corretamente.
  const tipo = tipos[path.extname(caminho)];
  // Confere o destino resolvido antes de permitir que um caminho recebido alcance arquivos do disco.
  if (!caminho.startsWith(pastaPublica + path.sep) || !tipo) {
    throw new ErroHttp(404, 'Arquivo não encontrado.');
  }
  // Conteúdo já lido ou convertido; só é usado depois da verificação da operação.
  let conteudo;
  try {
    conteudo = await readFile(caminho);
  } catch (erro) {
    // Traduz apenas a falha prevista; um erro desconhecido continua visível no tratamento central.
    if (erro.code === 'ENOENT' || erro.code === 'EISDIR') {
      throw new ErroHttp(404, 'Arquivo não encontrado.');
    }
    // Mantém a falha original para que o tratamento central registre a causa e encerre a operação.
    throw erro;
  }
  // Envia o status e os cabeçalhos antes do corpo para que o navegador interprete a resposta corretamente.
  res.writeHead(200, {
    // Informa ao navegador o formato e a codificação da resposta.
    'Content-Type': tipo,
    // Impede o navegador de adivinhar outro formato para este conteúdo.
    'X-Content-Type-Options': 'nosniff',
    // Restringe recursos à própria origem; frames próprios permitem reutilizar as telas nos rascunhos.
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    // Evita reaproveitar em cache respostas que podem conter dados de uma sessão.
    'Cache-Control': 'no-store',
    // Evita enviar caminhos internos como referência para outros sites.
    'Referrer-Policy': 'same-origin',
  });
  // Finaliza a resposta para o navegador não continuar aguardando dados.
  res.end(conteudo);
}
