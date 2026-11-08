import { consultar, criarPool, motorDoBanco } from '../src/config/banco.js';

const engineArgumento = process.argv.find((argumento) => argumento.startsWith('--engine='));
if (engineArgumento) {
  process.env.DB_ENGINE = engineArgumento.slice('--engine='.length);
}

const banco = await criarPool();
const engine = motorDoBanco();
const sqlTeste = engine === 'mysql' ? 'SELECT 1 AS conectado' : 'SELECT 1 AS conectado FROM dual';

try {
  const linhas = await consultar(banco, sqlTeste);
  const valor = linhas[0]?.conectado ?? linhas[0]?.CONECTADO ?? linhas[0]?.['1'] ?? 1;

  if (valor !== 1 && valor !== '1') {
    throw new Error(
      `O ${engine === 'mysql' ? 'MySQL' : 'Oracle'} retornou um resultado inesperado.`,
    );
  }

  console.log(`Conexão com o ${engine === 'mysql' ? 'MySQL' : 'Oracle'} funcionando.`);
} catch (erro) {
  console.error('Falha na conexão:', erro.code || erro.message);
  console.error(
    `Confira o .env e se o serviço ${engine === 'mysql' ? 'MySQL' : 'Oracle'} está em execução.`,
  );
  process.exitCode = 1;
} finally {
  await banco.close();
}
