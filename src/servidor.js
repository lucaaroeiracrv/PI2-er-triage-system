// O servidor liga os módulos por responsabilidade, sem diretórios numerados de tarefa.
import { createServer } from 'node:http';
// Resolve caminhos a partir do módulo, mantendo a execução após mover as pastas do projeto.
import { fileURLToPath } from 'node:url';
// Resolve caminhos a partir do módulo, mantendo a execução após mover as pastas do projeto.
import path from 'node:path';
// Reutiliza a configuração do banco para manter scripts e servidor conectados ao mesmo ambiente.
import { criarPool } from './config/banco.js';
// Compartilha erros e respostas HTTP para manter o mesmo tratamento entre os módulos.
import { ErroHttp, responder, lerJson, conferirOrigem } from './http/respostas.js';
// Reutiliza este módulo para manter sua responsabilidade fora do fluxo principal do servidor.
import { servirArquivo } from './http/arquivos.js';
// Concentra a identificação do usuário em um único módulo de sessão.
import { criarAutenticacao } from './auth/autenticacao.js';
// Reutiliza a regra de perfil tanto na rota quanto nas verificações da área.
import { exigirPerfil, informacoesDoPerfil } from './auth/permissoes.js';
// Compartilha a regra de cadastro e seu identificador de tentativa com as operações relacionadas.
import { cadastrarPaciente } from './pacientes/cadastro.js';
// Encaminha a consulta de pacientes ao módulo responsável pela busca parametrizada.
import { buscarPacientes } from './pacientes/busca.js';
// Encaminha a abertura ao módulo que mantém as verificações na mesma transação.
import { abrirAtendimento } from './atendimentos/abertura.js';
// Monta o servidor sem ocupar uma porta durante a importação, permitindo testá-lo isoladamente.
export async function criarServidor(banco) {
  // Reúne as regras de sessão desta instância do servidor.
  const autenticacao = await criarAutenticacao(banco);
  // Envia a resposta deste ramo e encerra o pedido, sem executar as rotas que aparecem depois.
  return createServer(async (req, res) => {
    try {
      // Separa o caminho e os parâmetros sem concatenar dados do navegador em SQL.
      const url = new URL(req.url, 'http://localhost');
      // Caminho utilizado para escolher a operação solicitada ao servidor.
      const rota = url.pathname;
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (!rota.startsWith('/api/')) {
        // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
        if (req.method !== 'GET') {
          throw new ErroHttp(405, 'Método não permitido.');
        }
        // Entrega a instância HTTP sem iniciar uma porta; execução e testes controlam quando escutar.
        return await servirArquivo(res, rota, 'painel.html');
      }
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (!['GET', 'POST'].includes(req.method)) {
        throw new ErroHttp(405, 'Método não permitido.');
      }
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (req.method === 'POST') {
        conferirOrigem(req);
      }
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (req.method === 'GET' && rota === '/api/saude') {
        // Aguarda a operação do banco; consultas de formulário usam valores separados do texto SQL.
        await banco.execute('SELECT 1 AS conectado');
        // Envia a resposta deste ramo e encerra o pedido, sem executar as rotas que aparecem depois.
        return responder(res, 200, {
          mensagem: 'Backend e MySQL funcionando.',
        });
      }
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (req.method === 'POST' && rota === '/api/login') {
        // Resultado da autenticação: identidade pública, token CSRF e cookie da sessão.
        const entrada = await autenticacao.entrar(req, await lerJson(req));
        // Envia a resposta deste ramo e encerra o pedido, sem executar as rotas que aparecem depois.
        return responder(
          res,
          200,
          {
            // Devolve somente a identidade necessária à interface, sem senha ou hash.
            usuario: entrada.usuario,
            // Token adicional exigido em pedidos autenticados que alteram dados.
            csrf: entrada.csrf,
          },
          {
            'Set-Cookie': entrada.cookie,
          },
        );
      }
      // Identidade autenticada e token do pedido, sem pedir que o usuário informe seu próprio nome.
      const sessao = autenticacao.exigirSessao(req);
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (req.method === 'GET' && rota === '/api/sessao') {
        // Envia a resposta deste ramo e encerra o pedido, sem executar as rotas que aparecem depois.
        return responder(res, 200, {
          // Devolve somente a identidade necessária à interface, sem senha ou hash.
          usuario: sessao.usuario,
          // Token adicional exigido em pedidos autenticados que alteram dados.
          csrf: sessao.csrf,
        });
      }
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (req.method === 'POST') {
        autenticacao.conferirCsrf(req, sessao);
      }
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (req.method === 'POST' && rota === '/api/logout') {
        // Envia a resposta deste ramo e encerra o pedido, sem executar as rotas que aparecem depois.
        return responder(
          res,
          200,
          {
            mensagem: 'Sessão encerrada.',
          },
          {
            'Set-Cookie': autenticacao.sair(req),
          },
        );
      }
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (req.method === 'GET' && rota.startsWith('/api/perfis/')) {
        // Envia a resposta deste ramo e encerra o pedido, sem executar as rotas que aparecem depois.
        return responder(res, 200, informacoesDoPerfil(sessao, rota.slice('/api/perfis/'.length)));
      }
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (rota === '/api/pacientes' && req.method === 'POST') {
        exigirPerfil(sessao, ['recepcao']);
        // Resultado da operação ou da conferência; o chamador decide a resposta a partir dele.
        const resultado = await cadastrarPaciente(banco, await lerJson(req));
        // Envia a resposta deste ramo e encerra o pedido, sem executar as rotas que aparecem depois.
        return responder(res, resultado.criado ? 201 : 200, resultado);
      }
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (rota === '/api/pacientes' && req.method === 'GET') {
        exigirPerfil(sessao, ['recepcao']);
        // Envia a resposta deste ramo e encerra o pedido, sem executar as rotas que aparecem depois.
        return responder(res, 200, await buscarPacientes(banco, url.searchParams.get('busca')));
      }
      // Separa esta operação pelas regras de rota e método; somente esse ramo pode produzir sua resposta.
      if (req.method === 'POST' && rota === '/api/atendimentos') {
        exigirPerfil(sessao, ['recepcao']);
        // Resultado da operação ou da conferência; o chamador decide a resposta a partir dele.
        const resultado = await abrirAtendimento(banco, sessao.usuario, await lerJson(req));
        // Envia a resposta deste ramo e encerra o pedido, sem executar as rotas que aparecem depois.
        return responder(res, resultado.criado ? 201 : 200, resultado);
      }
      throw new ErroHttp(404, 'Função não encontrada.');
    } catch (erro) {
      // Depois de iniciar uma resposta, só a encerra para não tentar escrever os cabeçalhos novamente.
      if (res.headersSent) {
        // Entrega a instância HTTP sem iniciar uma porta; execução e testes controlam quando escutar.
        return res.end();
      }
      if (erro instanceof ErroHttp) {
        // Envia a resposta deste ramo e encerra o pedido, sem executar as rotas que aparecem depois.
        return responder(res, erro.status, {
          erro: erro.message,
        });
      }
      // Informa a causa no terminal para ajudar a corrigir o ambiente sem expor detalhes na tela.
      console.error('Erro no servidor:', erro.code || erro.message);
      // Distingue erro de conexão ao banco de outra falha interna, sem expor SQL ao navegador.
      const indisponivel = [
        'ECONNREFUSED',
        'ENOTFOUND',
        'ER_ACCESS_DENIED_ERROR',
        'ER_BAD_DB_ERROR',
      ].includes(erro.code);
      responder(res, indisponivel ? 503 : 500, {
        erro: indisponivel
          ? 'Não foi possível acessar o banco. Confira o terminal e o .env.'
          : 'Não foi possível concluir a operação. Confira o terminal do servidor.',
      });
    }
  });
}

