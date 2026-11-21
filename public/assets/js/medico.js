const URL_FILA_MEDICA = '/api/atendimentos/medico';
const URL_FILA_ANDAMENTO = '/api/atendimentos/medico/em-andamento';
const URL_CONSULTAS = '/api/consultas';

const filaAguardando = document.getElementById('fila-aguardando');
const filaAndamento = document.getElementById('fila-andamento');
const secaoConsulta = document.getElementById('consulta-card');
const dadosAtendimento = document.getElementById('dados-atendimento');
const formularioConsulta = document.getElementById('form-consulta');
const botaoSalvar = document.getElementById('salvar-consulta');
const botaoAtualizar = document.getElementById('atualizar-fila');
const mensagem = document.getElementById('mensagem');

let atendimentoSelecionado = null;
let carregandoFilas = false;

function mostrarMensagem(texto, ehErro = false) {
  mensagem.textContent = texto;
  mensagem.classList.toggle('erro', ehErro);
}

function criarCelula(texto) {
  const celula = document.createElement('td');
  celula.textContent = texto ?? 'Não informado';
  return celula;
}

function criarBotao(atendimento, texto) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.textContent = texto;
  botao.addEventListener('click', () => selecionarAtendimento(atendimento));
  return botao;
}

function formatarDataHora(valor) {
  if (!valor) return 'Não informado';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString('pt-BR');
}

function renderizarFila(atendimentos, corpo, estado, mensagemVazia, textoBotao) {
  corpo.replaceChildren();
  estado.textContent = atendimentos.length
    ? `${atendimentos.length} atendimento(s).`
    : mensagemVazia;

  for (const atendimento of atendimentos) {
    const linha = document.createElement('tr');
    linha.append(
      criarCelula(`#${atendimento.atendimento_id}`),
      criarCelula(atendimento.paciente_nome),
      criarCelula(atendimento.classificacao),
      criarCelula(atendimento.queixa),
    );

    const acao = document.createElement('td');
    acao.appendChild(criarBotao(atendimento, textoBotao));
    linha.appendChild(acao);
    corpo.appendChild(linha);
  }
}

function selecionarAtendimento(atendimento) {
  atendimentoSelecionado = atendimento;
  dadosAtendimento.replaceChildren();

  const identificacao = document.createElement('p');
  const nome = document.createElement('strong');
  nome.textContent = atendimento.paciente_nome;
  identificacao.append('Paciente: ', nome, ` • Atendimento #${atendimento.atendimento_id}`);

  const triagem = document.createElement('dl');
  const informacoes = [
    ['Classificação informada pela enfermagem', atendimento.classificacao],
    ['Queixa principal', atendimento.queixa],
    ['Pressão arterial', atendimento.pressao],
    ['Temperatura', `${atendimento.temperatura} °C`],
    ['Frequência cardíaca', `${atendimento.frequencia} bpm`],
    ['Saturação', `${atendimento.saturacao}%`],
    ['Triagem registrada em', formatarDataHora(atendimento.data_hora)],
    ['Profissional da triagem', atendimento.profissional_responsavel],
  ];

  for (const [rotulo, valor] of informacoes) {
    const titulo = document.createElement('dt');
    titulo.textContent = rotulo;
    const detalhe = document.createElement('dd');
    detalhe.textContent = valor ?? 'Não informado';
    triagem.append(titulo, detalhe);
  }

  const navegacaoMedicacoes = document.createElement('p');
  const linkMedicacoes = document.createElement('a');
  const parametros = new URLSearchParams({
    atendimento_id: atendimento.atendimento_id,
    paciente_id: atendimento.paciente_id,
    paciente_nome: atendimento.paciente_nome,
  });
  linkMedicacoes.className = 'botao secundario';
  linkMedicacoes.href = `medicacoes.html?${parametros}`;
  linkMedicacoes.textContent = 'Abrir medicações do atendimento';
  navegacaoMedicacoes.appendChild(linkMedicacoes);

  const linkResumo = document.createElement('a');
  linkResumo.className = 'botao secundario';
  linkResumo.href = `resumo-encerramento.html?${parametros}`;
  linkResumo.textContent = 'Revisar resumo e encerramento';
  navegacaoMedicacoes.append(' ', linkResumo);

  dadosAtendimento.append(identificacao, triagem, navegacaoMedicacoes);
  secaoConsulta.hidden = false;
  mostrarMensagem('');
  secaoConsulta.scrollIntoView({ behavior: 'smooth', block: 'start' });
  formularioConsulta.elements.registro_consulta.focus();
}

