// A interface de teste evolui neste arquivo junto com os módulos do backend.
const $ = (seletor) => document.querySelector(seletor);
// Token da sessão mantido na memória da página e enviado nas operações que alteram dados.
let csrf = null;
let intervaloFilaMedica = null;
let atendimentoTriagemSelecionado = null;
let atendimentoConsultaSelecionado = null;
let carregandoFilaMedica = false;
let pacienteAberturaSelecionado = null;
// Chave mantida durante a mesma tentativa de envio; uma edição inicia outra tentativa.
let chaveCadastro = crypto.randomUUID();
$('[name="data_nascimento"]').max = new Date().toISOString().slice(0, 10);
// Associa cada paciente a uma tentativa de abertura, inclusive após repetir um clique.
const chavesAbertura = new Map();
const campoCpf = $('[name="documento"]');
window.pi2Api.maskCpfInput(campoCpf);
window.pi2Api.maskTelefoneInput($('[name="telefone"]'));
window.pi2Api.maskPressaoInput($('[name="pressao"]'));
// Rótulos de apresentação dos perfis que o backend reconhece.
const nomesPerfis = {
  recepcao: 'Recepção',
  enfermagem: 'Enfermagem',
  medico: 'Médico',
};
const coresClassificacao = {
  Vermelho: 'vermelho',
  Laranja: 'laranja',
  Amarelo: 'amarelo',
  Verde: 'verde',
  Azul: 'azul',
};
// Mostra um retorno legível e distingue o erro por texto e aparência.
function mensagem(texto, erro = false) {
  // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
  $('#mensagem').textContent = texto;
  $('#mensagem').classList.toggle('erro', erro);
}
// Centraliza pedidos ao backend, enviando o cookie da sessão e o token dos envios autenticados.
async function pedir(
  url,
  {
    // Método HTTP que separa leitura e envio de dados.
    method = 'GET',
    dados,
  } = {},
) {
  // Resposta HTTP aguardada antes de ler o conteúdo ou tratar a falha.
  let res;
  try {
    res = await fetch(url, {
      // Método HTTP que separa leitura e envio de dados.
      method,
      // Mantém o cookie apenas em pedidos destinados à mesma origem.
      credentials: 'same-origin',
      // Cabeçalhos transportam o tipo dos dados e a proteção da sessão.
      headers: {
        ...(dados
          ? {
              // Informa ao navegador o formato e a codificação da resposta.
              'Content-Type': 'application/json',
            }
          : {}),
        ...(csrf
          ? {
              'X-CSRF-Token': csrf,
            }
          : {}),
      },
      ...(dados
        ? {
            // Converte os campos em JSON para o backend conferir e processar.
            body: JSON.stringify(dados),
          }
        : {}),
    });
  } catch {
    throw new Error('Não foi possível falar com o backend. Confira se o servidor está aberto.');
  }
  // Conteúdo já lido ou convertido; só é usado depois da verificação da operação.
  const conteudo = await res.json();
  // O status HTTP é conferido antes de tratar o conteúdo como sucesso.
  if (!res.ok) {
    if (res.status === 401) {
      mostrarSaida();
    }
    const erro = new Error(conteudo.erro || 'Não foi possível concluir.');
    erro.status = res.status;
    // Mantém a falha original para que o tratamento central registre a causa e encerre a operação.
    throw erro;
  }
  // Entrega o JSON ao formulário somente depois de conferir o status HTTP.
  return conteudo;
}
// Limpa da interface o estado da sessão anterior, inclusive formulários e resultados.
function mostrarSaida() {
  // Atualiza o token em memória junto com a identidade da sessão que está ativa.
  csrf = null;
  // Ajusta a área visível conforme o estado da sessão; a proteção definitiva continua no backend.
  $('#entrada').hidden = false;
  // Ajusta a área visível conforme o estado da sessão; a proteção definitiva continua no backend.
  $('#sessao').hidden = true;
  // Ajusta a área visível conforme o estado da sessão; a proteção definitiva continua no backend.
  $('#recepcao').hidden = true;
  $('#enfermagem').hidden = true;
  //esconde a área da enfermagem.
  $('#medico').hidden = true;
  //esconde a área do médico.
  $('#formulario-triagem-card').hidden = true;
  limparConsulta();
  //esconde o formulário de triagem.
  atendimentoTriagemSelecionado = null;
  //limpa a seleção do atendimento, para não reutilizá-la por engano.
  limparResultadoTriagem();
  if (intervaloFilaMedica) {
    //verifica se existe uma atualização automática da fila médica ativa.
    clearInterval(intervaloFilaMedica);
    //cancela essa atualização periódica.
    intervaloFilaMedica = null;
    //limpa a referência ao intervalo cancelado.
  }
  // Atualiza a árvore DOM usando elementos próprios, mantendo dados separados da marcação.
  $('#pacientes').replaceChildren();
  // Uma tentativa editada ou concluída recebe outra chave; uma repetição sem edição mantém a anterior.
  chaveCadastro = crypto.randomUUID();
  // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
  $('#resultado-busca').textContent = 'Use a busca ou cadastre um paciente.';
  chavesAbertura.clear();
  // Aplica o mesmo comportamento aos controles relacionados sem copiar o código para cada elemento.
  document.querySelectorAll('form').forEach((form) => form.reset());
}
// Usa a identidade devolvida pelo backend para identificar o usuário e mostrar sua área.
async function mostrarSessao(dados) {
  // Atualiza o token em memória junto com a identidade da sessão que está ativa.
  csrf = dados.csrf;
  // Ajusta a área visível conforme o estado da sessão; a proteção definitiva continua no backend.
  $('#entrada').hidden = true;
  // Ajusta a área visível conforme o estado da sessão; a proteção definitiva continua no backend.
  $('#sessao').hidden = false;
  // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
  $('#identidade').textContent = `${dados.usuario.nome} • ${nomesPerfis[dados.usuario.perfil]}`;
  // Ajusta a área visível conforme o estado da sessão; a proteção definitiva continua no backend.
  $('#recepcao').hidden = dados.usuario.perfil !== 'recepcao';
  $('#enfermagem').hidden = dados.usuario.perfil !== 'enfermagem';
  $('#medico').hidden = dados.usuario.perfil !== 'medico';
  // Resposta da área autorizada pelo backend, usada para orientar o usuário conectado.
  const permissao = await pedir(`/api/perfis/${dados.usuario.perfil}`);
  // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
  $('#permissao').textContent = permissao.mensagem;
  if (dados.usuario.perfil === 'enfermagem') {
    await carregarAtendimentosAguardandoTriagem();
  }
  if (dados.usuario.perfil === 'medico') {
    await carregarFilaMedica();
    intervaloFilaMedica = setInterval(() => {
      carregarFilaMedica().catch((erro) => mensagem(erro.message, true));
    }, 2000);
  }
}
function criarCelula(texto) {
  const celula = document.createElement('td');
  celula.textContent = texto;
  return celula;
}
function criarCelulaClassificacao(classificacao) {
  const celula = document.createElement('td');
  const etiqueta = document.createElement('span');
  etiqueta.className = `etiqueta-classificacao ${
    coresClassificacao[classificacao]
      ? `classificacao-${coresClassificacao[classificacao]}`
      : 'classificacao-desconhecida'
  }`;
  etiqueta.textContent = classificacao;
  celula.append(etiqueta);
  return celula;
}
function formatarDataHora(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime())
    ? String(valor || 'Não informado')
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(data);
}
function limparResultadoTriagem() {
  $('#resultado-triagem-card').hidden = true;
  $('#resultado-triagem-vinculo').textContent = '';
  $('#resultado-triagem-dados').textContent = '';
  $('#resultado-triagem-classificacao').textContent = '';
}
function limparConsulta() {
  atendimentoConsultaSelecionado = null;
  $('#consulta-card').hidden = true;
  $('#consulta-contexto').textContent = '';
  $('#resultado-consulta').textContent = '';
  $('#form-consulta').reset();
  $('#form-medicacao-medico').reset();
  $('#resultado-medicacao-medico').textContent = '';
  $('#resumo-identificacao-medico').replaceChildren();
  $('#resumo-triagem-medico').replaceChildren();
  $('#resumo-consultas-medico').replaceChildren();
  $('#lista-medicacoes-medico').replaceChildren();
  $('#encerrar-atendimento').disabled = true;
  $('#form-consulta').querySelector('button[type="submit"]').disabled = false;
  $('#form-medicacao-medico').querySelector('button[type="submit"]').disabled = true;
}
function selecionarAtendimentoConsulta(atendimento) {
  atendimentoConsultaSelecionado = atendimento;
  $('#form-consulta').reset();
  $('#resultado-consulta').textContent = '';
  $('#resultado-medicacao-medico').textContent = '';
  $('#consulta-contexto').textContent =
    `Atendimento #${atendimento.atendimento_id} • ${atendimento.paciente_nome} (paciente #${atendimento.paciente_id}) • ${atendimento.classificacao}`;
  $('#resumo-identificacao-medico').replaceChildren();
  $('#resumo-triagem-medico').replaceChildren();
  $('#resumo-consultas-medico').replaceChildren();
  $('#lista-medicacoes-medico').replaceChildren();
  $('#form-consulta').querySelector('button[type="submit"]').disabled = false;
  $('#form-medicacao-medico').querySelector('button[type="submit"]').disabled = true;
  $('#encerrar-atendimento').disabled = true;
  $('#consulta-card').hidden = false;
  $('#consulta-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  carregarResumoMedico(atendimento.atendimento_id).catch((erro) => {
    mensagem(`Atendimento selecionado, mas não foi possível carregar o resumo: ${erro.message}`, true);
  });
}
function adicionarDefinicao(container, rotulo, valor) {
  const titulo = document.createElement('dt');
  titulo.textContent = rotulo;
  const detalhe = document.createElement('dd');
  detalhe.textContent = valor ?? 'Não informado';
  container.append(titulo, detalhe);
}
function renderizarResumoMedico(resumo) {
  const identificacao = $('#resumo-identificacao-medico');
  identificacao.replaceChildren();
  adicionarDefinicao(identificacao, 'Paciente', resumo.paciente_nome);
  adicionarDefinicao(identificacao, 'Atendimento', `#${resumo.atendimento_id}`);
  adicionarDefinicao(identificacao, 'Situação', resumo.situacao);

  const triagem = $('#resumo-triagem-medico');
  triagem.replaceChildren();
  if (resumo.triagem) {
    adicionarDefinicao(triagem, 'Queixa principal', resumo.triagem.queixa);
    adicionarDefinicao(triagem, 'Classificação', resumo.triagem.classificacao);
    adicionarDefinicao(
      triagem,
      'Sinais vitais',
      `Pressão: ${resumo.triagem.pressao} • Temperatura: ${resumo.triagem.temperatura} °C • Frequência: ${resumo.triagem.frequencia} bpm • Saturação: ${resumo.triagem.saturacao}%`,
    );
    adicionarDefinicao(
      triagem,
      'Profissional da triagem',
      resumo.triagem.profissional_responsavel,
    );
  } else {
    adicionarDefinicao(triagem, 'Situação', 'Nenhuma triagem registrada.');
  }

  const consultas = $('#resumo-consultas-medico');
  consultas.replaceChildren();
  if (resumo.consultas.length) {
    for (const consulta of resumo.consultas) {
      const artigo = document.createElement('article');
      const titulo = document.createElement('h4');
      titulo.textContent = `Consulta #${consulta.consulta_id}`;
      const registro = document.createElement('p');
      registro.textContent = consulta.registro_consulta;
      const autoria = document.createElement('p');
      autoria.textContent = `Responsável: ${consulta.medico_nome || 'Não informado'}`;
      artigo.append(titulo, registro, autoria);
      consultas.append(artigo);
    }
  } else {
    const vazio = document.createElement('p');
    vazio.textContent = 'Nenhuma consulta registrada.';
    consultas.append(vazio);
  }

  const medicacoes = $('#lista-medicacoes-medico');
  medicacoes.replaceChildren();
  if (resumo.medicacoes.length) {
    for (const item of resumo.medicacoes) {
      const linha = document.createElement('tr');
      linha.append(
        criarCelula(item.medicacao),
        criarCelula(item.dose),
        criarCelula(item.via),
        criarCelula(item.observacoes),
      );
      medicacoes.append(linha);
    }
  } else {
    const linha = document.createElement('tr');
    const celula = criarCelula('Nenhuma medicação registrada.');
    celula.colSpan = 4;
    linha.append(celula);
    medicacoes.append(linha);
  }

  const emAtendimento = resumo.situacao === 'em_atendimento';
  const finalizado = resumo.situacao === 'finalizado';
  $('#form-medicacao-medico').querySelector('button[type="submit"]').disabled = !emAtendimento;
  $('#encerrar-atendimento').disabled = !emAtendimento;
  $('#form-consulta').querySelector('button[type="submit"]').disabled = finalizado;
  $('#resultado-medicacao-medico').textContent =
    resumo.situacao === 'aguardando_medico'
      ? 'Registre uma consulta antes de adicionar medicações.'
      : finalizado
        ? 'Este atendimento está finalizado; os registros são somente para consulta.'
        : '';
}
async function carregarResumoMedico(atendimentoId) {
  const resumo = await pedir(
    `/api/atendimentos/resumo?atendimento_id=${encodeURIComponent(atendimentoId)}`,
  );
  if (atendimentoConsultaSelecionado?.atendimento_id !== atendimentoId) return;
  renderizarResumoMedico(resumo);
}
function mostrarResultadoTriagem(triagem) {
  $('#resultado-triagem-vinculo').textContent =
    `Atendimento #${triagem.atendimento_id} • ${triagem.paciente_nome} (paciente #${triagem.paciente_id})`;
  $('#resultado-triagem-dados').textContent = [
    `Queixa: ${triagem.queixa}`,
    `Pressão: ${triagem.pressao}`,
    `Temperatura: ${triagem.temperatura} °C`,
    `Frequência: ${triagem.frequencia} bpm`,
    `Saturação: ${triagem.saturacao}%`,
    `Registrada em: ${formatarDataHora(triagem.data_hora)}`,
  ].join(' • ');
  $('#resultado-triagem-classificacao').textContent =
    `Classificação registrada pela enfermagem: ${triagem.classificacao} • ${triagem.profissional_responsavel}`;
  $('#resultado-triagem-card').hidden = false;
}
async function carregarAtendimentosAguardandoTriagem() {
  const resultado = await pedir('/api/triagens/pendentes');
  const corpo = $('#fila-triagem');
  corpo.replaceChildren();
  $('#resultado-triagens').textContent = resultado.atendimentos.length
    ? `${resultado.atendimentos.length} atendimento(s) aguardando triagem.`
    : 'Nenhum atendimento aguardando triagem.';

  for (const atendimento of resultado.atendimentos) {
    const linha = document.createElement('tr');
    linha.append(
      criarCelula(`#${atendimento.atendimento_id}`),
      criarCelula(atendimento.paciente_nome),
      criarCelula(formatarDataHora(atendimento.aberto_em)),
    );
    const acao = document.createElement('td');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = 'Registrar triagem';
    botao.addEventListener('click', () => {
      limparResultadoTriagem();
      atendimentoTriagemSelecionado = atendimento.atendimento_id;
      $('#atendimento-selecionado').textContent =
        `Atendimento #${atendimento.atendimento_id} • ${atendimento.paciente_nome}`;
      $('#formulario-triagem-card').hidden = false;
      $('#formulario-triagem-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    acao.append(botao);
    linha.append(acao);
    corpo.append(linha);
  }
}
async function carregarFilaMedica() {
  if (carregandoFilaMedica) {
    return;
  }
  carregandoFilaMedica = true;
  try {
    const [aguardando, emAndamento] = await Promise.all([
      pedir('/api/atendimentos/medico'),
      pedir('/api/atendimentos/medico/em-andamento'),
    ]);
    renderizarFilaMedica(
      aguardando.atendimentos,
      $('#fila-medica'),
      $('#resultado-fila-medica'),
      'Nenhum atendimento aguardando atendimento médico. A fila é atualizada automaticamente a cada 2 segundos.',
      'Iniciar consulta',
    );
    renderizarFilaMedica(
      emAndamento.atendimentos,
      $('#fila-medica-andamento'),
      $('#resultado-fila-medica-andamento'),
      'Nenhum atendimento em andamento.',
      'Continuar consulta',
    );
  } finally {
    carregandoFilaMedica = false;
  }
}
function renderizarFilaMedica(atendimentos, corpo, estado, mensagemVazia, textoAcao) {
  corpo.replaceChildren();
  estado.textContent = atendimentos.length
    ? `${atendimentos.length} atendimento(s). Atualização automática a cada 2 segundos.`
    : mensagemVazia;

  for (const atendimento of atendimentos) {
    const linha = document.createElement('tr');
    const sinaisVitais = [
      `Queixa: ${atendimento.queixa}`,
      `Pressão: ${atendimento.pressao}`,
      `Temperatura: ${atendimento.temperatura} °C`,
      `Frequência: ${atendimento.frequencia} bpm`,
      `Saturação: ${atendimento.saturacao}%`,
    ].join(' • ');
    linha.append(
      criarCelula(`#${atendimento.atendimento_id}`),
      criarCelula(atendimento.paciente_nome),
      criarCelulaClassificacao(atendimento.classificacao),
      criarCelula(formatarDataHora(atendimento.data_hora)),
      criarCelula(atendimento.profissional_responsavel),
      criarCelula(sinaisVitais),
    );
    const acao = document.createElement('td');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = textoAcao;
    botao.addEventListener('click', () => selecionarAtendimentoConsulta(atendimento));
    acao.append(botao);
    linha.append(acao);
    corpo.append(linha);
  }
}
function obterFaixaEtaria(dataNascimento) {
  const [ano, mes, dia] = dataNascimento.split('-').map(Number);
  const nascimento = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());

  if (aindaNaoFezAniversario) idade -= 1;
  if (idade >= 80) return { valor: 'idoso_80_mais', rotulo: 'Pessoa idosa com 80 anos ou mais' };
  if (idade >= 60) return { valor: 'idoso_60_79', rotulo: 'Pessoa idosa de 60 a 79 anos' };
  return null;
}
function formatarDataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
function atualizarLimiteDataDoacao() {
  const hoje = new Date();
  const dataMaxima = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dataMinima = new Date(dataMaxima);
  dataMinima.setDate(dataMinima.getDate() - 120);
  const campoDataDoacao = $('#form-abertura-atendimento [name="data_doacao_sangue"]');

  campoDataDoacao.max = formatarDataLocal(dataMaxima);
  campoDataDoacao.min = formatarDataLocal(dataMinima);
}
function atualizarFormularioPrioridade() {
  const declaracao = $('#form-abertura-atendimento [name="declaracao_prioridade"]:checked')?.value;
  const detalhes = $('#detalhes-prioridade');
  const campoDataDoacao = $('#campo-data-doacao');
  const dataDoacao = $('#form-abertura-atendimento [name="data_doacao_sangue"]');
  const doador = $('#doador-sangue');

  detalhes.hidden = declaracao !== 'sim';
  if (declaracao !== 'sim') {
    $('#form-abertura-atendimento')
      .querySelectorAll('[name="categorias_prioridade"]')
      .forEach((categoria) => {
        categoria.checked = false;
      });
    doador.checked = false;
    dataDoacao.value = '';
  }

  const faixaEtaria = pacienteAberturaSelecionado
    ? obterFaixaEtaria(pacienteAberturaSelecionado.data_nascimento)
    : null;
  $('#prioridade-por-idade').textContent = faixaEtaria
    ? `${faixaEtaria.rotulo} — identificado automaticamente pela data de nascimento.`
    : 'Nenhuma faixa etária de prioridade identificada pela data de nascimento.';

  campoDataDoacao.hidden = declaracao !== 'sim' || !doador.checked;
  dataDoacao.required = declaracao === 'sim' && doador.checked;
  if (declaracao === 'sim' && doador.checked) {
    atualizarLimiteDataDoacao();
  } else {
    dataDoacao.value = '';
  }
}
function selecionarPacienteParaAbertura(paciente) {
  pacienteAberturaSelecionado = paciente;
  $('#form-abertura-atendimento').reset();
  $('#paciente-para-abertura').textContent =
    `Paciente: ${paciente.nome} • Nascimento: ${paciente.data_nascimento.split('-').reverse().join('/')}`;
  $('#abrir-atendimento-card').hidden = false;
  atualizarFormularioPrioridade();
  $('#abrir-atendimento-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#form-abertura-atendimento [name="declaracao_prioridade"]').focus();
}
// Constrói a lista com elementos DOM e textContent; nomes digitados não são interpretados como HTML.
function listar(pacientes) {
  // Atualiza a árvore DOM usando elementos próprios, mantendo dados separados da marcação.
  $('#pacientes').replaceChildren();
  // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
  $('#resultado-busca').textContent = pacientes.length
    ? `${pacientes.length} paciente(s) apresentado(s). A busca retorna até 50 resultados.`
    : 'Nenhum paciente encontrado.';
  // Processa cada elemento de forma independente para preservar a relação entre os dados da mesma iteração.
  for (// Cadastro validado ou registro da iteração atual; sua identificação liga as próximas operações.
  const paciente of pacientes) {
    // Elemento de tabela criado para o paciente atual, sem montar HTML com texto digitado.
    const linha = document.createElement('tr');
    // Processa cada elemento de forma independente para preservar a relação entre os dados da mesma iteração.
    for (// Corpo completo recebido do navegador, que ainda precisa ser convertido e conferido como objeto JSON.
    const texto of [
      paciente.nome,
      paciente.data_nascimento.split('-').reverse().join('/'),
      paciente.documento || 'Não informado',
    ]) {
      // Célula DOM que mantém o conteúdo do paciente separado da marcação da página.
      const celula = document.createElement('td');
      // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
      celula.textContent = texto;
      // Atualiza a árvore DOM usando elementos próprios, mantendo dados separados da marcação.
      linha.append(celula);
    }
    // Célula DOM que mantém o conteúdo do paciente separado da marcação da página.
    const celula = document.createElement('td');
    // Controle da ação atual; fica temporariamente desativado para não reenviar durante a espera.
    const botao = document.createElement('button');
    botao.type = 'button';
    // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
    botao.textContent = 'Selecionar para abertura';
    // Liga a ação do usuário a este controle; o restante da regra só roda quando o evento acontece.
    botao.addEventListener('click', () => selecionarPacienteParaAbertura(paciente));
    // Atualiza a árvore DOM usando elementos próprios, mantendo dados separados da marcação.
    celula.append(botao);
    // Atualiza a árvore DOM usando elementos próprios, mantendo dados separados da marcação.
    linha.append(celula);
    // Atualiza a árvore DOM usando elementos próprios, mantendo dados separados da marcação.
    $('#pacientes').append(linha);
  }
}
// Reúne o fluxo de envio para evitar duplicação entre os formulários e controlar o botão durante a espera.
function aoEnviar(id, executar) {
  // Liga a ação do usuário a este controle; o restante da regra só roda quando o evento acontece.
  $(id).addEventListener('submit', async (evento) => {
    // Evita o envio padrão da página para que a rotina JavaScript controle o resultado do formulário.
    evento.preventDefault();
    // Formulário que disparou o evento, usado para ler os campos corretos.
    const form = evento.currentTarget;
    // Controle da ação atual; fica temporariamente desativado para não reenviar durante a espera.
    const botao = form.querySelector('button');
    // Bloqueia outro envio enquanto a operação atual aguarda o backend.
    botao.disabled = true;
    try {
      await executar(Object.fromEntries(new FormData(form)), form);
    } catch (erro) {
      // Apresenta o resultado da ação sem exigir que o usuário consulte o terminal.
      mensagem(erro.message, true);
    } finally {
      // Libera o controle novamente, inclusive quando o pedido terminou com erro.
      botao.disabled = false;
    }
  });
}
// Remove os valores do formulário para não reapresentar dados de uma tentativa anterior.
aoEnviar('#form-login', async (dados) => {
  // Resultado da autenticação: identidade pública, token CSRF e cookie da sessão.
  const entrada = await pedir('/api/login', {
    // Método HTTP que separa leitura e envio de dados.
    method: 'POST',
    dados,
  });
  // Remove os valores do formulário para não reapresentar dados de uma tentativa anterior.
  $('#form-login').reset();
  // Atualiza a apresentação com o resultado que o backend autorizou para esta sessão.
  await mostrarSessao(entrada);
  // Apresenta o resultado da ação sem exigir que o usuário consulte o terminal.
  mensagem('Entrada realizada.');
});
// Liga a ação do usuário a este controle; o restante da regra só roda quando o evento acontece.
$('#form-paciente').addEventListener('input', () => {
  // Uma tentativa editada ou concluída recebe outra chave; uma repetição sem edição mantém a anterior.
  chaveCadastro = crypto.randomUUID();
});
// Remove os valores do formulário para não reapresentar dados de uma tentativa anterior.
aoEnviar('#form-paciente', async (dados, form) => {
  const cpf = String(dados.documento || '').replace(/\D/g, '');
  if (cpf.length !== 11) {
    throw new Error('Informe um CPF válido com 11 números.');
  }
  if (!window.pi2Api.validarCpf(cpf)) {
    throw new Error('Informe um CPF válido.');
  }
  // Resultado da operação ou da conferência; o chamador decide a resposta a partir dele.
  const resultado = await pedir('/api/pacientes', {
    // Método HTTP que separa leitura e envio de dados.
    method: 'POST',
    dados: {
      ...dados,
      documento: cpf,
      // Identifica a tentativa e não o paciente; uma edição posterior recebe outra chave.
      chave_cadastro: chaveCadastro,
    },
  });
  // Reutiliza a apresentação dos pacientes para o cadastro e para a busca.
  listar([resultado.paciente]);
  // Remove os valores do formulário para não reapresentar dados de uma tentativa anterior.
  form.reset();
  // Uma tentativa editada ou concluída recebe outra chave; uma repetição sem edição mantém a anterior.
  chaveCadastro = crypto.randomUUID();
  // Apresenta o resultado da ação sem exigir que o usuário consulte o terminal.
  mensagem(
    `Paciente ${resultado.paciente.id} ${resultado.criado ? 'cadastrado' : 'já cadastrado nesta tentativa'}.`,
  );
});
// Apresenta o resultado da ação sem exigir que o usuário consulte o terminal.
aoEnviar('#form-busca', async (dados) => {
  // Resultado da operação ou da conferência; o chamador decide a resposta a partir dele.
  const resultado = await pedir(`/api/pacientes?busca=${encodeURIComponent(dados.busca)}`);
  // Reutiliza a apresentação dos pacientes para o cadastro e para a busca.
  listar(resultado.pacientes);
  // Apresenta o resultado da ação sem exigir que o usuário consulte o terminal.
  mensagem(resultado.mensagem);
});
$('#form-abertura-atendimento')
  .querySelectorAll('[name="declaracao_prioridade"]')
  .forEach((opcao) => {
    opcao.addEventListener('change', atualizarFormularioPrioridade);
  });
$('#doador-sangue').addEventListener('change', atualizarFormularioPrioridade);
$('#cancelar-abertura-atendimento').addEventListener('click', () => {
  pacienteAberturaSelecionado = null;
  $('#form-abertura-atendimento').reset();
  $('#abrir-atendimento-card').hidden = true;
});
$('#form-abertura-atendimento').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const form = evento.currentTarget;
  const botao = form.querySelector('button[type="submit"]');

  if (!pacienteAberturaSelecionado) {
    mensagem('Selecione um paciente antes de abrir o atendimento.', true);
    return;
  }

  const formulario = new FormData(form);
  const declaracao = formulario.get('declaracao_prioridade');
  const categorias = formulario.getAll('categorias_prioridade');
  const faixaEtaria = obterFaixaEtaria(pacienteAberturaSelecionado.data_nascimento);

  if (declaracao === 'sim' && categorias.length === 0 && !faixaEtaria) {
    mensagem('Selecione ao menos uma categoria de prioridade declarada.', true);
    return;
  }
  if (!chavesAbertura.has(pacienteAberturaSelecionado.id)) {
    chavesAbertura.set(pacienteAberturaSelecionado.id, crypto.randomUUID());
  }

  botao.disabled = true;
  try {
    const prioridadeLegal = {
      declaracao,
      categorias:
        declaracao === 'sim' ? [...categorias, ...(faixaEtaria ? [faixaEtaria.valor] : [])] : [],
      data_doacao_sangue:
        declaracao === 'sim' && $('#doador-sangue').checked
          ? formulario.get('data_doacao_sangue')
          : null,
    };
    const resultado = await pedir('/api/atendimentos', {
      method: 'POST',
      dados: {
        paciente_id: pacienteAberturaSelecionado.id,
        chave_abertura: chavesAbertura.get(pacienteAberturaSelecionado.id),
        prioridade_legal: prioridadeLegal,
      },
    });
    chavesAbertura.delete(pacienteAberturaSelecionado.id);
    mensagem(
      `Atendimento ${resultado.atendimento.id} aberto para ${pacienteAberturaSelecionado.nome}. Situação: aguardando triagem. Prioridade legal registrada.`,
    );
    pacienteAberturaSelecionado = null;
    form.reset();
    $('#abrir-atendimento-card').hidden = true;
  } catch (erro) {
    mensagem(erro.message, true);
  } finally {
    botao.disabled = false;
  }
});
aoEnviar('#form-triagem', async (dados, form) => {
  if (!atendimentoTriagemSelecionado) {
    throw new Error('Selecione um atendimento aguardando triagem.');
  }
  const resultado = await pedir('/api/triagens', {
    method: 'POST',
    dados: {
      atendimento_id: atendimentoTriagemSelecionado,
      queixa: dados.queixa,
      pressao: dados.pressao,
      temperatura: Number(dados.temperatura),
      frequencia: Number(dados.frequencia),
      saturacao: Number(dados.saturacao),
      classificacao: dados.classificacao,
    },
  });
  form.reset();
  $('#formulario-triagem-card').hidden = true;
  atendimentoTriagemSelecionado = null;
  mostrarResultadoTriagem(resultado.triagem);
  const confirmacao = `Triagem do atendimento #${resultado.atendimento_id} registrada. A classificação já está disponível na fila médica.`;
  mensagem(confirmacao);
  try {
    await carregarAtendimentosAguardandoTriagem();
  } catch (erro) {
    mensagem(`${confirmacao} Não foi possível atualizar a lista de triagem: ${erro.message}`, true);
  }
});
aoEnviar('#form-consulta', async (dados, form) => {
  if (!atendimentoConsultaSelecionado) {
    throw new Error('Selecione um atendimento disponível para consulta.');
  }
  const resultado = await pedir('/api/consultas', {
    method: 'POST',
    dados: {
      atendimento_id: atendimentoConsultaSelecionado.atendimento_id,
      paciente_id: atendimentoConsultaSelecionado.paciente_id,
      triagem_id: atendimentoConsultaSelecionado.triagem_id,
      registro_consulta: dados.registro_consulta,
    },
  });
  form.reset();
  const confirmacao = `Consulta #${resultado.consulta_id} do atendimento #${resultado.atendimento_id} registrada.`;
  $('#resultado-consulta').textContent =
    `${confirmacao} Você pode registrar outra consulta para este atendimento.`;
  mensagem(resultado.mensagem);
  try {
    await carregarResumoMedico(atendimentoConsultaSelecionado.atendimento_id);
    await carregarFilaMedica();
  } catch (erro) {
    mensagem(`${confirmacao} Não foi possível atualizar as filas: ${erro.message}`, true);
  }
});
aoEnviar('#form-medicacao-medico', async (dados, form) => {
  if (!atendimentoConsultaSelecionado) {
    throw new Error('Selecione um atendimento em andamento antes de registrar medicação.');
  }
  const resultado = await pedir('/api/medicacoes', {
    method: 'POST',
    dados: {
      atendimento_id: atendimentoConsultaSelecionado.atendimento_id,
      medicacao: dados.medicacao,
      dose: dados.dose,
      via: dados.via,
      observacoes: dados.observacoes,
    },
  });
  form.reset();
  $('#resultado-medicacao-medico').textContent = resultado.mensagem;
  await carregarResumoMedico(atendimentoConsultaSelecionado.atendimento_id);
});
$('#encerrar-atendimento').addEventListener('click', () => {
  $('#dialogo-encerrar-atendimento').showModal();
});
$('#cancelar-encerrar-atendimento').addEventListener('click', () => {
  $('#dialogo-encerrar-atendimento').close();
});
$('#confirmar-encerrar-atendimento').addEventListener('click', async (evento) => {
  if (!atendimentoConsultaSelecionado) {
    mensagem('Selecione um atendimento antes de encerrar.', true);
    return;
  }
  const botao = evento.currentTarget;
  botao.disabled = true;
  $('#dialogo-encerrar-atendimento').close();
  try {
    const resultado = await pedir('/api/atendimentos/finalizar', {
      method: 'POST',
      dados: { atendimento_id: atendimentoConsultaSelecionado.atendimento_id },
    });
    $('#resultado-consulta').textContent = resultado.mensagem;
    await carregarResumoMedico(atendimentoConsultaSelecionado.atendimento_id);
    await carregarFilaMedica();
  } catch (erro) {
    mensagem(erro.message, true);
  } finally {
    botao.disabled = false;
  }
});
$('#atualizar-triagens').addEventListener('click', () => {
  carregarAtendimentosAguardandoTriagem().catch((erro) => mensagem(erro.message, true));
});
$('#cancelar-triagem').addEventListener('click', () => {
  $('#form-triagem').reset();
  $('#formulario-triagem-card').hidden = true;
  atendimentoTriagemSelecionado = null;
  limparResultadoTriagem();
});
$('#atualizar-fila-medica').addEventListener('click', () => {
  carregarFilaMedica().catch((erro) => mensagem(erro.message, true));
});
$('#cancelar-consulta').addEventListener('click', limparConsulta);
// Liga a ação do usuário a este controle; o restante da regra só roda quando o evento acontece.
$('#sair').addEventListener('click', async () => {
  try {
    await pedir('/api/logout', {
      // Método HTTP que separa leitura e envio de dados.
      method: 'POST',
      dados: {},
    });
    mostrarSaida();
    // Apresenta o resultado da ação sem exigir que o usuário consulte o terminal.
    mensagem('Você saiu do sistema.');
  } catch (erro) {
    // Apresenta o resultado da ação sem exigir que o usuário consulte o terminal.
    mensagem(erro.message, true);
  }
});
// Atualiza a apresentação com o resultado que o backend autorizou para esta sessão.
pedir('/api/sessao')
  .then(mostrarSessao)
  .catch((erro) => {
    if (erro.status !== 401) {
      // Apresenta o resultado da ação sem exigir que o usuário consulte o terminal.
      mensagem(erro.message, true);
    }
  });
