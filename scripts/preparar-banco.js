// Cria o banco de exemplo, carrega a tarefa 14 e cria os usuários da tarefa 21.
// Execute na raiz: npm run preparar. Precisa de um MySQL iniciado e configurado no .env.
import mysql from 'mysql2/promise';
// Acessa arquivos com operações assíncronas para não bloquear o servidor durante a leitura.
import { readFile } from 'node:fs/promises';
// Reutiliza a configuração do banco para manter scripts e servidor conectados ao mesmo ambiente.
import { configuracaoBanco } from '../src/config/banco.js';
// Reutiliza este módulo para manter sua responsabilidade fora do fluxo principal do servidor.
import { criarUsuariosDeTeste } from './usuarios-teste.js';
// Configuração centralizada para os comandos não repetirem credenciais no código.
const config = configuracaoBanco();
// Conexão reservada para esta operação; precisa ser encerrada ou devolvida ao pool.
let conexao;
try {
  // multipleStatements só existe neste comando de preparação, que lê SQL local conhecido.
  // O servidor que recebe formulários mantém essa opção desligada.
  conexao = await mysql.createConnection({
    ...config,
    // Banco isolado escolhido para esta demonstração.
    database: undefined,
    multipleStatements: true,
  });
  // Aguarda a operação do banco; consultas de formulário usam valores separados do texto SQL.
  await conexao.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await conexao.changeUser({
    // Banco isolado escolhido para esta demonstração.
    database: config.database,
  });
  // Executa cada arquivo SQL previsto na ordem de dependência das tabelas e dos dados.
  for (// Conteúdo de um arquivo local ou nome de script SQL previsto para a preparação.
  const arquivo of ['../database/estrutura.sql', '../database/dados-teste.sql']) {
    // Aguarda a operação do banco; consultas de formulário usam valores separados do texto SQL.
    await conexao.query(await readFile(new URL(arquivo, import.meta.url), 'utf8'));
  }
  await criarUsuariosDeTeste(conexao);
  // Informa no terminal o resultado da preparação ou o endereço para testar a etapa.
  console.log('Banco preparado:', config.database);
  // Informa no terminal o resultado da preparação ou o endereço para testar a etapa.
  console.log('Usuários de teste: recepcao, enfermagem e medico. Senha inicial: Pi2@2026!');
  // Informa no terminal o resultado da preparação ou o endereço para testar a etapa.
  console.log('Registros existentes não são apagados. A senha acima vale para usuários novos.');
} catch (erro) {
  // Informa a causa no terminal para ajudar a corrigir o ambiente sem expor detalhes na tela.
  console.error('Falha na preparação:', erro.code || erro.message);
  // Informa a causa no terminal para ajudar a corrigir o ambiente sem expor detalhes na tela.
  console.error('Confira o .env, se o MySQL está iniciado e se o usuário pode criar o banco.');
  // Marca a falha para o terminal e para quem automatizar a execução deste comando.
  process.exitCode = 1;
} finally {
  if (conexao) {
    // Libera o recurso de conexão para não deixá-lo ocupado após a operação.
    await conexao.end();
  }
}
