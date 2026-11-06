// src\config\banco.js
const oracledbPromise = import('oracledb').catch(() => null);
const mysqlPromise = import('mysql2/promise').catch(() => null);

export const oracledb = await oracledbPromise;
export const mysql = await mysqlPromise;

export function motorDoBanco() {
  const engine = String(process.env.DB_ENGINE || 'oracle').trim().toLowerCase();
  if (engine !== 'oracle' && engine !== 'mysql') {
    throw new Error('DB_ENGINE inválida.');
  }
  return engine;
}

function validarPorta(porta) {
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error('DB_PORT inválida.');
  }
}

function validarHost(host) {
  if (!host || /[\s/]/.test(host)) {
    throw new Error('DB_HOST inválido.');
  }
}

export function configuracaoBanco() {
  const engine = motorDoBanco();

  if (engine === 'mysql') {
    const port = Number(process.env.DB_PORT || 3306);
    const host = process.env.DB_HOST || '127.0.0.1';
    const user = process.env.DB_USER || 'PI2_APP';
    const database = process.env.DB_NAME || process.env.DB_DATABASE || 'PI2_APP';

    validarPorta(port);
    validarHost(host);
    if (!/^[A-Za-z][A-Za-z0-9_$#]{0,127}$/.test(user)) {
      throw new Error('DB_USER inválido.');
    }
    if (!database || /[\s/]/.test(database)) {
      throw new Error('DB_NAME inválido.');
    }

    const config = {
      host,
      port,
      user,
      password: process.env.DB_PASSWORD || '',
      database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    };
    Object.defineProperty(config, 'engine', {
      value: engine,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    return config;
  }

  const port = Number(process.env.DB_PORT || 1521);
  const user = process.env.DB_USER || 'PI2_APP';
  const serviceName = process.env.DB_SERVICE_NAME || 'FREEPDB1';
  const host = process.env.DB_HOST || '127.0.0.1';

  validarPorta(port);
  if (!/^[A-Za-z][A-Za-z0-9_$#]{0,127}$/.test(user)) {
    throw new Error('DB_USER inválido.');
  }
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(serviceName)) {
    throw new Error('DB_SERVICE_NAME inválido.');
  }
  validarHost(host);

  const config = {
    user,
    password: process.env.DB_PASSWORD || '',
    connectString: process.env.DB_CONNECT_STRING || `${host}:${port}/${serviceName}`,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
  };
  Object.defineProperty(config, 'engine', {
    value: engine,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return config;
}

export async function criarPool() {
  const engine = motorDoBanco();

  if (engine === 'mysql') {
    const mysqlDriver = mysql?.default ?? mysql;
    if (!mysqlDriver) {
      throw new Error('Dependência mysql2 não instalada para o motor MySQL.');
    }
    return mysqlDriver.createPool(configuracaoBanco());
  }

  const oracleDriver = oracledb?.default ?? oracledb;
  if (!oracleDriver) {
    throw new Error('Dependência oracledb não instalada para o motor Oracle.');
  }
  return oracleDriver.createPool(configuracaoBanco());
}

function sqlComAdaptacaoParaMotor(sql, engine) {
  if (engine !== 'mysql') {
    return sql;
  }
  return sql.replace(/\s+RETURNING\s+.+?\s+INTO\s+:(\w+)\s*$/is, '');
}

function extrairBindDeRetorno(sql) {
  const retorno = sql.match(/\s+RETURNING\s+.+?\s+INTO\s+:(\w+)\s*$/is);
  return retorno ? retorno[1] : null;
}

export async function consultar(banco, sql, binds = {}) {
  const engine = motorDoBanco();
  const conexao = await banco.getConnection();
  try {
    if (engine === 'mysql') {
      const [resultado] = await conexao.execute(sql, binds);
      return Array.isArray(resultado) ? resultado : [];
    }

    const resultado = await conexao.execute(sql, binds, {
      outFormat: oracledb?.default?.OUT_FORMAT_OBJECT ?? oracledb?.OUT_FORMAT_OBJECT,
    });
    return resultado.rows || [];
  } finally {
    await conexao.close();
  }
}

export async function executar(banco, sql, binds = {}, options = {}) {
  const engine = motorDoBanco();
  const conexao = await banco.getConnection();
  try {
    if (engine === 'mysql') {
      const bindRetorno = extrairBindDeRetorno(sql);
      const sqlExecutavel = sqlComAdaptacaoParaMotor(sql, engine);
      const parametros = { ...binds };
      if (bindRetorno) {
        delete parametros[bindRetorno];
      }
      const [resultado] = await conexao.execute(sqlExecutavel, parametros, options);
      if (bindRetorno) {
        return {
          outBinds: {
            [bindRetorno]: [resultado.insertId ?? resultado.lastInsertId ?? null],
          },
          insertId: resultado.insertId ?? resultado.lastInsertId ?? null,
          rows: resultado.rows || [],
          affectedRows: resultado.affectedRows,
        };
      }
      return resultado;
    }

    return await conexao.execute(sql, binds, options);
  } finally {
    await conexao.close();
  }
}

export function erroDeUnicidade(erro) {
  if (!erro) {
    return false;
  }

  const codigo = String(erro.code || erro.errno || erro.errorNum || '');
  const mensagem = String(erro.message || '').toUpperCase();

  return (
    erro.errorNum === 1 ||
    codigo === 'ER_DUP_ENTRY' ||
    codigo === 'ORA-00001' ||
    /ORA-00001|DUPLICATE KEY|DUPLICATE ENTRY/i.test(mensagem)
  );
}
