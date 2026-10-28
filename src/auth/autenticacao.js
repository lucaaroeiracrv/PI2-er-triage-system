// autenticação e sessão em memória, suficiente para a demonstração local.
// Ao reiniciar o servidor, os usuários precisam entrar novamente.
import { randomBytes } from 'node:crypto';
// Reutiliza a derivação de senhas em vez de guardar ou comparar a senha em texto no banco.
import { gerarHash, conferirSenha } from './senhas.js';
// Compartilha erros e respostas HTTP para manter o mesmo tratamento entre os módulos.
import { ErroHttp } from '../http/respostas.js';
// Mantém sessões e limites de tentativas por instância do servidor; reiniciar exige novo login.
export async function criarAutenticacao(banco) {
  // Guarda tokens opacos e identidades no servidor, em vez de confiar em dados do navegador.
  const sessoes = new Map();
  // Conta falhas recentes por endereço para limitar repetidas tentativas de entrada.
  const tentativas = new Map();
  // Prazo da sessão em milissegundos, usado também para alinhar a duração do cookie.
  const duracao = 8 * 60 * 60 * 1000;
  // Faz uma comparação de senha mesmo se o login não existir.
  const hashInexistente = await gerarHash(randomBytes(20).toString('hex'));
  // Remove registros expirados para não manter sessões ou bloqueios de tentativa indefinidamente.
  function limpar() {
    // Instante usado para comparar todos os vencimentos desta limpeza.
    const agora = Date.now();
    // Percorre os registros em memória para aplicar a expiração a cada entrada.
    for (const [chave, sessao] of sessoes) {
      // Registros fora do prazo deixam de valer mesmo que o navegador ainda envie um cookie antigo.
      if (sessao.expira <= agora) {
        // Invalida a identidade anterior no servidor; o token antigo deixa de conceder acesso.
        sessoes.delete(chave);
      }
    }
    // Percorre os registros em memória para aplicar a expiração a cada entrada.
    for (const [ip, tentativa] of tentativas) {
      // Registros fora do prazo deixam de valer mesmo que o navegador ainda envie um cookie antigo.
      if (tentativa.expira <= agora) {
        // Um login válido remove a contagem anterior para não manter um bloqueio indevido.
        tentativas.delete(ip);
      }
    }
  }
  // Extrai somente o cookie da sessão e valida seu formato antes de consultar a memória.
  function tokenDoPedido(req) {
    // Parte do cabeçalho que identifica a sessão, sem misturar outros cookies do pedido.
    const cookie = (req.headers.cookie || '')
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith('pi2_sessao='));
    // Identificador aleatório da sessão; não contém o nome nem a senha do usuário.
    const token = cookie?.slice('pi2_sessao='.length);
    // Um formato desconhecido é tratado como ausência de identidade, sem consultar chaves arbitrárias.
    return /^[a-f0-9]{64}$/.test(token || '') ? token : null;
  }
  // Descarta sessões vencidas antes de procurar a sessão deste pedido.
  function sessaoDoPedido(req) {
    limpar();
    // Uma sessão inexistente volta como null e será recusada pela regra de autenticação.
    return sessoes.get(tokenDoPedido(req)) || null;
  }
  // Configura o cookie HttpOnly, inclusive sua remoção ao sair do sistema.
  function cookie(token, encerrado = false) {
    // O cabeçalho limita a leitura por JavaScript e alinha a duração do cookie com a sessão.
    return `pi2_sessao=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${encerrado ? 0 : duracao / 1000}${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`;
  }
  // Confere as credenciais no banco e cria uma identidade de sessão sem devolver o hash da senha.
  async function entrar(req, dados) {
    limpar();
    // Recusa este formato de entrada antes da gravação, evitando aceitar um dado que a interface sozinha não garante.
    if (
      typeof dados.login !== 'string' ||
      typeof dados.senha !== 'string' ||
      dados.login.length > 100 ||
      dados.senha.length > 200 ||
      !dados.senha
    ) {
      throw new ErroHttp(400, 'Informe usuário e senha válidos.');
    }
    // Endereço do pedido utilizado para contar tentativas malsucedidas de login.
    const ip = req.socket.remoteAddress || 'local';
    // Contador e vencimento de bloqueio para este endereço.
    const tentativa = tentativas.get(ip) || {
      quantidade: 0,
      // Momento em que a sessão ou o limite de tentativas deixa de ser válido.
      expira: Date.now() + 15 * 60 * 1000,
    };
    // Impede novas verificações durante o limite de tentativas para reduzir adivinhação repetida de senha.
    if (tentativa.quantidade >= 10) {
      throw new ErroHttp(429, 'Muitas tentativas de entrada. Aguarde alguns minutos.');
    }
    // Linhas recuperadas no MySQL; o primeiro registro só é usado quando a consulta encontra algo.
    const [linhas] = await banco.execute(
      'SELECT id, nome, login, senha_hash, perfil, ativo FROM usuarios WHERE login = ? LIMIT 1',
      [dados.login.trim()],
    );
    // Usuário encontrado na base; somente os campos públicos seguem para o navegador.
    const usuario = linhas[0];
    // Resultado da verificação criptográfica, separado da existência e da ativação do usuário.
    const confere = await conferirSenha(dados.senha, usuario?.senha_hash || hashInexistente);
    // Impede novas verificações durante o limite de tentativas para reduzir adivinhação repetida de senha.
    if (!usuario || !usuario.ativo || !confere) {
      tentativa.quantidade += 1;
      // Guarda a associação desta tentativa no estado atual para reconhecer uma repetição posterior.
      tentativas.set(ip, tentativa);
      throw new ErroHttp(401, 'Usuário ou senha incorretos.');
    }
    // Um login válido remove a contagem anterior para não manter um bloqueio indevido.
    tentativas.delete(ip);
    // Invalida a identidade anterior no servidor; o token antigo deixa de conceder acesso.
    sessoes.delete(tokenDoPedido(req)); // Troca a sessão anterior ao entrar novamente.
    if (sessoes.size >= 1000) {
      // Invalida a identidade anterior no servidor; o token antigo deixa de conceder acesso.
      sessoes.delete(sessoes.keys().next().value);
    }
    // Identificador aleatório da sessão; não contém o nome nem a senha do usuário.
    const token = randomBytes(32).toString('hex');
    // Identidade autenticada e token do pedido, sem pedir que o usuário informe seu próprio nome.
    const sessao = {
      // Devolve somente a identidade necessária à interface, sem senha ou hash.
      usuario: {
        // Identificador persistido usado para relacionar registros sem depender de nomes.
        id: usuario.id,
        // Texto de apresentação; não é usado para conceder permissões.
        nome: usuario.nome,
        // Identificador da conta, conferido contra o banco.
        login: usuario.login,
        // Perfil conhecido pelo backend, utilizado nas regras de acesso.
        perfil: usuario.perfil,
      },
      // Token adicional exigido em pedidos autenticados que alteram dados.
      csrf: randomBytes(32).toString('hex'),
      // Momento em que a sessão ou o limite de tentativas deixa de ser válido.
      expira: Date.now() + duracao,
    };
    // Guarda a associação desta tentativa no estado atual para reconhecer uma repetição posterior.
    sessoes.set(token, sessao);
    // Devolve os campos públicos e os dados da sessão, preservando o hash apenas no servidor.
    return {
      // Devolve somente a identidade necessária à interface, sem senha ou hash.
      usuario: sessao.usuario,
      // Token adicional exigido em pedidos autenticados que alteram dados.
      csrf: sessao.csrf,
      cookie: cookie(token),
    };
  }
  // Interrompe pedidos sem login antes que alcancem operações que usam dados do sistema.
  function exigirSessao(req) {
    // Identidade autenticada e token do pedido, sem pedir que o usuário informe seu próprio nome.
    const sessao = sessaoDoPedido(req);
    // A permissão é conferida antes de continuar, mesmo se alguém ignorar os controles visuais da página.
    if (!sessao) {
      throw new ErroHttp(401, 'Entre no sistema para continuar.');
    }
    // Entrega a identidade somente depois de confirmar que a sessão existe e está no prazo.
    return sessao;
  }
  // Exige o token da sessão nos envios que podem alterar dados, além do cookie de login.
  function conferirCsrf(req, sessao) {
    // A permissão é conferida antes de continuar, mesmo se alguém ignorar os controles visuais da página.
    if (req.headers['x-csrf-token'] !== sessao.csrf) {
      throw new ErroHttp(403, 'Recarregue a página e tente novamente.');
    }
  }
  // Invalida a sessão no servidor; apagar somente o cookie não seria suficiente.
  function sair(req) {
    // Invalida a identidade anterior no servidor; o token antigo deixa de conceder acesso.
    sessoes.delete(tokenDoPedido(req));
    return cookie('', true);
  }
  // Expõe apenas as operações de sessão; os mapas de tokens continuam privados dentro do módulo.
  return {
    entrar,
    exigirSessao,
    conferirCsrf,
    sair,
  };
}
