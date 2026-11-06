import oracledb from 'oracledb';
import { configuracaoBanco } from '../src/config/banco.js';

const config = configuracaoBanco();
const adminUser = process.env.DB_ADMIN_USER || 'SYSTEM';
const adminPassword = process.env.DB_ADMIN_PASSWORD;

if (!/^[A-Za-z][A-Za-z0-9_$#]{0,127}$/.test(adminUser)) {
  throw new Error('DB_ADMIN_USER inválido.');
}
if (!adminPassword) {
  throw new Error('Preencha DB_ADMIN_PASSWORD localmente antes de criar o usuário Oracle.');
}
if (!config.password) {
  throw new Error('Preencha DB_PASSWORD com a senha do usuário da aplicação.');
}

let conexao;
try {
  conexao = await oracledb.getConnection({
    user: adminUser,
    password: adminPassword,
    connectString: config.connectString,
  });
  const existente = await conexao.execute('SELECT username FROM all_users WHERE username = :nome', {
    nome: config.user.toUpperCase(),
  });
  if (existente.rows.length) {
    console.log(`O schema ${config.user} já existe; a senha não foi alterada.`);
  } else {
    const senhaSql = config.password.replace(/"/g, '""');
    await conexao.execute(
      `CREATE USER ${config.user} IDENTIFIED BY "${senhaSql}" DEFAULT TABLESPACE USERS QUOTA 100M ON USERS`,
    );
    console.log(`Usuário Oracle ${config.user} criado.`);
  }
  await conexao.execute(`GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE TO ${config.user}`);
  await conexao.execute(`ALTER USER ${config.user} DEFAULT TABLESPACE USERS QUOTA 100M ON USERS`);
  console.log(`Privilégios de conexão, tabelas e sequences concedidos a ${config.user}.`);
} catch (erro) {
  console.error('Falha ao criar o usuário Oracle:', erro.code || erro.message);
  console.error('Confira o serviço, o usuário administrador e as permissões para CREATE USER.');
  process.exitCode = 1;
} finally {
  if (conexao) {
    await conexao.close();
  }
}
