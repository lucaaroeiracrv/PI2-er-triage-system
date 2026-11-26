// Executa os scripts reais das telas da recepção em um DOM simulado, sem navegador.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

const lerScript = (nome) =>
  readFile(new URL(`../public/assets/js/${nome}`, import.meta.url), 'utf8');
const [codigoApi, codigoPainel, codigoBusca] = await Promise.all([
  lerScript('api.js'),
  lerScript('painel.js'),
  lerScript('busca-atendimento.js'),
]);

function criarElemento(tag = 'div') {
  const elemento = {
    tag,
    filhos: [],
    atributos: {},
    ouvintes: {},
    classes: {},
    hidden: false,
    disabled: false,
    focado: false,
    value: '',
    textContent: '',
    className: '',
    href: '',
    type: '',
    classList: {
      toggle(nome, ativo) {
        elemento.classes[nome] = ativo;
      },
    },
    append(...nos) {
      elemento.filhos.push(...nos);
    },
    replaceChildren(...nos) {
      elemento.filhos = nos;
    },
    setAttribute(nome, valor) {
      elemento.atributos[nome] = valor;
    },
    removeAttribute(nome) {
      delete elemento.atributos[nome];
    },
    addEventListener(tipo, funcao) {
      (elemento.ouvintes[tipo] ??= []).push(funcao);
    },
    focus() {
      elemento.focado = true;
    },
    click() {
      for (const funcao of elemento.ouvintes.click ?? []) funcao({ currentTarget: elemento });
    },
    scrollIntoView() {},
    reset() {},
    querySelector: () => criarElemento(),
    querySelectorAll: () => [],
  };
  return elemento;
}

// Simula o FormData lendo os valores guardados no elemento do formulário.
class FormDataSimulado {
  constructor(formulario) {
    this.dados = formulario.dadosFormulario ?? {};
  }
  get(nome) {
    return this.dados[nome] ?? null;
  }
  getAll(nome) {
    return [].concat(this.dados[nome] ?? []);
  }
}

const respostaJson = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
const aguardarPromessas = () => new Promise((resolve) => setImmediate(resolve));

async function carregarPainel(roteador = () => respostaJson(401, { erro: 'Sem sessão.' })) {
  const elementos = new Map();
  const chamadas = [];
  const document = {
    querySelector(seletor) {
      if (!elementos.has(seletor)) elementos.set(seletor, criarElemento());
      return elementos.get(seletor);
    },
    querySelectorAll: () => [],
    createElement: (tag) => criarElemento(tag),
  };
  const contexto = createContext({
    window: {},
    document,
    crypto,
    URLSearchParams,
    FormData: FormDataSimulado,
    fetch: async (url, opcoes) => {
      chamadas.push({ url, opcoes });
      return roteador(url, opcoes);
    },
  });
  runInContext(codigoApi, contexto);
  runInContext(codigoPainel, contexto);
  // O painel consulta a sessão ao carregar; espera esse pedido terminar antes dos testes.
  await aguardarPromessas();
  return { contexto, chamadas, elemento: (seletor) => document.querySelector(seletor) };
}

function carregarTelaDeBusca(search) {
  const elementos = new Map();
  const substituicoesDeEndereco = [];
  const document = {
    getElementById(id) {
      if (!elementos.has(id)) elementos.set(id, criarElemento());
      return elementos.get(id);
    },
  };
  const contexto = createContext({
    window: {
      location: { search, pathname: '/screens/busca-atendimento.html' },
      history: { replaceState: (...argumentos) => substituicoesDeEndereco.push(argumentos) },
    },
    document,
    URLSearchParams,
    fetch: async () => assert.fail('o preenchimento não deve buscar sozinho'),
  });
  runInContext(codigoApi, contexto);
  runInContext(codigoBusca, contexto);
  return { elemento: (id) => document.getElementById(id), substituicoesDeEndereco };
}

const pacienteSemAtendimento = () => ({
  id: 33,
  nome: 'Carla Sem Atendimento',
  data_nascimento: '1992-03-09',
  documento: '39053344705',
  atendimento_ativo: null,
});
const pacienteAguardando = () => ({
  id: 31,
  nome: 'Ana Aguardando',
  data_nascimento: '1990-05-17',
  documento: '52998224725',
  atendimento_ativo: { id: 1025, situacao: 'aguardando_triagem' },
});
const pacienteEmAtendimento = () => ({
  id: 32,
  nome: 'Bruno Em Atendimento',
  data_nascimento: '1985-11-02',
  documento: '11144477735',
  atendimento_ativo: { id: 1026, situacao: 'em_atendimento' },
});

// Resume cada linha da tabela: textos das quatro colunas e o controle da coluna de ação.
function resumirTabela(painel) {
  return painel.elemento('#pacientes').filhos.map((linha) => {
    const acao = linha.filhos[4].filhos;
    return {
      colunas: linha.filhos.slice(0, 4).map((celula) => celula.textContent),
      acoes: acao.map((controle) => ({
        tag: controle.tag,
        texto: controle.textContent,
        href: controle.href,
      })),
      controles: acao,
    };
  });
}

test('tabela mostra o atendimento ativo, ou "Nenhum atendimento ativo", em cada paciente', async () => {
  const painel = await carregarPainel();

  painel.contexto.listar([pacienteAguardando(), pacienteEmAtendimento(), pacienteSemAtendimento()]);

  const linhas = resumirTabela(painel);
  assert.deepEqual(
    linhas.map(({ colunas }) => Array.from(colunas)),
    [
      ['Ana Aguardando', '17/05/1990', '52998224725', '#1025 — Aguardando triagem'],
      ['Bruno Em Atendimento', '02/11/1985', '11144477735', '#1026 — Em atendimento'],
      ['Carla Sem Atendimento', '09/03/1992', '39053344705', 'Nenhum atendimento ativo'],
    ],
  );
});

