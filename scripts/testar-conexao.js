import { consultar, criarPool } from '../src/config/banco.js';
const banco = await criarPool();
try {
  const linhas = await consultar(banco, 'SELECT 1 AS conectado FROM dual');
  if (linhas[0]?.CONECTADO !== 1) {
    throw new Error('O Oracle retornou um resultado inesperado.');
  }
  console.log('Conexão com o Oracle funcionando.');
} catch (erro) {
  console.error('Falha na conexão:', erro.code || erro.message);
  console.error('Confira o .env e se o serviço Oracle está em execução.');
  // Marca a falha para o terminal e para quem automatizar a execução deste comando.
  process.exitCode = 1;
} finally {
  await banco.close();
}
