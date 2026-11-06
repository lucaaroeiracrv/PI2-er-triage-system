// Tela de cadastro do paciente: valida os campos, mostra mensagens
// e deixa pronto o envio dos dados para o backend atual.

const URL_BACKEND = '/api/pacientes';
const BACKEND_PRONTO = true;

const formulario = document.getElementById('form-cadastro');
const mensagem = document.getElementById('mensagem');
const linkTriagem = document.getElementById('link-triagem');
const campoCpf = document.getElementById('cpf');
window.pi2Api.maskCpfInput(campoCpf);

if (new URLSearchParams(window.location.search).get('modo') === 'rascunho') {
  document.documentElement.classList.add('wireframe');
}

function mostrarMensagem(texto, ehErro) {
  mensagem.textContent = texto;
  mensagem.classList.toggle('erro', ehErro);
}

function mostrarErroDoCampo(idDoCampo, texto) {
  document.getElementById('erro-' + idDoCampo).textContent = texto;
  document.getElementById(idDoCampo).setAttribute('aria-invalid', 'true');
}

function limparErros() {
  const campos = ['nome', 'dataNascimento', 'cpf', 'queixa'];
  for (const id of campos) {
    document.getElementById('erro-' + id).textContent = '';
    document.getElementById(id).removeAttribute('aria-invalid');
  }
  mostrarMensagem('', false);
}

function lerDados() {
  const documento = document.getElementById('cpf').value.trim();
  return {
    nome: document.getElementById('nome').value.trim(),
    data_nascimento: document.getElementById('dataNascimento').value,
    documento: documento.replace(/\D/g, ''),
    telefone: document.getElementById('telefone').value.trim(),
    chave_cadastro: crypto.randomUUID(),
  };
}

function validar(dados) {
  let primeiroErro = null;

  function registrarErro(idDoCampo, texto) {
    mostrarErroDoCampo(idDoCampo, texto);
    if (primeiroErro === null) {
      primeiroErro = idDoCampo;
    }
  }

  if (dados.nome === '') {
    registrarErro('nome', 'Informe o nome completo.');
  }

  if (dados.data_nascimento === '') {
    registrarErro('dataNascimento', 'Informe a data de nascimento.');
  } else if (new Date(dados.data_nascimento) > new Date()) {
    registrarErro('dataNascimento', 'A data de nascimento não pode ser futura.');
  }

  if (document.getElementById('cpf').value.trim() === '') {
    registrarErro('cpf', 'Informe o CPF.');
  } else if (dados.documento.length !== 11) {
    registrarErro('cpf', 'O CPF deve ter 11 números.');
  }

  if (document.getElementById('queixa').value.trim() === '') {
    registrarErro('queixa', 'Descreva a queixa principal.');
  }

  return primeiroErro;
}

async function enviarParaBackend(dados) {
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    throw new Error(
      'Esta tela foi aberta como arquivo. Execute npm start e acesse http://127.0.0.1:3000/screens/cadastro.html.',
    );
  }

  return window.pi2Api.postJson(URL_BACKEND, dados);
}

formulario.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  limparErros();
  linkTriagem.hidden = true;

  const dados = lerDados();
  const primeiroErro = validar(dados);

  if (primeiroErro !== null) {
    mostrarMensagem('Corrija os campos indicados e tente novamente.', true);
    document.getElementById(primeiroErro).focus();
    return;
  }

  if (!BACKEND_PRONTO) {
    console.log('Dados prontos para enviar:', dados);
    mostrarMensagem('Dados válidos. O envio ao backend foi preparado para ser ligado.', false);
    return;
  }

  try {
    const resultado = await enviarParaBackend(dados);
    mostrarMensagem(
      resultado.criado
        ? 'Paciente cadastrado com sucesso.'
        : 'Este cadastro já foi registrado nesta tentativa.',
      false,
    );
    formulario.reset();
    linkTriagem.hidden = false;
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(
      erro.message || 'Não foi possível cadastrar o paciente. Tente novamente.',
      true,
    );
  }
});

formulario.addEventListener('reset', function () {
  limparErros();
  linkTriagem.hidden = true;
});
