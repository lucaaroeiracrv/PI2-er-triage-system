import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const codigoApi = await readFile(new URL('../public/assets/js/api.js', import.meta.url), 'utf8');

function carregarApi(fetch) {
  const contexto = { window: {}, fetch, URLSearchParams };
  runInNewContext(codigoApi, contexto);
  return contexto.window.pi2Api;
}

test('máscara de CPF formata até onze dígitos e remove caracteres não numéricos', () => {
  const api = carregarApi(async () => {});

  assert.equal(api.formatCpf('12345678901'), '123.456.789-01');
  assert.equal(api.formatCpf('123.456.789-01'), '123.456.789-01');
  assert.equal(api.formatCpf('123abc456789012'), '123.456.789-01');
  assert.equal(api.formatCpf('1234'), '123.4');
});

test('validação de CPF rejeita repetidos e aceita dígitos verificadores válidos', () => {
  const api = carregarApi(async () => {});

  assert.equal(api.validarCpf('529.982.247-25'), true);
  assert.equal(api.validarCpf('11111111111'), false);
  assert.equal(api.validarCpf('52998224724'), false);
});

test('máscara de telefone formata números fixos e celulares nacionais', () => {
  const api = carregarApi(async () => {});

  assert.equal(api.formatTelefone('11987654321'), '(11) 98765-4321');
  assert.equal(api.formatTelefone('(11) 2345-6789'), '(11) 2345-6789');
  assert.equal(api.formatTelefone('119876abc54321'), '(11) 98765-4321');
  assert.equal(api.formatTelefone('+5511987654321'), '+5511987654321');
});

test('máscara de pressão preserva o separador e limita os valores a seis dígitos', () => {
  const api = carregarApi(async () => {});

  assert.equal(api.formatPressao('12080'), '120/80');
  assert.equal(api.formatPressao('90/60'), '90/60');
  assert.equal(api.formatPressao('120/80'), '120/80');
  assert.equal(api.formatPressao('120/80abc'), '120/80');
});

test('requisição POST obtém a sessão e envia seu token CSRF', async () => {
  const chamadas = [];
  const api = carregarApi(async (url, opcoes) => {
    chamadas.push({ url, opcoes });
    if (url === '/api/sessao') {
      return { ok: true, json: async () => ({ csrf: 'token-de-teste' }) };
    }
    return { ok: true, json: async () => ({ criado: true }) };
  });

  const resultado = await api.postJson('/api/pacientes', { nome: 'Paciente de Teste' });

  assert.equal(resultado.criado, true);
  assert.equal(chamadas.length, 2);
  assert.equal(chamadas[0].url, '/api/sessao');
  assert.equal(chamadas[0].opcoes.credentials, 'same-origin');
  assert.equal(chamadas[1].url, '/api/pacientes');
  assert.equal(chamadas[1].opcoes.headers['X-CSRF-Token'], 'token-de-teste');
  assert.equal(chamadas[1].opcoes.method, 'POST');
});

test('requisição POST não continua sem uma sessão autenticada', async () => {
  let quantidadeChamadas = 0;
  const api = carregarApi(async () => {
    quantidadeChamadas += 1;
    return { ok: false, json: async () => ({ erro: 'Entre no sistema para continuar.' }) };
  });

  await assert.rejects(
    api.postJson('/api/pacientes', { nome: 'Paciente de Teste' }),
    /Entre no sistema para continuar/,
  );
  assert.equal(quantidadeChamadas, 1);
});

test('coluna "Atendimento ativo" descreve número e situação, ou a ausência de atendimento', () => {
  const api = carregarApi(async () => {});

  assert.equal(
    api.descreverAtendimentoAtivo({ id: 1025, situacao: 'aguardando_triagem' }),
    '#1025 — Aguardando triagem',
  );
  assert.equal(
    api.descreverAtendimentoAtivo({ id: 1026, situacao: 'em_atendimento' }),
    '#1026 — Em atendimento',
  );
  assert.equal(
    api.descreverAtendimentoAtivo({ id: 1027, situacao: 'aguardando_medico' }),
    '#1027 — Aguardando médico',
  );
  assert.equal(api.descreverAtendimentoAtivo(null), 'Nenhum atendimento ativo');
  assert.equal(api.descreverAtendimentoAtivo(undefined), 'Nenhum atendimento ativo');
});

test('atendimento finalizado nunca é apresentado como ativo', () => {
  const api = carregarApi(async () => {});
  const finalizado = { id: 1020, situacao: 'finalizado' };

  assert.equal(api.atendimentoEstaAtivo(finalizado), false);
  assert.equal(api.descreverAtendimentoAtivo(finalizado), 'Nenhum atendimento ativo');
  assert.equal(api.podeAbrirAtendimento({ id: 31, atendimento_ativo: finalizado }), true);
});

test('só paciente sem atendimento ativo pode receber uma nova abertura', () => {
  const api = carregarApi(async () => {});

  assert.equal(api.podeAbrirAtendimento({ id: 31, atendimento_ativo: null }), true);
  assert.equal(api.podeAbrirAtendimento({ id: 31 }), true);
  for (const situacao of ['aguardando_triagem', 'aguardando_medico', 'em_atendimento']) {
    assert.equal(
      api.podeAbrirAtendimento({ id: 31, atendimento_ativo: { id: 1025, situacao } }),
      false,
    );
  }
});

test('situação desconhecida é mostrada como veio, sem quebrar a tabela', () => {
  const api = carregarApi(async () => {});

  assert.equal(api.rotuloSituacaoAtendimento('constructor'), 'constructor');
  assert.equal(api.rotuloSituacaoAtendimento(undefined), 'Situação desconhecida');
});

test('link de localizar leva número e CPF, e o preenchimento os lê de volta', () => {
  const api = carregarApi(async () => {});
  const paciente = {
    id: 31,
    documento: '52998224725',
    atendimento_ativo: { id: 1025, situacao: 'aguardando_triagem' },
  };

  const link = api.montarLinkLocalizarAtendimento(paciente);
  assert.equal(link, 'screens/busca-atendimento.html?numero=1025&cpf=52998224725');

  const preenchimento = api.lerPreenchimentoBusca(`?${link.split('?')[1]}`);
  assert.equal(preenchimento.numero, '1025');
  assert.equal(preenchimento.cpf, '529.982.247-25');
});

test('documento fora do formato de CPF não vai no link, e o preenchimento ignora valores inválidos', () => {
  const api = carregarApi(async () => {});
  const link = api.montarLinkLocalizarAtendimento({
    documento: 'DEMO-002',
    atendimento_ativo: { id: 1025, situacao: 'em_atendimento' },
  });
  assert.equal(link, 'screens/busca-atendimento.html?numero=1025');

  for (const busca of [
    '',
    '?numero=abc&cpf=123',
    '?numero=0&cpf=',
    '?numero=1e3&cpf=529.982',
    '?numero=-5',
  ]) {
    const preenchimento = api.lerPreenchimentoBusca(busca);
    assert.equal(preenchimento.numero, '');
    assert.equal(preenchimento.cpf, '');
  }
  assert.equal(api.lerPreenchimentoBusca('?numero=44').numero, '44');
});
