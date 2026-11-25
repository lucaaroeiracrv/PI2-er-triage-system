import test from 'node:test';
import assert from 'node:assert/strict';
import { buscarPacientes } from '../src/pacientes/busca.js';
import { adaptarSqlMysql } from '../src/config/banco.js';
import { criarServidor } from '../src/servidor.js';
import { gerarHash } from '../src/auth/senhas.js';

const engineAnterior = process.env.DB_ENGINE;

test.after(() => {
  if (engineAnterior === undefined) {
    delete process.env.DB_ENGINE;
  } else {
    process.env.DB_ENGINE = engineAnterior;
  }
});

// Linha no formato devolvido pela consulta: o atendimento ativo chega em colunas separadas.
function linhaPaciente(ajustes = {}) {
  return {
    id: 31,
    nome: 'Paciente Teste',
    data_nascimento: '1990-05-17',
    documento: '52998224725',
    telefone: null,
    atendimento_ativo_id: null,
    atendimento_ativo_situacao: null,
    ...ajustes,
  };
}

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

const motores = ['oracle', 'mysql'];

test('paciente sem atendimento ativo volta com atendimento_ativo nulo', async () => {
  for (const motor of motores) {
    process.env.DB_ENGINE = motor;
    const { pacientes } = await buscarPacientes(bancoBusca([linhaPaciente()]), 'Paciente');

    assert.deepEqual(pacientes, [
      {
        id: 31,
        nome: 'Paciente Teste',
        data_nascimento: '1990-05-17',
        documento: '52998224725',
        telefone: null,
        atendimento_ativo: null,
      },
    ]);
  }
});

test('paciente com atendimento ativo traz número e situação, em qualquer situação ativa', async () => {
  const situacoes = [
    [1025, 'aguardando_triagem'],
    [1027, 'aguardando_medico'],
    [1026, 'em_atendimento'],
  ];
  for (const motor of motores) {
    process.env.DB_ENGINE = motor;
    for (const [id, situacao] of situacoes) {
      const linha = linhaPaciente({
        atendimento_ativo_id: id,
        atendimento_ativo_situacao: situacao,
      });
      const { pacientes } = await buscarPacientes(bancoBusca([linha]), 'Paciente');

      assert.deepEqual(pacientes[0].atendimento_ativo, { id, situacao });
      assert.equal('atendimento_ativo_id' in pacientes[0], false);
      assert.equal('atendimento_ativo_situacao' in pacientes[0], false);
    }
  }
});

test('o número do atendimento ativo vira número mesmo quando o driver devolve texto', async () => {
  process.env.DB_ENGINE = 'mysql';
  const linha = linhaPaciente({
    atendimento_ativo_id: '1025',
    atendimento_ativo_situacao: 'aguardando_triagem',
  });
  const { pacientes } = await buscarPacientes(bancoBusca([linha]), 'Paciente');

  assert.strictEqual(pacientes[0].atendimento_ativo.id, 1025);
});

test('paciente que só tem atendimentos finalizados aparece sem atendimento ativo', async () => {
  process.env.DB_ENGINE = 'oracle';
  const chamadas = [];
  // O banco entrega nulo nas colunas do atendimento quando todos os anteriores foram finalizados.
  const { pacientes } = await buscarPacientes(bancoBusca([linhaPaciente()], chamadas), 'Paciente');

  assert.equal(pacientes[0].atendimento_ativo, null);
  // Só o atendimento ativo entra na junção; os finalizados continuam no banco como histórico.
  assert.match(chamadas[0].sql, /ativo\.situacao <> 'finalizado'/);
  assert.doesNotMatch(chamadas[0].sql, /DELETE|UPDATE/i);
});