async function carregarFilas() {
  if (carregandoFilas) return;

  carregandoFilas = true;
  botaoAtualizar.disabled = true;
  try {
    const [aguardando, emAndamento] = await Promise.all([
      fetch(URL_FILA_MEDICA, { credentials: 'same-origin' }),
      fetch(URL_FILA_ANDAMENTO, { credentials: 'same-origin' }),
    ]);

    const [dadosAguardando, dadosAndamento] = await Promise.all([
      aguardando.json(),
      emAndamento.json(),
    ]);

    if (!aguardando.ok) {
      throw new Error(dadosAguardando.erro || `Falha ao carregar a fila: ${aguardando.status}`);
    }
    if (!emAndamento.ok) {
      throw new Error(
        dadosAndamento.erro || `Falha ao carregar atendimentos: ${emAndamento.status}`,
      );
    }
    if (
      !Array.isArray(dadosAguardando.atendimentos) ||
      !Array.isArray(dadosAndamento.atendimentos)
    ) {
      throw new Error('O servidor retornou filas de atendimento em formato inválido.');
    }

    renderizarFila(
      dadosAguardando.atendimentos,
      filaAguardando,
      document.getElementById('estado-aguardando'),
      'Nenhum atendimento aguardando consulta médica.',
      'Iniciar consulta',
    );
    renderizarFila(
      dadosAndamento.atendimentos,
      filaAndamento,
      document.getElementById('estado-andamento'),
      'Nenhum atendimento em andamento.',
      'Continuar consulta',
    );
  } finally {
    carregandoFilas = false;
    botaoAtualizar.disabled = false;
  }
}

botaoAtualizar.addEventListener('click', () => {
  carregarFilas().catch((erro) => {
    console.error(erro);
    mostrarMensagem(erro.message || 'Não foi possível atualizar as filas.', true);
  });
});

document.getElementById('cancelar-consulta').addEventListener('click', () => {
  atendimentoSelecionado = null;
  formularioConsulta.reset();
  secaoConsulta.hidden = true;
  mostrarMensagem('');
});

formularioConsulta.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!atendimentoSelecionado) {
    mostrarMensagem('Selecione um atendimento antes de salvar a consulta.', true);
    return;
  }

  botaoSalvar.disabled = true;
  mostrarMensagem('Salvando consulta...');
  try {
    const resultado = await window.pi2Api.postJson(URL_CONSULTAS, {
      atendimento_id: atendimentoSelecionado.atendimento_id,
      paciente_id: atendimentoSelecionado.paciente_id,
      triagem_id: atendimentoSelecionado.triagem_id,
      registro_consulta: formularioConsulta.elements.registro_consulta.value,
    });

    const confirmacao = `Consulta #${resultado.consulta_id} do atendimento #${resultado.atendimento_id} registrada com sucesso.`;
    formularioConsulta.reset();
    mostrarMensagem(confirmacao);

    try {
      await carregarFilas();
    } catch (erroAtualizacao) {
      console.error(erroAtualizacao);
      mostrarMensagem(
        `${confirmacao} Não foi possível atualizar as filas: ${erroAtualizacao.message}`,
        true,
      );
    }
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(erro.message || 'Não foi possível salvar a consulta.', true);
  } finally {
    botaoSalvar.disabled = false;
  }
});

carregarFilas().catch((erro) => {
  console.error(erro);
  document.getElementById('estado-aguardando').textContent = 'Não foi possível carregar as filas.';
  document.getElementById('estado-andamento').textContent = 'Não foi possível carregar as filas.';
  mostrarMensagem(erro.message || 'Entre como médico para acessar os atendimentos.', true);
});
