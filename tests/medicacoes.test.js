import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listarMedicacoes,
  registrarMedicacao,
  validarMedicacao,
} from '../src/medicacoes/registro.js';

const anterior = process.env.DB_ENGINE;
process.env.DB_ENGINE = 'oracle';

const dados = () => ({
  atendimento_id: 44,
  medicacao: 'Dipirona',
  dose: '500 mg',
  via: 'Oral',
  observacoes: 'Após avaliação',
});

test.after(() => {
  process.env.DB_ENGINE = anterior;
});

test('valida e normaliza dados da medicação', () => {
  assert.deepEqual(validarMedicacao({ ...dados(), medicacao: '  Dipirona  ' }), {
    atendimento_id: 44,
    medicacao: 'Dipirona',
    dose: '500 mg',
    via: 'Oral',
    observacoes: 'Após avaliação',
  });
});

test('rejeita dados obrigatórios e limites inválidos', () => {
  for (const ajuste of [
    { atendimento_id: 0 },
    { medicacao: '' },
    { dose: 'x'.repeat(81) },
    { via: 'x'.repeat(41) },
    { observacoes: 'x'.repeat(501) },
  ]) {
    assert.throws(
      () => validarMedicacao({ ...dados(), ...ajuste }),
      (erro) => erro.status === 400,
    );
  }
});

test('persiste medicação vinculada ao profissional e atendimento', async () => {
  const comandos = [];
  const conexao = {
    async execute(sql, binds) {
      comandos.push(sql);
      if (sql.includes('FROM atendimentos'))
        return { rows: [{ id: 44, situacao: 'em_atendimento' }] };
      if (sql.includes('INSERT INTO medicacoes')) return { outBinds: { id: [301] } };
      return { rows: [] };
    },
    async commit() {},
    async rollback() {},
    async close() {},
  };
  const banco = { getConnection: async () => conexao };
  const resultado = await registrarMedicacao(banco, { id: 13 }, dados());

  assert.equal(resultado.medicacao.id, 301);
  assert.equal(resultado.medicacao.atendimento_id, 44);
  const insert = comandos.find((sql) => sql.includes('INSERT INTO medicacoes'));
  assert.match(insert, /atendimento_id, profissional_id/);
});

test('recuperação rejeita atendimento inexistente', async () => {
  const banco = {
    getConnection: async () => ({
      async execute() {
        return { rows: [] };
      },
      async close() {},
    }),
  };
  await assert.rejects(listarMedicacoes(banco, 999), (erro) => erro.status === 404);
});
