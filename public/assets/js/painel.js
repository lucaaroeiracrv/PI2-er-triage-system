// A interface de teste evolui neste arquivo junto com os módulos do backend.
const $ = (seletor) => document.querySelector(seletor);
// Token da sessão mantido na memória da página e enviado nas operações que alteram dados.
let csrf = null;
let intervaloFilaMedica = null;
let atendimentoTriagemSelecionado = null;
let carregandoFilaMedica = false;
// Chave mantida durante a mesma tentativa de envio; uma edição inicia outra tentativa.
let chaveCadastro = crypto.randomUUID();
$('[name="data_nascimento"]').max = new Date().toISOString().slice(0, 10);
// Associa cada paciente a uma tentativa de abertura, inclusive após repetir um clique.
const chavesAbertura = new Map();
const campoCpf = $('[name="documento"]');
window.pi2Api.maskCpfInput(campoCpf);
// Rótulos de apresentação dos perfis que o backend reconhece.
const nomesPerfis = {
  recepcao: 'Recepção',
  enfermagem: 'Enfermagem',
  medico: 'Médico',
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
  //esconde o formulário de triagem.
  atendimentoTriagemSelecionado = null;
  //limpa a seleção do atendimento, para não reutilizá-la por engano.
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
function formatarDataHora(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime())
    ? String(valor || 'Não informado')
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(data);
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
    const resultado = await pedir('/api/atendimentos/medico');
    const corpo = $('#fila-medica');
    corpo.replaceChildren();
    $('#resultado-fila-medica').textContent = resultado.atendimentos.length
      ? `${resultado.atendimentos.length} atendimento(s) aguardando atendimento médico. Atualização automática a cada 2 segundos.`
      : 'Nenhum atendimento aguardando atendimento médico. A fila é atualizada automaticamente a cada 2 segundos.';

    for (const atendimento of resultado.atendimentos) {
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
        criarCelula(atendimento.classificacao),
        criarCelula(formatarDataHora(atendimento.data_hora)),
        criarCelula(atendimento.profissional_responsavel),
        criarCelula(sinaisVitais),
      );
      corpo.append(linha);
    }
  } finally {
    carregandoFilaMedica = false;
  }
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
    botao.textContent = 'Abrir atendimento';
    // Liga a ação do usuário a este controle; o restante da regra só roda quando o evento acontece.
    botao.addEventListener('click', async () => {
      // Bloqueia outro envio enquanto a operação atual aguarda o backend.
      botao.disabled = true;
      // Uma repetição do clique reaproveita a mesma chave em vez de solicitar outro atendimento.
      if (!chavesAbertura.has(paciente.id)) {
        // Guarda a associação desta tentativa no estado atual para reconhecer uma repetição posterior.
        chavesAbertura.set(paciente.id, crypto.randomUUID());
      }
      try {
        // Resultado da operação ou da conferência; o chamador decide a resposta a partir dele.
        const resultado = await pedir('/api/atendimentos', {
          // Método HTTP que separa leitura e envio de dados.
          method: 'POST',
          dados: {
            // Referência ao paciente existente que foi escolhido na recepção.
            paciente_id: paciente.id,
            chave_abertura: chavesAbertura.get(paciente.id),
          },
        });
        // Apresenta o resultado da ação sem exigir que o usuário consulte o terminal.
        mensagem(
          `Atendimento ${resultado.atendimento.id} aberto para ${paciente.nome}. Situação: aguardando triagem.`,
        );
      } catch (erro) {
        // Apresenta o resultado da ação sem exigir que o usuário consulte o terminal.
        mensagem(erro.message, true);
      } finally {
        // Libera o controle novamente, inclusive quando o pedido terminou com erro.
        botao.disabled = false;
      }
    });
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
  const confirmacao = `Triagem do atendimento #${resultado.atendimento_id} registrada. A classificação já está disponível na fila médica.`;
  mensagem(confirmacao);
  try {
    await carregarAtendimentosAguardandoTriagem();
  } catch (erro) {
    mensagem(`${confirmacao} Não foi possível atualizar a lista de triagem: ${erro.message}`, true);
  }
});
$('#atualizar-triagens').addEventListener('click', () => {
  carregarAtendimentosAguardandoTriagem().catch((erro) => mensagem(erro.message, true));
});
$('#cancelar-triagem').addEventListener('click', () => {
  $('#form-triagem').reset();
  $('#formulario-triagem-card').hidden = true;
  atendimentoTriagemSelecionado = null;
});
$('#atualizar-fila-medica').addEventListener('click', () => {
  carregarFilaMedica().catch((erro) => mensagem(erro.message, true));
});
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
