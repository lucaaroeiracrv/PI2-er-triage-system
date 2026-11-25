const formulario = document.getElementById('form-busca');
const campoNumero = document.getElementById('numero');
const campoCpf = document.getElementById('cpf');
const botaoBuscar = document.getElementById('botao-buscar');
const botaoExcluir = document.getElementById('botao-excluir');
const mensagem = document.getElementById('mensagem');
const resultadoAtendimento = document.getElementById('resultado-atendimento');

let atendimentoEncontrado = null;

window.pi2Api.maskCpfInput(campoCpf);

function mostrarMensagem(texto, ehErro = false) {
  mensagem.textContent = texto;
  mensagem.classList.toggle('erro', ehErro);
}

function limparResultado() {
  atendimentoEncontrado = null;
  resultadoAtendimento.hidden = true;
  document.getElementById('dados-atendimento').replaceChildren();
  document.getElementById('aviso-exclusao').hidden = true;
  botaoExcluir.hidden = true;
}

function adicionarDefinicao(rotulo, valor) {
  const titulo = document.createElement('dt');
  titulo.textContent = rotulo;
  const detalhe = document.createElement('dd');
  detalhe.textContent = valor ?? 'Não informado';
  document.getElementById('dados-atendimento').append(titulo, detalhe);
}

function validarCampos() {
  document.getElementById('erro-numero').textContent = '';
  document.getElementById('erro-cpf').textContent = '';
  campoNumero.removeAttribute('aria-invalid');
  campoCpf.removeAttribute('aria-invalid');

  const numero = campoNumero.value.trim();
  const cpf = campoCpf.value.trim();
  let valido = true;

  if (!/^\d+$/.test(numero) || !Number.isSafeInteger(Number(numero)) || Number(numero) <= 0) {
    document.getElementById('erro-numero').textContent =
      'Informe um número de atendimento válido.';
    campoNumero.setAttribute('aria-invalid', 'true');
    valido = false;
  }
  if (!window.pi2Api.validarCpf(cpf)) {
    document.getElementById('erro-cpf').textContent = 'Informe um CPF válido com 11 números.';
    campoCpf.setAttribute('aria-invalid', 'true');
    valido = false;
  }

  return valido;
}

function mostrarAtendimento(atendimento) {
  atendimentoEncontrado = atendimento;
  const dados = document.getElementById('dados-atendimento');
  dados.replaceChildren();
  adicionarDefinicao('Número', `#${atendimento.atendimento_id}`);
  adicionarDefinicao('Paciente', atendimento.paciente_nome);
  adicionarDefinicao('Situação', atendimento.situacao);
  adicionarDefinicao(
    'Aberto em',
    atendimento.aberto_em ? new Date(atendimento.aberto_em).toLocaleString('pt-BR') : 'Não informado',
  );
  const podeExcluir = atendimento.situacao === 'aguardando_triagem';
  document.getElementById('aviso-exclusao').hidden = !podeExcluir;
  botaoExcluir.hidden = !podeExcluir;
  resultadoAtendimento.hidden = false;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparResultado();
  mostrarMensagem('');
  if (!validarCampos()) return;

  botaoBuscar.disabled = true;
  mostrarMensagem('Buscando atendimento...');
  try {
    const parametros = new URLSearchParams({
      numero: campoNumero.value.trim(),
      cpf: campoCpf.value.replace(/[.-]/g, ''),
    });
    const resposta = await fetch(`/api/atendimentos/busca?${parametros}`, {
      credentials: 'same-origin',
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      throw new Error(dados.erro || 'Não foi possível localizar o atendimento.');
    }
    mostrarAtendimento(dados);
    mostrarMensagem('Atendimento localizado.');
  } catch (erro) {
    mostrarMensagem(erro.message || 'Não foi possível localizar o atendimento.', true);
  } finally {
    botaoBuscar.disabled = false;
  }
});

botaoExcluir.addEventListener('click', async () => {
  if (!atendimentoEncontrado || atendimentoEncontrado.situacao !== 'aguardando_triagem') return;
  const confirmacao = window.confirm(
    `Excluir o atendimento #${atendimentoEncontrado.atendimento_id} de ${atendimentoEncontrado.paciente_nome}? O cadastro do paciente será mantido.`,
  );
  if (!confirmacao) return;

  botaoExcluir.disabled = true;
  mostrarMensagem('Excluindo atendimento...');
  try {
    const resultado = await window.pi2Api.postJson('/api/atendimentos/excluir', {
      atendimento_id: atendimentoEncontrado.atendimento_id,
    });
    limparResultado();
    mostrarMensagem(resultado.mensagem);
  } catch (erro) {
    mostrarMensagem(erro.message || 'Não foi possível excluir o atendimento.', true);
  } finally {
    botaoExcluir.disabled = false;
  }
});
