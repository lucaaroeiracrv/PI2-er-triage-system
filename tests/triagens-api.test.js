import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from '../src/servidor.js';
import { gerarHash } from '../src/auth/senhas.js';

test('enfermagem registra classificação e médico recebe a fila com autoria e horário', async () => {
  const engineAnterior = process.env.DB_ENGINE;
  process.env.DB_ENGINE = 'oracle';
  const senhaHash = await gerarHash('senha-de-teste');
  const usuarios = [
    {
      id: 12,
      nome: 'Enfermeira Teste',
      login: 'enfermagem',
      senha_hash: senhaHash,
      perfil: 'enfermagem',
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
  const triagens = [];
  let situacao = 'aguardando_triagem';
  const banco = {
    async getConnection() {
      return {
        async execute(sql, binds = {}) {
          if (sql.includes('FROM usuarios WHERE login')) {
            return { rows: usuarios.filter((usuario) => usuario.login === binds.login) };
          }
          if (sql.includes('FOR UPDATE')) {
            return { rows: [{ id: 44, situacao }] };
          }
          if (sql.includes('INSERT INTO triagens')) {
            triagens.push({ ...binds, criado_em: new Date('2026-11-12T20:00:00.000Z') });
            return { rows: [] };
          }
          if (sql.includes('UPDATE atendimentos')) {
            situacao = 'aguardando_medico';
            return { rows: [] };
          }
          if (sql.includes('FROM atendimentos a') && sql.includes('JOIN triagens')) {
            return {
              rows:
                situacao === 'aguardando_medico'
                  ? [
                      {
                        atendimento_id: 44,
                        paciente_nome: 'Paciente Fictício',
                        classificacao: triagens[0].classificacao,
                        data_hora: triagens[0].criado_em,
                        profissional_responsavel: 'Enfermeira Teste',
                        queixa: triagens[0].queixa,
                        pressao: triagens[0].pressao,
                        temperatura: triagens[0].temperatura,
                        frequencia: triagens[0].frequencia,
                        saturacao: triagens[0].saturacao,
                      },
                    ]
                  : [],
            };
          }
          if (sql.includes('FROM atendimentos a') && sql.includes('aguardando_triagem')) {
            return {
              rows:
                situacao === 'aguardando_triagem'
                  ? [
                      {
                        atendimento_id: 44,
                        paciente_nome: 'Paciente Fictício',
                        aberto_em: new Date('2026-11-12T19:00:00.000Z'),
                      },
                    ]
                  : [],
            };
          }
          throw new Error(`Consulta de teste inesperada: ${sql}`);
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
    const paginaPainel = await fetch(`${origem}/`);
    const htmlPainel = await paginaPainel.text();
    assert.equal(paginaPainel.status, 200);
    assert.match(htmlPainel, /form-triagem/);
    assert.match(htmlPainel, /fila-medica/);

    async function entrar(login) {
      const resposta = await fetch(`${origem}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: origem,
        },
        body: JSON.stringify({ login, senha: 'senha-de-teste' }),
      });
      const dados = await resposta.json();
      return {
        csrf: dados.csrf,
        cookie: resposta.headers.get('set-cookie').split(';')[0],
      };
    }

    const enfermagem = await entrar('enfermagem');
    const pendentes = await fetch(`${origem}/api/triagens/pendentes`, {
      headers: { Cookie: enfermagem.cookie },
    });
    assert.equal(pendentes.status, 200);
    assert.equal((await pendentes.json()).atendimentos[0].atendimento_id, 44);

    const gravacao = await fetch(`${origem}/api/triagens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origem,
        Cookie: enfermagem.cookie,
        'X-CSRF-Token': enfermagem.csrf,
      },
      body: JSON.stringify({
        atendimento_id: 44,
        queixa: 'Dor intensa',
        pressao: '120/80',
        temperatura: 38,
        frequencia: 88,
        saturacao: 97,
        classificacao: 'Laranja',
      }),
    });
    assert.equal(gravacao.status, 201);
    assert.equal(situacao, 'aguardando_medico');
    assert.equal(triagens[0].enfermeiro_id, 12);

    const acessoNegado = await fetch(`${origem}/api/atendimentos/medico`, {
      headers: { Cookie: enfermagem.cookie },
    });
    assert.equal(acessoNegado.status, 403);

    const medico = await entrar('medico');
    const fila = await fetch(`${origem}/api/atendimentos/medico`, {
      headers: { Cookie: medico.cookie },
    });
    const dadosFila = await fila.json();
    assert.equal(fila.status, 200);
    assert.equal(dadosFila.atendimentos[0].atendimento_id, 44);
    assert.equal(dadosFila.atendimentos[0].classificacao, 'Laranja');
    assert.equal(dadosFila.atendimentos[0].profissional_responsavel, 'Enfermeira Teste');
    assert.equal(
      new Date(dadosFila.atendimentos[0].data_hora).toISOString(),
      '2026-11-12T20:00:00.000Z',
    );
  } finally {
    await new Promise((resolve) => servidor.close(resolve));
    if (engineAnterior === undefined) {
      delete process.env.DB_ENGINE;
    } else {
      process.env.DB_ENGINE = engineAnterior;
    }
  }
});
