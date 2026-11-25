import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirAtendimento, validarPrioridadeLegal } from '../src/atendimentos/abertura.js';

const hoje = new Date(2026, 10, 25, 12);
const prioridade = (ajustes = {}) => ({
  declaracao: 'sim',
  categorias: ['gestante'],
  data_doacao_sangue: null,
  ...ajustes,
});

test('exige uma declaração conhecida e categorias válidas', () => {
  assert.throws(
    () => validarPrioridadeLegal(null, '2000-01-01', hoje),
    (erro) => erro.status === 400,
  );
  assert.throws(
    () => validarPrioridadeLegal(prioridade({ declaracao: 'talvez' }), '2000-01-01', hoje),
    (erro) => erro.status === 400,
  );
  assert.throws(
    () =>
      validarPrioridadeLegal(
        prioridade({ categorias: ['prioridade_inventada'] }),
        '2000-01-01',
        hoje,
      ),
    (erro) => erro.status === 400,
  );
});

test('calcula a faixa etária no servidor e ignora uma faixa etária enviada incorretamente', () => {
  assert.deepEqual(
    validarPrioridadeLegal(prioridade({ categorias: ['idoso_80_mais'] }), '1966-11-25', hoje),
    {
      declaracao: 'sim',
      categorias: ['idoso_60_79'],
      data_doacao_sangue: null,
    },
  );
  assert.deepEqual(validarPrioridadeLegal(prioridade({ categorias: [] }), '1946-11-25', hoje), {
    declaracao: 'sim',
    categorias: ['idoso_80_mais'],
    data_doacao_sangue: null,
  });
});

test('exige ao menos uma categoria quando a pessoa não entra em faixa etária prioritária', () => {
  assert.throws(
    () => validarPrioridadeLegal(prioridade({ categorias: [] }), '2000-01-01', hoje),
    (erro) => erro.status === 400,
  );
});

test('registra doador somente com data válida dentro dos últimos 120 dias', () => {
  assert.deepEqual(
    validarPrioridadeLegal(
      prioridade({
        categorias: ['doador_sangue'],
        data_doacao_sangue: '2026-07-28',
      }),
      '2000-01-01',
      hoje,
    ),
    {
      declaracao: 'sim',
      categorias: ['doador_sangue'],
      data_doacao_sangue: '2026-07-28',
    },
  );

  for (const data_doacao_sangue of ['2026-07-27', '2026-11-26', '2026-02-31', null]) {
    assert.throws(
      () =>
        validarPrioridadeLegal(
          prioridade({ categorias: ['doador_sangue'], data_doacao_sangue }),
          '2000-01-01',
          hoje,
        ),
      (erro) => erro.status === 400,
    );
  }
});