test('paciente sem atendimento ativo mantém "Selecionar para abertura" e abre o formulário', async () => {
  const painel = await carregarPainel();
  painel.elemento('#abrir-atendimento-card').hidden = true;

  painel.contexto.listar([pacienteSemAtendimento()]);

  const [linha] = resumirTabela(painel);
  assert.equal(linha.acoes.length, 1);
  assert.equal(linha.acoes[0].tag, 'button');
  assert.equal(linha.acoes[0].texto, 'Selecionar para abertura');

  linha.controles[0].click();

  assert.equal(painel.elemento('#abrir-atendimento-card').hidden, false);
  assert.match(painel.elemento('#paciente-para-abertura').textContent, /Carla Sem Atendimento/);
});

test('paciente com atendimento ativo não tem seleção e ganha o link para localizar', async () => {
  const painel = await carregarPainel();

  painel.contexto.listar([pacienteAguardando(), pacienteEmAtendimento()]);

  const [aguardando, emAtendimento] = resumirTabela(painel);
  for (const linha of [aguardando, emAtendimento]) {
    assert.equal(linha.acoes.length, 1);
    assert.equal(linha.acoes[0].tag, 'a');
    assert.equal(linha.acoes[0].texto, 'Localizar atendimento');
    assert.equal(
      linha.acoes.some(({ texto }) => texto === 'Selecionar para abertura'),
      false,
    );
  }
  assert.equal(
    aguardando.acoes[0].href,
    'screens/busca-atendimento.html?numero=1025&cpf=52998224725',
  );
  assert.equal(
    emAtendimento.acoes[0].href,
    'screens/busca-atendimento.html?numero=1026&cpf=11144477735',
  );
});

test('selecionar um paciente com atendimento ativo é recusado, mesmo chamando a função direto', async () => {
  const painel = await carregarPainel();
  painel.elemento('#abrir-atendimento-card').hidden = true;

  painel.contexto.selecionarPacienteParaAbertura(pacienteAguardando());

  assert.equal(painel.elemento('#abrir-atendimento-card').hidden, true);
  assert.equal(painel.elemento('#mensagem').classes.erro, true);
  assert.match(painel.elemento('#mensagem').textContent, /#1025 — Aguardando triagem/);
  assert.equal(
    painel.chamadas.some(({ url }) => url === '/api/atendimentos'),
    false,
  );
});

test('depois de abrir um atendimento, a linha passa a bloquear uma segunda abertura', async () => {
  const painel = await carregarPainel((url) => {
    if (url === '/api/atendimentos') {
      return respostaJson(201, {
        criado: true,
        atendimento: {
          id: 1030,
          paciente_id: 33,
          recepcionista_id: 12,
          situacao: 'aguardando_triagem',
        },
      });
    }
    return respostaJson(401, { erro: 'Sem sessão.' });
  });
  const paciente = pacienteSemAtendimento();
  painel.contexto.listar([paciente]);
  resumirTabela(painel)[0].controles[0].click();

  const formulario = painel.elemento('#form-abertura-atendimento');
  formulario.dadosFormulario = { declaracao_prioridade: 'nao' };
  await formulario.ouvintes.submit[0]({ preventDefault() {}, currentTarget: formulario });

  const envio = painel.chamadas.find(({ url }) => url === '/api/atendimentos');
  assert.equal(JSON.parse(envio.opcoes.body).paciente_id, 33);

  const [linha] = resumirTabela(painel);
  assert.equal(linha.colunas[3], '#1030 — Aguardando triagem');
  assert.equal(linha.acoes.length, 1);
  assert.equal(linha.acoes[0].tag, 'a');
  assert.equal(linha.acoes[0].href, 'screens/busca-atendimento.html?numero=1030&cpf=39053344705');
  assert.equal(painel.elemento('#abrir-atendimento-card').hidden, true);
});

test('tela de localizar preenche número e CPF vindos do link da recepção', () => {
  const link = 'screens/busca-atendimento.html?numero=1025&cpf=52998224725';
  const tela = carregarTelaDeBusca(`?${link.split('?')[1]}`);

  assert.equal(tela.elemento('numero').value, '1025');
  assert.equal(tela.elemento('cpf').value, '529.982.247-25');
  assert.equal(tela.elemento('botao-buscar').focado, true);
  // O CPF sai do endereço para não ficar no histórico do navegador.
  assert.equal(tela.substituicoesDeEndereco.length, 1);
  assert.equal(tela.substituicoesDeEndereco[0][2], '/screens/busca-atendimento.html');
});

test('tela de localizar preenche só o número quando o documento não é um CPF', () => {
  const tela = carregarTelaDeBusca('?numero=1025');

  assert.equal(tela.elemento('numero').value, '1025');
  assert.equal(tela.elemento('cpf').value, '');
  assert.equal(tela.elemento('cpf').focado, true);
});

test('tela de localizar não preenche nada sem parâmetros ou com valores inválidos', () => {
  const semParametros = carregarTelaDeBusca('');
  assert.equal(semParametros.elemento('numero').value, '');
  assert.equal(semParametros.elemento('cpf').value, '');
  assert.equal(semParametros.substituicoesDeEndereco.length, 0);

  const invalidos = carregarTelaDeBusca('?numero=abc&cpf=123');
  assert.equal(invalidos.elemento('numero').value, '');
  assert.equal(invalidos.elemento('cpf').value, '');
});
