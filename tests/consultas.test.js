import test from 'node:test';
import assert from 'node:assert/strict';
import { oracledb } from '../src/config/banco.js';
import { registrarConsulta, validarConsulta } from '../src/consultas/registro.js';

const engineAnterior = process.env.DB_ENGINE;
process.env.DB_ENGINE = 'oracle';
test.after(() => {
  if (engineAnterior === undefined) {
    delete process.env.DB_ENGINE;
  } else {
    process.env.DB_ENGINE = engineAnterior;
  }
});

const exemplo = () => ({
  atendimento_id: 44,
  paciente_id: 31,
  triagem_id: 55,
  registro_consulta: '  Avaliação e conduta registradas.  ',
});

test('valida o vínculo selecionado e normaliza o registro da consulta', () => {
  assert.deepEqual(validarConsulta(exemplo()), {
    atendimento_id: 44,
    paciente_id: 31,
    triagem_id: 55,
    registro_consulta: 'Avaliação e conduta registradas.',
  });
});

for (const ajuste of [
  { atendimento_id: 0 },
  { paciente_id: 1.5 },
  { triagem_id: -1 },
  { registro_consulta: '   ' },
  { registro_consulta: null },
]) {
  test(`rejeita dados inválidos da consulta: ${JSON.stringify(ajuste)}`, () => {
    assert.throws(
      () => validarConsulta({ ...exemplo(), ...ajuste }),
      (erro) => erro.status === 400,
    );
  });
}

function criarBanco({ situacao = 'aguardando_medico', atendimento = true, triagem = true } = {}) {
  const comandos = [];
  let commits = 0;
  let rollbacks = 0;
  let fechamentos = 0;
  let situacaoAtual = situacao;
  const conexao = {
    async execute(sql, binds = {}) {
      comandos.push({ sql, binds });
      if (sql.includes('FOR UPDATE')) {
        return {
          rows: atendimento ? [{ id: 44, paciente_id: 31, situacao: situacaoAtual }] : [],
        };
      }
      if (sql.includes('FROM triagens')) {
        return { rows: triagem ? [{ triagem_id: 55 }] : [] };
      }
      if (sql.includes('INSERT INTO consultas')) {
        return { outBinds: { id: [101] } };
      }
      if (sql.includes('UPDATE atendimentos')) {
        situacaoAtual = 'em_atendimento';
        return { rowsAffected: 1 };
      }
      throw new Error(`Consulta de teste inesperada: ${sql}`);
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
    contagem: () => ({ commits, rollbacks, fechamentos, situacao: situacaoAtual }),
  };
}

test('salva a consulta e move o atendimento para em_atendimento na mesma transação', async () => {
  const banco = criarBanco();
  const resultado = await registrarConsulta(banco.banco, { id: 13 }, exemplo());
  const insert = banco.comandos.find(({ sql }) => sql.includes('INSERT INTO consultas'));

  assert.equal(resultado.sucesso, true);
  assert.equal(resultado.consulta_id, 101);
  assert.equal(resultado.atendimento_id, 44);
  assert.equal(resultado.situacao, 'em_atendimento');
  assert.equal(insert.binds.medico_id, 13);
  assert.equal(insert.binds.registro_consulta.val, 'Avaliação e conduta registradas.');
  assert.equal(insert.binds.registro_consulta.type, oracledb.CLOB);
  assert.equal(banco.comandos.filter(({ sql }) => sql.includes('UPDATE atendimentos')).length, 1);
  assert.deepEqual(banco.contagem(), {
    commits: 1,
    rollbacks: 0,
    fechamentos: 1,
    situacao: 'em_atendimento',
  });
});

test('permite registros adicionais em um atendimento já em andamento', async () => {
  const banco = criarBanco({ situacao: 'em_atendimento' });
  const resultado = await registrarConsulta(banco.banco, { id: 13 }, exemplo());

  assert.equal(resultado.situacao, 'em_atendimento');
  assert.equal(
    banco.comandos.some(({ sql }) => sql.includes('UPDATE atendimentos')),
    false,
  );
  assert.equal(banco.contagem().commits, 1);
});

test('usa texto simples e inicia transação com o motor MySQL', async () => {
  const engineAnteriorLocal = process.env.DB_ENGINE;
  process.env.DB_ENGINE = 'mysql';
  const comandos = [];
  let transacoesIniciadas = 0;
  const conexao = {
    async beginTransaction() {
      transacoesIniciadas += 1;
    },
    async execute(sql, binds = {}) {
      comandos.push({ sql, binds });
      if (sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 44, paciente_id: 31, situacao: 'aguardando_medico' }] };
      }
      if (sql.includes('FROM triagens')) {
        return { rows: [{ triagem_id: 55 }] };
      }
      if (sql.includes('INSERT INTO consultas')) {
        return { outBinds: { id: [101] } };
      }
      if (sql.includes('UPDATE atendimentos')) {
        return { rowsAffected: 1 };
      }
      throw new Error(`Consulta de teste inesperada: ${sql}`);
    },
    async commit() {},
    async rollback() {},
    async close() {},
  };

  try {
    await registrarConsulta({ getConnection: async () => conexao }, { id: 13 }, exemplo());
    const insert = comandos.find(({ sql }) => sql.includes('INSERT INTO consultas'));
    assert.equal(transacoesIniciadas, 1);
    assert.equal(insert.binds.registro_consulta, 'Avaliação e conduta registradas.');
  } finally {
    if (engineAnteriorLocal === undefined) {
      delete process.env.DB_ENGINE;
    } else {
      process.env.DB_ENGINE = engineAnteriorLocal;
    }
  }
});

for (const [nome, opcoes, statusEsperado] of [
  ['atendimento inexistente', { atendimento: false }, 404],
  ['triagem inexistente', { triagem: false }, 409],
  ['atendimento finalizado', { situacao: 'finalizado' }, 409],
]) {
  test(`não persiste consulta quando há ${nome}`, async () => {
    const banco = criarBanco(opcoes);

    await assert.rejects(
      registrarConsulta(banco.banco, { id: 13 }, exemplo()),
      (erro) => erro.status === statusEsperado,
    );
    assert.equal(
      banco.comandos.some(({ sql }) => sql.includes('INSERT INTO consultas')),
      false,
    );
    assert.equal(banco.contagem().commits, 0);
    assert.equal(banco.contagem().rollbacks, 1);
  });
}

test('não associa a consulta a paciente ou triagem de outro atendimento', async () => {
  const banco = criarBanco();
  const erroPaciente = await assert.rejects(
    registrarConsulta(banco.banco, { id: 13 }, { ...exemplo(), paciente_id: 99 }),
    (erro) => erro.status === 409,
  );
  assert.equal(erroPaciente, undefined);
  assert.equal(
    banco.comandos.some(({ sql }) => sql.includes('INSERT INTO consultas')),
    false,
  );
  assert.equal(banco.contagem().rollbacks, 1);
});

test('rejeita uma triagem diferente da vinculada ao atendimento', async () => {
  const banco = criarBanco();

  await assert.rejects(
    registrarConsulta(banco.banco, { id: 13 }, { ...exemplo(), triagem_id: 56 }),
    (erro) => erro.status === 409,
  );
  assert.equal(
    banco.comandos.some(({ sql }) => sql.includes('INSERT INTO consultas')),
    false,
  );
  assert.equal(banco.contagem().rollbacks, 1);
});
