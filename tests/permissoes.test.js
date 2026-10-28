// Usa o executor de testes do próprio Node, sem outra dependência de testes.
import test from 'node:test';
// Compara valores e erros de forma estrita para que uma conversão automática não esconda uma falha.
import assert from 'node:assert/strict';
// Reutiliza a regra de perfil tanto na rota quanto nas verificações da área.
import { exigirPerfil, informacoesDoPerfil } from '../src/auth/permissoes.js';
// Confere que o caso inválido é recusado com a regra esperada, e não aceito silenciosamente.
test('recepção acessa sua área e não a de outro perfil', () => {
  // Identidade autenticada e token do pedido, sem pedir que o usuário informe seu próprio nome.
  const sessao = {
    // Devolve somente a identidade necessária à interface, sem senha ou hash.
    usuario: {
      // Perfil conhecido pelo backend, utilizado nas regras de acesso.
      perfil: 'recepcao',
    },
  };
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.doesNotThrow(() => exigirPerfil(sessao, ['recepcao']));
  // Confere que o caso inválido é recusado com a regra esperada, e não aceito silenciosamente.
  assert.throws(
    () => exigirPerfil(sessao, ['medico']),
    (erro) => erro.status === 403,
  );
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(informacoesDoPerfil(sessao, 'recepcao').perfil, 'recepcao');
});
// Confere que o caso inválido é recusado com a regra esperada, e não aceito silenciosamente.
test('perfil desconhecido e acesso cruzado são recusados', () => {
  // Confere que o caso inválido é recusado com a regra esperada, e não aceito silenciosamente.
  assert.throws(
    () =>
      informacoesDoPerfil(
        {
          // Devolve somente a identidade necessária à interface, sem senha ou hash.
          usuario: {
            // Perfil conhecido pelo backend, utilizado nas regras de acesso.
            perfil: 'medico',
          },
        },
        'admin',
      ),
    (erro) => erro.status === 404,
  );
  // Confere que o caso inválido é recusado com a regra esperada, e não aceito silenciosamente.
  assert.throws(
    () =>
      informacoesDoPerfil(
        {
          // Devolve somente a identidade necessária à interface, sem senha ou hash.
          usuario: {
            // Perfil conhecido pelo backend, utilizado nas regras de acesso.
            perfil: 'enfermagem',
          },
        },
        'recepcao',
      ),
    (erro) => erro.status === 403,
  );
});
