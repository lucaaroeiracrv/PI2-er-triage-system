// este é o teste pequeno que funciona antes de existir qualquer tela.
import { criarPool } from '../src/config/banco.js';
// Acesso compartilhado ao MySQL, usado pelas funções que consultam e gravam dados.
const banco = criarPool();
try {
  // Linhas recuperadas no MySQL; o primeiro registro só é usado quando a consulta encontra algo.
  const [linhas] = await banco.execute('SELECT 1 AS conectado');
  // Informa no terminal o resultado da preparação ou o endereço para testar a etapa.
  console.log(
    linhas[0].conectado === 1 ? 'Conexão com o MySQL funcionando.' : 'Resposta inesperada.',
  );
} catch (erro) {
  // Informa a causa no terminal para ajudar a corrigir o ambiente sem expor detalhes na tela.
  console.error('Falha na conexão:', erro.code || erro.message);
  // Informa a causa no terminal para ajudar a corrigir o ambiente sem expor detalhes na tela.
  console.error('Confira os dados do .env e se o MySQL está em execução.');
  // Marca a falha para o terminal e para quem automatizar a execução deste comando.
  process.exitCode = 1;
} finally {
  // Libera o recurso de conexão para não deixá-lo ocupado após a operação.
  await banco.end();
}
