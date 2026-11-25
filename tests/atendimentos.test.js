import test from 'node:test';
import assert from 'node:assert/strict';
import { buscarAtendimento } from '../src/atendimentos/busca.js';
import { excluirAtendimento } from '../src/atendimentos/exclusao.js';

const engineAnterior = process.env.DB_ENGINE;

test.after(() => {
  if (engineAnterior === undefined) {
    delete process.env.DB_ENGINE;
  } else {
    process.env.DB_ENGINE = engineAnterior;
  }
});

function bancoBusca(linhas, chamadas = []) {
  return {
    async getConnection() {
      return {
        async execute(sql, binds) {
          chamadas.push({ sql, binds });
          return { rows: linhas };
        },
        async close() {},
      };
    },
  };
}

test('busca atendimento exige número e CPF válido e normaliza pontuação', async () => {
  process.env.DB_ENGINE = 'oracle';
  const chamadas = [];
  const esperado = {
    atendimento_id: 44,
    paciente_id: 31,
    paciente_nome: 'Paciente Teste',
    situacao: 'aguardando_triagem',
  };

  assert.deepEqual(
    await buscarAtendimento(bancoBusca([esperado], chamadas), '44', '529.982.247-25'),
    esperado,
  );
  assert.equal(chamadas[0].binds.atendimento_id, 44);
  assert.equal(chamadas[0].binds.documento, '52998224725');
  assert.match(chamadas[0].sql, /a\.id = :atendimento_id/);
  assert.match(chamadas[0].sql, /p\.documento = :documento/);

  for (const [numero, cpf] of [
    ['', '52998224725'],
    ['44', ''],
    ['44', '11111111111'],
    ['44 OR 1=1', '52998224725'],
  ]) {
    await assert.rejects(
      buscarAtendimento(bancoBusca([]), numero, cpf),
      (erro) => erro.status === 400,
    );
  }
});

test('busca não revela atendimento quando o número e o CPF não correspondem', async () => {
  process.env.DB_ENGINE = 'oracle';
  await assert.rejects(
    buscarAtendimento(bancoBusca([]), '44', '52998224725'),
    (erro) => erro.status === 404,
  );
});

function criarBancoExclusao({ situacao = 'aguardando_triagem', registroEm = null } = {}) {
  const comandos = [];
  let commits = 0;
  let rollbacks = 0;
  let fechamentos = 0;
  let transacoes = 0;
  const conexao = {
    async execute(sql, binds = {}) {
      comandos.push({ sql, binds });
      if (sql.includes('FROM atendimentos')) {
        return situacao ? { rows: [{ id: 44, situacao }] } : { rows: [] };
      }
      const tabela = ['triagens', 'consultas', 'medicacoes'].find((nome) =>
        sql.includes(`FROM ${nome}`),
      );
      if (tabela) return { rows: registroEm === tabela ? [{ id: 101 }] : [] };
      return { rows: [] };
    },
    async beginTransaction() {
      transacoes += 1;
    },
    async commit() {
      commits += 1;
    },
    async rollback() {
      rollbacks += 1;
    },
    async close() {
      fechamentos += 1;
    },
  };
  return {
    banco: { getConnection: async () => conexao },
    comandos,
    contadores: () => ({ commits, rollbacks, fechamentos, transacoes }),
  };
}

test('recepção pode excluir somente atendimento sem registros, removendo dependências legais', async () => {
  for (const engine of ['oracle', 'mysql']) {
    process.env.DB_ENGINE = engine;
    const mock = criarBancoExclusao();
    const resultado = await excluirAtendimento(mock.banco, { perfil: 'recepcao' }, {
      atendimento_id: 44,
    });
    const sql = mock.comandos.map(({ sql: comando }) => comando);
    const posicao = (fragmento) => sql.findIndex((comando) => comando.includes(fragmento));

    assert.equal(resultado.sucesso, true);
    assert.ok(posicao('DELETE FROM categorias_prioridade_legal') < posicao('DELETE FROM prioridades_legais'));
    assert.ok(posicao('DELETE FROM historico_prioridades_legais') < posicao('DELETE FROM prioridades_legais'));
    assert.ok(posicao('DELETE FROM prioridades_legais') < posicao('DELETE FROM atendimentos'));
    assert.equal(sql.some((comando) => comando.includes('DELETE FROM pacientes')), false);
    assert.deepEqual(mock.contadores(), {
      commits: 1,
      rollbacks: 0,
      fechamentos: 1,
      transacoes: engine === 'mysql' ? 1 : 0,
    });
  }
});

test('recusa exclusão para outros perfis, situações e qualquer registro clínico', async () => {
  process.env.DB_ENGINE = 'oracle';
  await assert.rejects(
    excluirAtendimento(
      { getConnection: async () => assert.fail('não deve abrir conexão') },
      { perfil: 'medico' },
      { atendimento_id: 44 },
    ),
    (erro) => erro.status === 403,
  );

  const aberto = criarBancoExclusao({ situacao: 'em_atendimento' });
  await assert.rejects(
    excluirAtendimento(aberto.banco, { perfil: 'recepcao' }, { atendimento_id: 44 }),
    (erro) => erro.status === 409,
  );
  assert.equal(
    aberto.comandos.some(({ sql }) => sql.includes('DELETE FROM atendimentos')),
    false,
  );

  for (const tabela of ['triagens', 'consultas', 'medicacoes']) {
    const comRegistro = criarBancoExclusao({ registroEm: tabela });
    await assert.rejects(
      excluirAtendimento(comRegistro.banco, { perfil: 'recepcao' }, { atendimento_id: 44 }),
      (erro) => erro.status === 409,
    );
    assert.equal(
      comRegistro.comandos.some(({ sql }) => sql.includes('DELETE FROM atendimentos')),
      false,
    );
    assert.equal(comRegistro.contadores().rollbacks, 1);
  }
});

test('valida o identificador e responde quando atendimento não existe', async () => {
  process.env.DB_ENGINE = 'oracle';
  const mock = criarBancoExclusao({ situacao: null });
  await assert.rejects(
    excluirAtendimento(mock.banco, { perfil: 'recepcao' }, { atendimento_id: 44 }),
    (erro) => erro.status === 404,
  );
  await assert.rejects(
    excluirAtendimento(mock.banco, { perfil: 'recepcao' }, { atendimento_id: 0 }),
    (erro) => erro.status === 400,
  );
});
