// Usa o executor de testes do próprio Node, sem outra dependência de testes.
import test from 'node:test';
// Compara valores e erros de forma estrita para que uma conversão automática não esconda uma falha.
import assert from 'node:assert/strict';
// Reutiliza a derivação de senhas em vez de guardar ou comparar a senha em texto no banco.
import { gerarHash, conferirSenha } from '../src/auth/senhas.js';
// Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
test('hash usa salt e reconhece a senha correta', async () => {
  // Primeiro hash gerado para verificar se o salt impede resultados idênticos.
  const primeiro = await gerarHash('SenhaDeTeste!');
  // Outro hash da mesma senha, que deve ser diferente por usar outro salt.
  const segundo = await gerarHash('SenhaDeTeste!');
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.notEqual(primeiro, segundo);
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(await conferirSenha('SenhaDeTeste!', primeiro), true);
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(await conferirSenha('OutraSenha!', primeiro), false);
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(await conferirSenha('SenhaDeTeste!', 'registro inválido'), false);
});
