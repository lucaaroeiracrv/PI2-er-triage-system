import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const codigoApi = await readFile(new URL('../public/assets/js/api.js', import.meta.url), 'utf8');

function carregarApi(fetch) {
  const contexto = { window: {}, fetch };
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
