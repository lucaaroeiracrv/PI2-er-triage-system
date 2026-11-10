import mysql from 'mysql2/promise';
import { configuracaoBanco } from '../src/config/banco.js';

process.env.DB_ENGINE = 'mysql';
const config = configuracaoBanco();
const adminUser = process.env.DB_MYSQL_ADMIN_USER || 'root';
const adminPassword = process.env.DB_MYSQL_ADMIN_PASSWORD || process.env.DB_ADMIN_PASSWORD;

if (config.engine !== 'mysql') {
  throw new Error('Este script cria usuários MySQL; defina DB_ENGINE=mysql.');
}
if (!adminPassword) {
  throw new Error('Preencha DB_MYSQL_ADMIN_PASSWORD localmente antes de criar o usuário MySQL.');
}
if (!config.password) {
  throw new Error('Preencha DB_MYSQL_PASSWORD com a senha do usuário da aplicação.');
}

const admin = await mysql.createConnection({
  host: config.host,
  port: config.port,
  user: adminUser,
  password: adminPassword,
  database: 'mysql',
});

try {
  const identificador = (valor) => `\`${String(valor).replace(/`/g, '``')}\``;
  const literalConta = (valor) => `'${String(valor).replace(/'/g, "''")}'`;
  const nomeBase = identificador(config.database);
  await admin.query(`CREATE DATABASE IF NOT EXISTS ${nomeBase}`);

  const hostConta = process.env.DB_MYSQL_ACCOUNT_HOST || '%';
  const [linhas] = await admin.execute('SELECT 1 FROM mysql.user WHERE User = ? AND Host = ?', [
    config.user,
    hostConta,
  ]);
  if (!linhas.length) {
    const conta = `${literalConta(config.user)}@${literalConta(hostConta)}`;
    await admin.query(`CREATE USER ${conta} IDENTIFIED BY ${admin.escape(config.password)}`);
    console.log(`Usuário MySQL ${config.user}@${hostConta} criado.`);
  }
  const conta = `${literalConta(config.user)}@${literalConta(hostConta)}`;
  await admin.query(`GRANT ALL PRIVILEGES ON ${nomeBase}.* TO ${conta}`);
  console.log(`Privilégios do schema ${config.database} concedidos a ${config.user}.`);
} catch (erro) {
  console.error('Falha ao criar o usuário MySQL:', erro.code || erro.message);
  console.error('Confira o host, o usuário administrador e as permissões do MySQL.');
  process.exitCode = 1;
} finally {
  await admin.end();
}
