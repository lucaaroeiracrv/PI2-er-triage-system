const parametros = new URLSearchParams(window.location.search);
const atendimentoId = parametros.get('atendimento_id');
const pacienteNome = parametros.get('paciente_nome');
const formulario = document.getElementById('form-medicacao');
const listaMedicacoes = document.getElementById('lista-medicacoes');
const mensagem = document.getElementById('mensagem-medicacao');
const botaoEnviar = formulario.querySelector('button[type="submit"]');
let carregando = false;

if (atendimentoId) {
  const parametrosResumo = new URLSearchParams();
  parametrosResumo.set('atendimento_id', atendimentoId);
  if (parametros.get('paciente_id')) {
    parametrosResumo.set('paciente_id', parametros.get('paciente_id'));
  }
  if (pacienteNome) {
    parametrosResumo.set('paciente_nome', pacienteNome);
  }
  document.getElementById('link-resumo').href = `resumo-encerramento.html?${parametrosResumo}`;
}

document.getElementById('contexto-atendimento').textContent =
  atendimentoId && pacienteNome
    ? `Paciente: ${pacienteNome} • Atendimento #${atendimentoId}`
    : 'Atendimento não identificado';

function mostrarMensagem(texto, ehErro = false) {
  mensagem.textContent = texto;
  mensagem.classList.toggle('erro', ehErro);
}

function adicionarCelula(linha, texto) {
  const celula = document.createElement('td');
  celula.textContent = texto || 'Não informado';
  linha.appendChild(celula);
}

async function carregarMedicacoes() {
  if (!atendimentoId) {
    throw new Error('Selecione um atendimento pela tela médica.');
  }
  const resposta = await fetch(
    `/api/medicacoes?atendimento_id=${encodeURIComponent(atendimentoId)}`,
    {
      credentials: 'same-origin',
    },
  );
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível carregar as medicações.');
  listaMedicacoes.replaceChildren();
  if (!dados.medicacoes.length) {
    const linha = document.createElement('tr');
    const celula = document.createElement('td');
    celula.colSpan = 4;
    celula.textContent = 'Nenhuma medicação registrada para este atendimento.';
    linha.appendChild(celula);
    listaMedicacoes.appendChild(linha);
    return;
  }
  for (const item of dados.medicacoes) {
    const linha = document.createElement('tr');
    adicionarCelula(linha, item.medicacao);
    adicionarCelula(linha, item.dose);
    adicionarCelula(linha, item.via);
    adicionarCelula(linha, item.observacoes);
    listaMedicacoes.appendChild(linha);
  }
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!atendimentoId || carregando) return;
  const dados = new FormData(formulario);
  carregando = true;
  botaoEnviar.disabled = true;
  mostrarMensagem('Salvando medicação...');
  try {
    const resultado = await window.pi2Api.postJson('/api/medicacoes', {
      atendimento_id: Number(atendimentoId),
      medicacao: dados.get('medicacao').trim(),
      dose: dados.get('dose').trim(),
      via: dados.get('via').trim(),
      observacoes: dados.get('observacoes').trim(),
    });
    formulario.reset();
    await carregarMedicacoes();
    mostrarMensagem(resultado.mensagem || 'Medicação registrada com sucesso.');
  } catch (erro) {
    mostrarMensagem(erro.message || 'Não foi possível salvar a medicação.', true);
  } finally {
    carregando = false;
    botaoEnviar.disabled = false;
  }
});

formulario.addEventListener('reset', () => {
  mostrarMensagem('');
});

carregarMedicacoes().catch((erro) => mostrarMensagem(erro.message, true));
