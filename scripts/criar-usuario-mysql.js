import mysql from 'mysql2/promise';
import { configuracaoBanco } from '../src/config/banco.js';

const config = configuracaoBanco();
const adminUser = process.env.DB_ADMIN_USER || 'root';
const adminPassword = process.env.DB_ADMIN_PASSWORD;

if (config.engine !== 'mysql') {
  throw new Error('Este script cria usuários MySQL; defina DB_ENGINE=mysql.');
}
if (!adminPassword) {
  throw new Error('Preencha DB_ADMIN_PASSWORD localmente antes de criar o usuário MySQL.');
}
if (!config.password) {
  throw new Error('Preencha DB_PASSWORD com a senha do usuário da aplicação.');
}

const admin = await mysql.createConnection({
  host: config.host,
  port: config.port,
  user: adminUser,
  password: adminPassword,
  database: 'mysql',
});

try {
  const [linhas] = await admin.execute('SELECT 1 FROM mysql.user WHERE User = ?', [config.user]);
  if (linhas.length) {
    console.log(`O usuário MySQL ${config.user} já existe; a senha não foi alterada.`);
  } else {
    await admin.execute('CREATE USER ?@? IDENTIFIED BY ?', [config.user, config.host, config.password]);
    console.log(`Usuário MySQL ${config.user} criado.`);
  }
  await admin.execute('GRANT ALL PRIVILEGES ON ??.* TO ?@?', [config.database, config.user, config.host]);
  console.log(`Privilégios do schema ${config.database} concedidos a ${config.user}.`);
} catch (erro) {
  console.error('Falha ao criar o usuário MySQL:', erro.code || erro.message);
  console.error('Confira o host, o usuário administrador e as permissões do MySQL.');
  process.exitCode = 1;
} finally {
  await admin.end();
}
