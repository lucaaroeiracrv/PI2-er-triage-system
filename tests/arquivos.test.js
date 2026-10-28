// A reorganização não pode publicar configurações, SQL ou código privado por engano.
import test from 'node:test';
// Compara valores e erros de forma estrita para que uma conversão automática não esconda uma falha.
import assert from 'node:assert/strict';
// Reutiliza este módulo para manter sua responsabilidade fora do fluxo principal do servidor.
import { servirArquivo } from '../src/http/arquivos.js';
// Isola esta rotina para que os demais trechos reutilizem a mesma regra.
function respostaDeTeste() {
  return {
    status: null,
    cabecalhos: {},
    conteudo: null,
    writeHead(status, cabecalhos) {
      // Guarda o status da falha prevista; um erro de validação não deve virar erro interno 500.
      this.status = status;
      this.cabecalhos = cabecalhos;
    },
    end(conteudo) {
      this.conteudo = conteudo;
    },
  };
}
// Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
test('a nova raiz pública entrega o índice e permite frames da própria origem', async () => {
  const resposta = respostaDeTeste();
  await servirArquivo(resposta, '/', 'index.html');
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(resposta.status, 200);
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.match(resposta.conteudo.toString(), /Sistema de atendimento/);
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.match(resposta.cabecalhos['Content-Security-Policy'], /frame-ancestors 'self'/);
});
// Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
test('o endereço antigo do índice continua apontando para a nova organização', async () => {
  const resposta = respostaDeTeste();
  await servirArquivo(resposta, '/ABRIR_PRIMEIRO.html', 'index.html');
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(resposta.status, 302);
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(resposta.cabecalhos.Location, '/index.html');
});
// Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
test('configuração, SQL e tentativas de sair da pasta pública são recusados', async () => {
  // Processa cada elemento de forma independente para preservar a relação entre os dados da mesma iteração.
  for (// Endereço resolvido no disco; a conferência do prefixo impede sair da pasta pública.
  const caminho of [
    '/.env',
    '/src/config/banco.js',
    '/database/estrutura.sql',
    '/../package.json',
    '/%2e%2e/%2e%2e/.env',
  ]) {
    // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
    await assert.rejects(
      servirArquivo(respostaDeTeste(), caminho, 'index.html'),
      (erro) => erro.status === 404,
    );
  }
});
// Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
test('um endereço com escape inválido recebe erro de entrada, não falha interna', async () => {
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  await assert.rejects(
    servirArquivo(respostaDeTeste(), '/%ZZ', 'index.html'),
    (erro) => erro.status === 400,
  );
});
