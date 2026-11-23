import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizarAtendimento } from '../src/atendimentos/finalizacao.js';

const anterior = process.env.DB_ENGINE;
process.env.DB_ENGINE = 'oracle';

test.after(() => {
  process.env.DB_ENGINE = anterior;
});

function criarBanco(situacao, consultaExiste = true) {
  let commits = 0;
  let rollbacks = 0;
  const atualizacoes = [];
  const conexao = {
    async execute(sql, binds) {
      if (sql.includes('FROM atendimentos'))
        return { rows: [{ id: binds.atendimento_id, situacao }] };
      if (sql.includes('FROM consultas')) return { rows: consultaExiste ? [{ id: 101 }] : [] };
      if (sql.includes('UPDATE atendimentos')) atualizacoes.push(sql);
      return { rows: [] };
    },
    async commit() {
      commits += 1;
    },
    async rollback() {
      rollbacks += 1;
    },
    async close() {},
  };
  return {
    banco: { getConnection: async () => conexao },
    contadores: () => ({ commits, rollbacks, atualizacoes }),
  };
}

test('finaliza atendimento em atendimento com consulta registrada', async () => {
  const mock = criarBanco('em_atendimento', true);
  const resultado = await finalizarAtendimento(mock.banco, { atendimento_id: 44 });
  const contadores = mock.contadores();
  assert.equal(resultado.situacao, 'finalizado');
  assert.equal(resultado.ja_finalizado, false);
  assert.equal(contadores.commits, 1);
  assert.equal(contadores.atualizacoes.length, 1);
});

test('repetição informa que já está finalizado sem atualizar novamente', async () => {
  const mock = criarBanco('finalizado', true);
  const resultado = await finalizarAtendimento(mock.banco, { atendimento_id: 44 });
  const contadores = mock.contadores();
  assert.equal(resultado.ja_finalizado, true);
  assert.equal(contadores.atualizacoes.length, 0);
});

test('recusa atendimento sem consulta médica', async () => {
  const mock = criarBanco('em_atendimento', false);
  await assert.rejects(
    finalizarAtendimento(mock.banco, { atendimento_id: 44 }),
    (erro) => erro.status === 409,
  );
  assert.equal(mock.contadores().rollbacks, 1);
});

test('recusa situação incompatível e atendimento inexistente', async () => {
  const mockInvalido = criarBanco('aguardando_medico', true);
  await assert.rejects(
    finalizarAtendimento(mockInvalido.banco, { atendimento_id: 44 }),
    (erro) => erro.status === 409,
  );
  await assert.rejects(
    finalizarAtendimento(
      {
        getConnection: async () => ({
          async execute() {
            return { rows: [] };
          },
          async rollback() {},
          async close() {},
        }),
      },
      { atendimento_id: 999 },
    ),
    (erro) => erro.status === 404,
  );
});
