// toda a configuração do MySQL fica em um lugar só.
// As credenciais são lidas do .env pelo Node, e não ficam escritas no código.
import mysql from 'mysql2/promise';
// Reúne as opções do .env e valida nome e porta antes de entregar a configuração ao MySQL.
export function configuracaoBanco() {
  // Nome do banco escolhido no .env; será validado antes de compor um identificador SQL.
  const database = process.env.DB_NAME || 'pi2_academico';
  // Aceita apenas identificadores simples: o nome do banco compõe o SQL de criação e não deve carregar outros comandos.
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(database)) {
    throw new Error('DB_NAME deve usar somente letras, números e _.');
  }
  // Converte a porta do MySQL para número antes de conferir seu intervalo.
  const port = Number(process.env.DB_PORT || 3306);
  // Uma porta fora de 1 a 65535 indica configuração inválida; falha cedo em vez de tentar uma conexão impossível.
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT inválida.');
  }
  // Entrega todas as opções já conferidas para que pool e scripts usem os mesmos valores.
  return {
    // Host do serviço ao qual a conexão será feita.
    host: process.env.DB_HOST || '127.0.0.1',
    // Porta do serviço validada pela configuração.
    port,
    // Conta do MySQL; é diferente dos usuários que entram no sistema.
    user: process.env.DB_USER || 'root',
    // Senha da conexão lida do ambiente, sem valor real versionado.
    password: process.env.DB_PASSWORD || '',
    // Banco isolado escolhido para esta demonstração.
    database,
    // UTF-8 completo permite guardar acentos e outros caracteres do cadastro.
    charset: 'utf8mb4',
    // UTC alinha o tratamento de horários entre o Node e o banco.
    timezone: 'Z',
    // Datas voltam como texto ISO para evitar conversões inesperadas de fuso.
    dateStrings: true,
    // Limita as conexões simultâneas desta demonstração.
    connectionLimit: 5,
    // Permite aguardar uma conexão livre em vez de abrir conexões sem limite.
    waitForConnections: true,
  };
}
// Reaproveita conexões para que cada operação não precise abrir uma conexão nova.
export function criarPool() {
  // O pool reaproveita conexões. Os módulos usam execute(sql, valores).
  return mysql.createPool(configuracaoBanco());
}
