const parametros = new URLSearchParams(window.location.search);
const atendimentoId = parametros.get('atendimento_id');
const pacienteId = parametros.get('paciente_id');
const pacienteNome = parametros.get('paciente_nome');
const identificacao = document.getElementById('identificacao-atendimento');
const dialogo = document.getElementById('dialogo-confirmacao');
const resultado = document.getElementById('resultado-encerramento');
const botaoAbrir = document.getElementById('abrir-confirmacao');
const botaoConfirmar = document.getElementById('confirmar-encerramento');
let resumo = null;

function adicionarDefinicao(container, rotulo, valor) {
  const titulo = document.createElement('dt');
  titulo.textContent = rotulo;
  const detalhe = document.createElement('dd');
  detalhe.textContent = valor ?? 'Não informado';
  container.append(titulo, detalhe);
}

function atualizarIdentificacao() {
  identificacao.replaceChildren();
  adicionarDefinicao(identificacao, 'Paciente', resumo.paciente_nome);
  adicionarDefinicao(identificacao, 'Atendimento', `#${resumo.atendimento_id}`);
  adicionarDefinicao(identificacao, 'Identificador do paciente', String(resumo.paciente_id));
  adicionarDefinicao(identificacao, 'Situação atual', resumo.situacao);
  document.getElementById('situacao-atendimento').textContent = resumo.situacao;
}

function atualizarTriagem() {
  const container = document.getElementById('dados-triagem');
  container.replaceChildren();
  if (!resumo.triagem) {
    adicionarDefinicao(container, 'Situação', 'Nenhuma triagem registrada.');
    return;
  }
  adicionarDefinicao(container, 'Queixa principal', resumo.triagem.queixa);
  adicionarDefinicao(container, 'Classificação', resumo.triagem.classificacao);
  adicionarDefinicao(
    container,
    'Sinais vitais',
    `Pressão: ${resumo.triagem.pressao} • Temperatura: ${resumo.triagem.temperatura} °C • Frequência: ${resumo.triagem.frequencia} bpm • Saturação: ${resumo.triagem.saturacao}%`,
  );
  adicionarDefinicao(container, 'Profissional da triagem', resumo.triagem.profissional_responsavel);
}

function atualizarConsultas() {
  const container = document.getElementById('dados-consultas');
  container.replaceChildren();
  if (!resumo.consultas.length) {
    const vazio = document.createElement('p');
    vazio.textContent = 'Nenhuma consulta registrada.';
    container.appendChild(vazio);
    return;
  }
  resumo.consultas.forEach((consulta) => {
    const cartao = document.createElement('article');
    const titulo = document.createElement('h3');
    titulo.textContent = `Consulta #${consulta.consulta_id}`;
    const texto = document.createElement('p');
    texto.textContent = consulta.registro_consulta;
    const autoria = document.createElement('p');
    autoria.textContent = `Responsável: ${consulta.medico_nome || 'Não informado'}`;
    cartao.append(titulo, texto, autoria);
    container.appendChild(cartao);
  });
}

function atualizarMedicacoes() {
  const container = document.getElementById('dados-medicacoes');
  container.replaceChildren();
  if (!resumo.medicacoes.length) {
    const vazio = document.createElement('li');
    vazio.textContent = 'Nenhuma medicação registrada.';
    container.appendChild(vazio);
    return;
  }
  for (const item of resumo.medicacoes) {
    const linha = document.createElement('li');
    linha.textContent = `${item.medicacao} • dose: ${item.dose} • via: ${item.via}${item.observacoes ? ` • ${item.observacoes}` : ''}`;
    container.appendChild(linha);
  }
}

async function carregarResumo() {
  if (!atendimentoId) throw new Error('Selecione um atendimento pela tela médica.');
  const resposta = await fetch(
    `/api/atendimentos/resumo?atendimento_id=${encodeURIComponent(atendimentoId)}`,
    {
      credentials: 'same-origin',
    },
  );
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível carregar o resumo.');
  resumo = dados;
  atualizarIdentificacao();
  atualizarTriagem();
  atualizarConsultas();
  atualizarMedicacoes();
  if (resumo.situacao === 'finalizado') {
    botaoAbrir.disabled = true;
    resultado.textContent = 'Este atendimento já está finalizado.';
  }
}

document.getElementById('abrir-confirmacao').addEventListener('click', () => {
  resultado.textContent = '';
  dialogo.showModal();
});

document.getElementById('cancelar-encerramento').addEventListener('click', () => {
  dialogo.close();
});

botaoConfirmar.addEventListener('click', async () => {
  if (!atendimentoId) return;
  botaoConfirmar.disabled = true;
  dialogo.close();
  resultado.textContent = 'Finalizando atendimento...';
  try {
    const dados = await window.pi2Api.postJson('/api/atendimentos/finalizar', {
      atendimento_id: Number(atendimentoId),
    });
    resumo.situacao = dados.situacao;
    atualizarIdentificacao();
    botaoAbrir.disabled = true;
    resultado.textContent = dados.mensagem;
  } catch (erro) {
    resultado.textContent = erro.message || 'Não foi possível finalizar o atendimento.';
  } finally {
    botaoConfirmar.disabled = false;
  }
});

carregarResumo().catch((erro) => {
  botaoAbrir.disabled = true;
  resultado.textContent = erro.message;
});