test('salva declaração, categorias e auditoria na transação de abertura', async () => {
  const engineAnterior = process.env.DB_ENGINE;
  process.env.DB_ENGINE = 'oracle';
  const comandos = [];
  let commits = 0;
  let rollbacks = 0;
  let fechamentos = 0;
  const conexao = {
    async execute(sql, binds = {}) {
      comandos.push({ sql, binds });
      if (sql.includes('FROM pacientes')) {
        return { rows: [{ id: 8, data_nascimento: '2000-11-25' }] };
      }
      if (sql.includes('FROM atendimentos WHERE chave_abertura')) return { rows: [] };
      if (sql.includes("situacao <> 'finalizado'")) return { rows: [] };
      if (sql.includes('INSERT INTO atendimentos')) return { outBinds: { id: [41] } };
      if (sql.includes('INSERT INTO prioridades_legais')) return { outBinds: { id: [51] } };
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

  try {
    const resultado = await abrirAtendimento(
      { getConnection: async () => conexao },
      { id: 12 },
      {
        paciente_id: 8,
        chave_abertura: '00000000-0000-4000-8000-000000000001',
        prioridade_legal: {
          declaracao: 'sim',
          categorias: ['pessoa_com_deficiencia'],
          data_doacao_sangue: null,
        },
      },
    );

    assert.equal(resultado.atendimento.id, 41);
    assert.deepEqual(resultado.prioridade_legal.categorias, ['pessoa_com_deficiencia']);
    assert.equal(commits, 1);
    assert.equal(rollbacks, 0);
    assert.equal(fechamentos, 1);
    const gravacaoCategoria = comandos.find(({ sql }) =>
      sql.includes('INSERT INTO categorias_prioridade_legal'),
    );
    assert.equal(gravacaoCategoria.binds.categoria, 'pessoa_com_deficiencia');
    const historico = comandos.find(({ sql }) =>
      sql.includes('INSERT INTO historico_prioridades_legais'),
    );
    assert.equal(historico.binds.registrado_por, 12);
    assert.equal(historico.binds.categorias_json, '["pessoa_com_deficiencia"]');
  } finally {
    if (engineAnterior === undefined) {
      delete process.env.DB_ENGINE;
    } else {
      process.env.DB_ENGINE = engineAnterior;
    }
  }
});

test('desfaz a abertura se a gravação do histórico falhar', async () => {
  const engineAnterior = process.env.DB_ENGINE;
  process.env.DB_ENGINE = 'oracle';
  let commits = 0;
  let rollbacks = 0;
  const conexao = {
    async execute(sql) {
      if (sql.includes('FROM pacientes')) {
        return { rows: [{ id: 8, data_nascimento: '2000-01-01' }] };
      }
      if (sql.includes('FROM atendimentos WHERE chave_abertura')) return { rows: [] };
      if (sql.includes("situacao <> 'finalizado'")) return { rows: [] };
      if (sql.includes('INSERT INTO atendimentos')) return { outBinds: { id: [41] } };
      if (sql.includes('INSERT INTO prioridades_legais')) return { outBinds: { id: [51] } };
      if (sql.includes('INSERT INTO historico_prioridades_legais')) {
        throw new Error('Falha ao gravar histórico');
      }
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

  try {
    await assert.rejects(
      abrirAtendimento(
        { getConnection: async () => conexao },
        { id: 12 },
        {
          paciente_id: 8,
          chave_abertura: '00000000-0000-4000-8000-000000000002',
          prioridade_legal: prioridade(),
        },
      ),
      /Falha ao gravar histórico/,
    );
    assert.equal(commits, 0);
    assert.equal(rollbacks, 1);
  } finally {
    if (engineAnterior === undefined) {
      delete process.env.DB_ENGINE;
    } else {
      process.env.DB_ENGINE = engineAnterior;
    }
  }
});

test('abre novo atendimento com novo número e chave após finalizar o anterior', async () => {
  const engineAnterior = process.env.DB_ENGINE;
  process.env.DB_ENGINE = 'oracle';
  const atendimentos = [];
  let proximoAtendimento = 40;
  let proximaPrioridade = 50;
  const conexao = {
    async execute(sql, binds = {}) {
      if (sql.includes('FROM pacientes')) return { rows: [{ id: 8 }] };
      if (sql.includes('FROM atendimentos WHERE chave_abertura')) {
        return {
          rows: atendimentos
            .filter((atendimento) => atendimento.chave_abertura === binds.chave)
            .map(({ id, paciente_id, recepcionista_id, situacao }) => ({
              id,
              paciente_id,
              recepcionista_id,
              situacao,
            })),
        };
      }
      if (sql.includes("situacao <> 'finalizado'")) {
        return { rows: atendimentos.filter((atendimento) => atendimento.situacao !== 'finalizado') };
      }
      if (sql.includes('INSERT INTO atendimentos')) {
        const id = ++proximoAtendimento;
        atendimentos.push({
          id,
          paciente_id: binds.paciente_id,
          recepcionista_id: binds.recepcionista_id,
          situacao: 'aguardando_triagem',
          chave_abertura: binds.chave,
        });
        return { outBinds: { id: [id] } };
      }
      if (sql.includes('INSERT INTO prioridades_legais')) {
        return { outBinds: { id: [++proximaPrioridade] } };
      }
      return { rows: [] };
    },
    async commit() {},
    async rollback() {},
    async close() {},
  };
  const banco = { getConnection: async () => conexao };
  const usuario = { id: 12 };
  const dados = (chave_abertura) => ({
    paciente_id: 8,
    chave_abertura,
    prioridade_legal: {
      declaracao: 'nao',
      categorias: [],
      data_doacao_sangue: null,
    },
  });

  try {
    const anterior = await abrirAtendimento(
      banco,
      usuario,
      dados('00000000-0000-4000-8000-000000000003'),
    );
    atendimentos[0].situacao = 'finalizado';

    const novo = await abrirAtendimento(
      banco,
      usuario,
      dados('00000000-0000-4000-8000-000000000004'),
    );

    assert.equal(novo.criado, true);
    assert.notEqual(novo.atendimento.id, anterior.atendimento.id);
    assert.equal(novo.atendimento.situacao, 'aguardando_triagem');
    assert.equal(atendimentos[0].situacao, 'finalizado');
    assert.notEqual(atendimentos[0].chave_abertura, atendimentos[1].chave_abertura);
    await assert.rejects(
      abrirAtendimento(banco, usuario, dados('00000000-0000-4000-8000-000000000005')),
      (erro) => erro.status === 409,
    );
  } finally {
    if (engineAnterior === undefined) {
      delete process.env.DB_ENGINE;
    } else {
      process.env.DB_ENGINE = engineAnterior;
    }
  }
});
