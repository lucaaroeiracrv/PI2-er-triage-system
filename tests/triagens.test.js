import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cadastrarTriagem,
  listarAtendimentosAguardandoMedico,
  listarAtendimentosAguardandoTriagem,
  validarTriagem,
} from '../src/triagens/cadastro.js';

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
  atendimento_id: 7,
  queixa: ' Dor intensa na cabeça ',
  pressao: ' 120x80 ',
  temperatura: '38.2',
  frequencia: '88',
  saturacao: '97',
  classificacao: 'Amarelo',
});

test('valida uma triagem completa e normaliza os campos de texto', () => {
  const resultado = validarTriagem(exemplo());

  assert.deepEqual(resultado, {
    atendimento_id: 7,
    queixa: 'Dor intensa na cabeça',
    pressao: '120x80',
    temperatura: 38.2,
    frequencia: 88,
    saturacao: 97,
    classificacao: 'Amarelo',
  });
});

test('recusa corpo de triagem ausente ou que não seja um objeto', () => {
  for (const dados of [null, [], 'triagem']) {
    assert.throws(
      () => validarTriagem(dados),
      (erro) => erro.status === 400,
    );
  }
});

for (const [nome, ajuste] of [
  ['atendimento_id inválido', { atendimento_id: 0 }],
  ['queixa curta', { queixa: 'oi' }],
  ['queixa longa', { queixa: 'a'.repeat(501) }],
  ['pressao ausente', { pressao: '   ' }],
  ['pressao longa', { pressao: '1'.repeat(21) }],
  ['temperatura fora do intervalo', { temperatura: '45.1' }],
  ['temperatura com mais de uma casa decimal', { temperatura: '38.25' }],
  ['frequencia inválida', { frequencia: '10' }],
  ['saturacao inválida', { saturacao: '101' }],
  ['classificacao inválida', { classificacao: 'Roxo' }],
]) {
  test(`rejeita ${nome}`, () => {
    assert.throws(
      () =>
        validarTriagem({
          ...exemplo(),
          ...ajuste,
        }),
      (erro) => erro.status === 400,
    );
  });
}

test('registra classificação e profissional e muda o atendimento na mesma transação', async () => {
  const comandos = [];
  let commits = 0;
  let rollbacks = 0;
  let fechamentos = 0;
  const conexao = {
    async execute(sql, binds = {}) {
      comandos.push({ sql, binds });
      if (sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 7, situacao: 'aguardando_triagem' }] };
      }
      return { rows: [] };
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
  const resultado = await cadastrarTriagem(
    { getConnection: async () => conexao },
    { id: 12, nome: 'Enfermeira Teste' },
    exemplo(),
  );

  assert.equal(resultado.atendimento_id, 7);
  assert.equal(commits, 1);
  assert.equal(rollbacks, 0);
  assert.equal(fechamentos, 1);
  assert.equal(comandos.length, 3);
  assert.equal(comandos[1].binds.enfermeiro_id, 12);
  assert.equal(comandos[1].binds.classificacao, 'Amarelo');
  assert.match(comandos[2].sql, /aguardando_medico/);
});

test('não registra triagem para atendimento que já não aguarda triagem', async () => {
  let inserts = 0;
  let rollbacks = 0;
  const conexao = {
    async execute(sql) {
      if (sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 7, situacao: 'aguardando_medico' }] };
      }
      inserts += 1;
      return { rows: [] };
    },
    async commit() {},
    async rollback() {
      rollbacks += 1;
    },
    async close() {},
  };

  await assert.rejects(
    cadastrarTriagem({ getConnection: async () => conexao }, { id: 12 }, exemplo()),
    (erro) => erro.status === 409,
  );
  assert.equal(inserts, 0);
  assert.equal(rollbacks, 1);
});

test('as filas consultam os dados de vínculo exigidos para enfermagem e médico', async () => {
  const consultas = [];
  const banco = {
    async getConnection() {
      return {
        async execute(sql) {
          consultas.push(sql);
          return { rows: [] };
        },
        async close() {},
      };
    },
  };

  await listarAtendimentosAguardandoTriagem(banco);
  await listarAtendimentosAguardandoMedico(banco);

  assert.match(consultas[0], /JOIN pacientes/);
  assert.match(consultas[0], /aguardando_triagem/);
  assert.match(consultas[1], /JOIN triagens/);
  assert.match(consultas[1], /JOIN usuarios/);
  for (const campo of [
    'classificacao',
    'criado_em',
    'profissional_responsavel',
    'atendimento_id',
  ]) {
    assert.match(consultas[1], new RegExp(campo));
  }
});
