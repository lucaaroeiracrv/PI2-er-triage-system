const parametros = new URLSearchParams(window.location.search);
const atendimentoId = parametros.get('atendimento_id');
const pacienteId = parametros.get('paciente_id');
const pacienteNome = parametros.get('paciente_nome');
const identificacao = document.getElementById('identificacao-atendimento');
const dialogo = document.getElementById('dialogo-confirmacao');
const resultado = document.getElementById('resultado-encerramento');

const dadosIdentificacao = [
  ['Paciente', pacienteNome || 'Paciente Exemplo Um'],
  ['Atendimento', atendimentoId ? `#${atendimentoId}` : '001 • exemplo'],
  ['Identificador do paciente', pacienteId || 'Exemplo fictício'],
  ['Situação atual', 'Em atendimento • exemplo'],
];

for (const [rotulo, valor] of dadosIdentificacao) {
  const titulo = document.createElement('dt');
  titulo.textContent = rotulo;
  const detalhe = document.createElement('dd');
  detalhe.textContent = valor;
  identificacao.append(titulo, detalhe);
}

document.getElementById('abrir-confirmacao').addEventListener('click', () => {
  resultado.textContent = '';
  dialogo.showModal();
});

document.getElementById('cancelar-encerramento').addEventListener('click', () => {
  dialogo.close();
});

document.getElementById('confirmar-encerramento').addEventListener('click', () => {
  dialogo.close();
  resultado.textContent =
    'Demonstração confirmada. Nenhuma alteração foi salva; a situação do atendimento não mudou.';
});