test('a consulta junta no máximo um atendimento por paciente e mantém o limite de 50', async () => {
  process.env.DB_ENGINE = 'oracle';
  const chamadas = [];
  const resultado = await buscarPacientes(
    bancoBusca([linhaPaciente(), linhaPaciente({ id: 32, nome: 'Outro Paciente' })], chamadas),
    '  Paciente  ',
  );
  const { sql, binds } = chamadas[0];

  assert.match(sql, /LEFT JOIN atendimentos a/);
  assert.match(sql, /a\.id = \(\s*SELECT MAX\(ativo\.id\)/);
  assert.match(sql, /ativo\.paciente_id = p\.id/);
  // Nenhuma junção direta com todos os atendimentos, que repetiria o paciente no resultado.
  assert.doesNotMatch(sql, /JOIN atendimentos a\s+ON a\.paciente_id/);
  assert.match(sql, /FETCH FIRST 50 ROWS ONLY/);
  assert.deepEqual(binds, { termo: 'Paciente' });
  assert.equal(resultado.pacientes.length, 2);
  assert.equal(resultado.limite, 50);
});

test('a consulta continua válida depois da tradução para MySQL', async () => {
  process.env.DB_ENGINE = 'mysql';
  const chamadas = [];
  await buscarPacientes(bancoBusca([], chamadas), 'ana');
  const { sql, valores } = adaptarSqlMysql(chamadas[0].sql, chamadas[0].binds);

  assert.match(sql, /DATE_FORMAT\(p\.data_nascimento, '%Y-%m-%d'\)/);
  assert.match(sql, / LIMIT 50$/);
  assert.match(sql, /LEFT JOIN atendimentos a/);
  assert.match(sql, /ativo\.situacao <> 'finalizado'/);
  assert.doesNotMatch(sql, /TO_CHAR|FETCH FIRST|:termo/);
  // O termo aparece duas vezes na consulta (nome e documento), então há dois valores posicionais.
  assert.equal(sql.match(/\?/g).length, 2);
  assert.deepEqual(valores, ['ana', 'ana']);
});

test('busca continua exigindo de 2 a 100 caracteres', async () => {
  process.env.DB_ENGINE = 'oracle';
  for (const termo of [undefined, '', ' a ', 'x'.repeat(101)]) {
    await assert.rejects(
      buscarPacientes({ getConnection: async () => assert.fail('não deve consultar') }, termo),
      (erro) => erro.status === 400,
    );
  }
});

test('API devolve o atendimento ativo somente para a recepção autenticada', async () => {
  process.env.DB_ENGINE = 'oracle';
  const senhaHash = await gerarHash('senha-de-teste');
  const usuarios = [
    {
      id: 12,
      nome: 'Recepção Teste',
      login: 'recepcao',
      senha_hash: senhaHash,
      perfil: 'recepcao',
      ativo: 1,
    },
    {
      id: 13,
      nome: 'Médico Teste',
      login: 'medico',
      senha_hash: senhaHash,
      perfil: 'medico',
      ativo: 1,
    },
  ];
  const linhas = [
    linhaPaciente({
      id: 31,
      nome: 'Ana Aguardando',
      atendimento_ativo_id: 1025,
      atendimento_ativo_situacao: 'aguardando_triagem',
    }),
    linhaPaciente({
      id: 32,
      nome: 'Bruno Em Atendimento',
      documento: '11144477735',
      atendimento_ativo_id: 1026,
      atendimento_ativo_situacao: 'em_atendimento',
    }),
    linhaPaciente({ id: 33, nome: 'Carla Sem Atendimento', documento: '39053344705' }),
  ];
  let consultasDePacientes = 0;
  const banco = {
    async getConnection() {
      return {
        async execute(sql, binds = {}) {
          if (sql.includes('FROM usuarios WHERE login')) {
            return { rows: usuarios.filter((usuario) => usuario.login === binds.login) };
          }
          if (sql.includes('FROM pacientes p')) {
            consultasDePacientes += 1;
            return { rows: linhas };
          }
          return { rows: [] };
        },
        async commit() {},
        async rollback() {},
        async close() {},
      };
    },
  };
  const servidor = await criarServidor(banco);

  try {
    await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
    const origem = `http://127.0.0.1:${servidor.address().port}`;

    async function entrar(login) {
      const resposta = await fetch(`${origem}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: origem },
        body: JSON.stringify({ login, senha: 'senha-de-teste' }),
      });
      return { cookie: resposta.headers.get('set-cookie').split(';')[0] };
    }

    const recepcao = await entrar('recepcao');
    const medico = await entrar('medico');

    const busca = await fetch(`${origem}/api/pacientes?busca=Paciente`, {
      headers: { Cookie: recepcao.cookie },
    });
    assert.equal(busca.status, 200);
    const corpo = await busca.json();
    assert.deepEqual(
      corpo.pacientes.map(({ nome, atendimento_ativo }) => [nome, atendimento_ativo]),
      [
        ['Ana Aguardando', { id: 1025, situacao: 'aguardando_triagem' }],
        ['Bruno Em Atendimento', { id: 1026, situacao: 'em_atendimento' }],
        ['Carla Sem Atendimento', null],
      ],
    );
    assert.equal(consultasDePacientes, 1);

    const naoAutorizada = await fetch(`${origem}/api/pacientes?busca=Paciente`, {
      headers: { Cookie: medico.cookie },
    });
    assert.equal(naoAutorizada.status, 403);

    const semSessao = await fetch(`${origem}/api/pacientes?busca=Paciente`);
    assert.equal(semSessao.status, 401);
    // As tentativas sem permissão não chegam a consultar pacientes nem a expor atendimentos.
    assert.equal(consultasDePacientes, 1);
  } finally {
    await new Promise((resolve) => servidor.close(resolve));
  }
});
