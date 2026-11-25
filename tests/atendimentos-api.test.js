import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from '../src/servidor.js';
import { gerarHash } from '../src/auth/senhas.js';

test('busca composta e exclusão exigem recepção e funcionam pela API', async () => {
  const engineAnterior = process.env.DB_ENGINE;
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
  const removidos = [];
  const banco = {
    async getConnection() {
      return {
        async execute(sql, binds = {}) {
          if (sql.includes('FROM usuarios WHERE login')) {
            return { rows: usuarios.filter((usuario) => usuario.login === binds.login) };
          }
          if (sql.includes('p.documento = :documento')) {
            return {
              rows:
                binds.atendimento_id === 44 && binds.documento === '52998224725'
                  ? [
                      {
                        atendimento_id: 44,
                        paciente_id: 31,
                        paciente_nome: 'Paciente Teste',
                        situacao: 'aguardando_triagem',
                      },
                    ]
                  : [],
            };
          }
          if (sql.includes('FROM atendimentos') && sql.includes('FOR UPDATE')) {
            return { rows: [{ id: 44, situacao: 'aguardando_triagem' }] };
          }
          if (sql.includes('FROM triagens') || sql.includes('FROM consultas') || sql.includes('FROM medicacoes')) {
            return { rows: [] };
          }
          if (sql.includes('DELETE FROM')) removidos.push(sql);
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
    const paginaPainel = await fetch(`${origem}/`);
    const htmlPainel = await paginaPainel.text();
    assert.match(htmlPainel, /form-medicacao-medico/);
    assert.match(htmlPainel, /resumo-identificacao-medico/);
    assert.match(htmlPainel, /encerrar-atendimento/);
    const paginaMedicaLegada = await fetch(`${origem}/screens/medico.html`);
    assert.match(await paginaMedicaLegada.text(), /painel médico foi unificado/);

    async function entrar(login) {
      const resposta = await fetch(`${origem}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: origem },
        body: JSON.stringify({ login, senha: 'senha-de-teste' }),
      });
      const dados = await resposta.json();
      return {
        csrf: dados.csrf,
        cookie: resposta.headers.get('set-cookie').split(';')[0],
      };
    }

    const recepcao = await entrar('recepcao');
    const medico = await entrar('medico');
    const parametros = new URLSearchParams({ numero: '44', cpf: '529.982.247-25' });
    const busca = await fetch(`${origem}/api/atendimentos/busca?${parametros}`, {
      headers: { Cookie: recepcao.cookie },
    });
    assert.equal(busca.status, 200);
    assert.equal((await busca.json()).atendimento_id, 44);

    const cpfDiferente = new URLSearchParams({ numero: '44', cpf: '11144477735' });
    const buscaComCpfDiferente = await fetch(`${origem}/api/atendimentos/busca?${cpfDiferente}`, {
      headers: { Cookie: recepcao.cookie },
    });
    assert.equal(buscaComCpfDiferente.status, 404);

    const incompleta = await fetch(`${origem}/api/atendimentos/busca?numero=44`, {
      headers: { Cookie: recepcao.cookie },
    });
    assert.equal(incompleta.status, 400);

    const buscaNaoAutorizada = await fetch(
      `${origem}/api/atendimentos/busca?${parametros}`,
      { headers: { Cookie: medico.cookie } },
    );
    assert.equal(buscaNaoAutorizada.status, 403);

    const exclusaoNaoAutorizada = await fetch(`${origem}/api/atendimentos/excluir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origem,
        Cookie: medico.cookie,
        'X-CSRF-Token': medico.csrf,
      },
      body: JSON.stringify({ atendimento_id: 44 }),
    });
    assert.equal(exclusaoNaoAutorizada.status, 403);

    const exclusao = await fetch(`${origem}/api/atendimentos/excluir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origem,
        Cookie: recepcao.cookie,
        'X-CSRF-Token': recepcao.csrf,
      },
      body: JSON.stringify({ atendimento_id: 44 }),
    });
    assert.equal(exclusao.status, 200);
    assert.equal((await exclusao.json()).sucesso, true);
    assert.equal(removidos.length, 4);
  } finally {
    await new Promise((resolve) => servidor.close(resolve));
    if (engineAnterior === undefined) {
      delete process.env.DB_ENGINE;
    } else {
      process.env.DB_ENGINE = engineAnterior;
    }
  }
});
