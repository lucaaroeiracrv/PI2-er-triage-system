// Tela da recepção: busca um paciente, permite escolher o resultado correto
// e abrir um atendimento. Integra com as rotas atuais do backend.

const URL_BUSCA = '/api/pacientes';
const URL_ATENDIMENTO = '/api/atendimentos';
const BACKEND_PRONTO = true;

const PACIENTES_EXEMPLO = [
  { id: 1, nome: 'Maria Souza Lima', data_nascimento: '1985-03-12', documento: '11122233344' },
  { id: 2, nome: 'Maria Souza Andrade', data_nascimento: '1990-07-25', documento: '55566677788' },
  { id: 3, nome: 'João Pereira', data_nascimento: '1972-11-02', documento: '99900011122' },
];

const formularioBusca = document.getElementById('form-busca');
const campoTermo = document.getElementById('termo');
const erroTermo = document.getElementById('erro-termo');
const botaoBuscar = document.getElementById('botao-buscar');
const mensagem = document.getElementById('mensagem');
const areaResultados = document.getElementById('resultados');
const listaPacientes = document.getElementById('lista-pacientes');
const textoEscolhido = document.getElementById('paciente-escolhido');
const botaoAbrir = document.getElementById('botao-abrir');
const linkTriagem = document.getElementById('link-triagem');
const avisoTeste = document.getElementById('aviso-teste');

let pacienteSelecionado = null;

avisoTeste.hidden = BACKEND_PRONTO && window.location.protocol !== 'file:';

function mostrarMensagem(texto, ehErro) {
  mensagem.textContent = texto;
  mensagem.classList.toggle('erro', ehErro);
}