// A comparação permite importar a fábrica nos testes sem iniciar uma porta adicional.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Acesso compartilhado ao MySQL, usado pelas funções que consultam e gravam dados.
  const banco = criarPool();
  // Instância HTTP que só começa a receber pedidos depois de listen.
  const servidor = await criarServidor(banco);
  // Porta HTTP lida do ambiente; não é a mesma porta usada para conectar ao MySQL.
  const porta = Number(process.env.PORT || 3000);
  // Endereço local onde o servidor escuta; o padrão limita a demonstração ao computador atual.
  const host = process.env.HOST || '127.0.0.1';
  // Informa no terminal o resultado da preparação ou o endereço para testar a etapa.
  servidor.listen(porta, host, () =>
    console.log(`PI2 em http://${host}:${porta} | Desenhos em /index.html`),
  );
  // Informa a causa no terminal para ajudar a corrigir o ambiente sem expor detalhes na tela.
  servidor.on('error', async (erro) => {
    // Informa a causa no terminal para ajudar a corrigir o ambiente sem expor detalhes na tela.
    console.error('Não foi possível iniciar:', erro.code || erro.message);
    // Libera o recurso de conexão para não deixá-lo ocupado após a operação.
    await banco.end();
    // Marca a falha para o terminal e para quem automatizar a execução deste comando.
    process.exitCode = 1;
  });
  // Registra o encerramento para os sinais de término, permitindo liberar o pool antes de sair.
  for (const sinal of ['SIGINT', 'SIGTERM']) {
    // Libera o recurso de conexão para não deixá-lo ocupado após a operação.
    process.once(sinal, () =>
      servidor.close(async () => {
        // Libera o recurso de conexão para não deixá-lo ocupado após a operação.
        await banco.end();
      }),
    );
  }
}
