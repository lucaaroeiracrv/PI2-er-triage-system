const parametros = new URLSearchParams(window.location.search);
const atendimentoId = parametros.get('atendimento_id');
const pacienteNome = parametros.get('paciente_nome');
const formulario = document.getElementById('form-medicacao');
const listaMedicacoes = document.getElementById('lista-medicacoes');
const mensagem = document.getElementById('mensagem-medicacao');

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
    : 'Paciente Exemplo Um • Atendimento demonstrativo 001';

function mostrarMensagem(texto, ehErro = false) {
  mensagem.textContent = texto;
  mensagem.classList.toggle('erro', ehErro);
}

function adicionarCelula(linha, texto) {
  const celula = document.createElement('td');
  celula.textContent = texto || 'Não informado';
  linha.appendChild(celula);
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();

  const dados = new FormData(formulario);
  const linha = document.createElement('tr');
  adicionarCelula(linha, dados.get('medicacao').trim());
  adicionarCelula(linha, dados.get('dose').trim());
  adicionarCelula(linha, dados.get('via').trim());
  adicionarCelula(linha, dados.get('observacoes').trim());
  listaMedicacoes.appendChild(linha);

  formulario.reset();
  mostrarMensagem('Exemplo adicionado somente nesta tela; não foi salvo no backend.');
});

formulario.addEventListener('reset', () => {
  mostrarMensagem('');
});
