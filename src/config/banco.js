import oracledb from 'oracledb';

export function configuracaoBanco() {
  const port = Number(process.env.DB_PORT || 1521);
  const user = process.env.DB_USER || 'PI2_APP';
  const serviceName = process.env.DB_SERVICE_NAME || 'FREEPDB1';
  const host = process.env.DB_HOST || '127.0.0.1';

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT inválida.');
  }
  if (!/^[A-Za-z][A-Za-z0-9_$#]{0,127}$/.test(user)) {
    throw new Error('DB_USER inválido.');
  }
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(serviceName)) {
    throw new Error('DB_SERVICE_NAME inválido.');
  }
  if (!host || /[\s/]/.test(host)) {
    throw new Error('DB_HOST inválido.');
  }

  return {
    user,
    password: process.env.DB_PASSWORD || '',
    connectString: process.env.DB_CONNECT_STRING || `${host}:${port}/${serviceName}`,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
  };
}

export async function criarPool() {
  return oracledb.createPool(configuracaoBanco());
}

export async function consultar(banco, sql, binds = {}) {
  const conexao = await banco.getConnection();
  try {
    const resultado = await conexao.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return resultado.rows || [];
  } finally {
    await conexao.close();
  }
}

export async function executar(banco, sql, binds = {}, options = {}) {
  const conexao = await banco.getConnection();
  try {
    return await conexao.execute(sql, binds, options);
  } finally {
    await conexao.close();
  }
}

export function erroDeUnicidade(erro) {
  return erro.errorNum === 1;
}

export { oracledb };