function semAcento(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function formatarCpf(cpf) {
  if (!cpf) return 'Não informado';
  const numero = cpf.replace(/\D/g, '');
  if (numero.length !== 11) return cpf;
  return numero.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function formatarData(data) {
  const partes = data.split('-');
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function limparResultados() {
  pacienteSelecionado = null;
  listaPacientes.textContent = '';
  areaResultados.hidden = true;
  textoEscolhido.textContent = 'Nenhum paciente selecionado.';
  botaoAbrir.disabled = true;
  linkTriagem.hidden = true;
}

function validarTermo(termo) {
  const apenasNumeros = termo.replace(/\D/g, '');
  const pareceCpf = apenasNumeros.length > 0 && /^[\d.\-\s]+$/.test(termo);

  if (termo === '') {
    return 'Digite o nome ou o CPF do paciente.';
  }
  if (pareceCpf && apenasNumeros.length !== 11) {
    return 'O CPF deve ter 11 números.';
  }
  if (!pareceCpf && termo.length < 3) {
    return 'Digite pelo menos 3 letras do nome.';
  }
  return '';
}

function buscarNosExemplos(termo) {
  const textoBusca = semAcento(termo.toLowerCase());
  const numerosBusca = termo.replace(/\D/g, '');

  return PACIENTES_EXEMPLO.filter(function (paciente) {
    const nome = semAcento(paciente.nome.toLowerCase());
    const achouPeloNome = nome.includes(textoBusca);
    const achouPeloCpf = numerosBusca !== '' && paciente.documento.includes(numerosBusca);
    return achouPeloNome || achouPeloCpf;
  });
}

async function buscarNoBackend(termo) {
  exigirServidor();
  const resposta = await fetch(URL_BUSCA + '?busca=' + encodeURIComponent(termo), {
    credentials: 'same-origin',
  });

  if (!resposta.ok) {
    throw new Error('Falha na busca: ' + resposta.status);
  }

  const conteudo = await resposta.json();
  return conteudo.pacientes || [];
}

async function abrirNoBackend(idPaciente) {
  exigirServidor();
  return window.pi2Api.postJson(URL_ATENDIMENTO, {
    paciente_id: idPaciente,
    chave_abertura: crypto.randomUUID(),
  });
}

function exigirServidor() {
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    throw new Error(
      'Esta tela foi aberta como arquivo. Execute npm start e acesse http://127.0.0.1:3000/screens/busca-atendimento.html.',
    );
  }
}

function criarCelula(texto) {
  const celula = document.createElement('td');
  celula.textContent = texto;
  return celula;
}

function selecionarPaciente(paciente, botaoClicado) {
  pacienteSelecionado = paciente;
  linkTriagem.hidden = true;

  const botoes = listaPacientes.querySelectorAll('button');
  for (const botao of botoes) {
    botao.textContent = 'Selecionar';
    botao.setAttribute('aria-pressed', 'false');
  }
  botaoClicado.textContent = 'Selecionado';
  botaoClicado.setAttribute('aria-pressed', 'true');

  textoEscolhido.textContent =
    'Paciente selecionado: ' + paciente.nome + ' (CPF ' + formatarCpf(paciente.documento) + ')';
  botaoAbrir.disabled = false;
}

function mostrarLista(pacientes) {
  listaPacientes.textContent = '';

  for (const paciente of pacientes) {
    const linha = document.createElement('tr');
    linha.appendChild(criarCelula(paciente.nome));
    linha.appendChild(criarCelula(formatarData(paciente.data_nascimento)));
    linha.appendChild(criarCelula(formatarCpf(paciente.documento)));

    const celulaAcao = document.createElement('td');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'secundario';
    botao.textContent = 'Selecionar';
    botao.setAttribute('aria-pressed', 'false');
    botao.addEventListener('click', function () {
      selecionarPaciente(paciente, botao);
    });
    celulaAcao.appendChild(botao);
    linha.appendChild(celulaAcao);

    listaPacientes.appendChild(linha);
  }

  areaResultados.hidden = false;
}

formularioBusca.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  limparResultados();
  mostrarMensagem('', false);
  erroTermo.textContent = '';
  campoTermo.removeAttribute('aria-invalid');

  const termo = campoTermo.value.trim();
  const erro = validarTermo(termo);
  if (erro !== '') {
    erroTermo.textContent = erro;
    campoTermo.setAttribute('aria-invalid', 'true');
    campoTermo.focus();
    return;
  }

  botaoBuscar.disabled = true;
  mostrarMensagem('Buscando...', false);

  try {
    let pacientes;
    if (BACKEND_PRONTO) {
      pacientes = await buscarNoBackend(termo);
    } else {
      pacientes = buscarNosExemplos(termo);
    }

    if (pacientes.length === 0) {
      mostrarMensagem(
        'Nenhum paciente encontrado. Confira o nome ou o CPF, ou cadastre um novo paciente.',
        true,
      );
    } else {
      mostrarLista(pacientes);
      mostrarMensagem(pacientes.length + ' paciente(s) encontrado(s). Escolha o correto.', false);
    }
  } catch (erroDaBusca) {
    console.error(erroDaBusca);
    mostrarMensagem(
      erroDaBusca.message || 'Não foi possível buscar os pacientes. Tente novamente.',
      true,
    );
  } finally {
    botaoBuscar.disabled = false;
  }
});

botaoAbrir.addEventListener('click', async function () {
  if (pacienteSelecionado === null) {
    mostrarMensagem('Selecione um paciente antes de abrir o atendimento.', true);
    return;
  }

  botaoAbrir.disabled = true;
  mostrarMensagem('Abrindo atendimento...', false);

  try {
    const resultado = await abrirNoBackend(pacienteSelecionado.id);
    mostrarMensagem(
      resultado.criado
        ? 'Atendimento aberto com sucesso. Situação: aguardando triagem.'
        : 'Este atendimento já foi registrado para este paciente.',
      false,
    );
    linkTriagem.hidden = false;
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(erro.message || 'Não foi possível abrir o atendimento.', true);
  } finally {
    botaoAbrir.disabled = false;
  }
});
