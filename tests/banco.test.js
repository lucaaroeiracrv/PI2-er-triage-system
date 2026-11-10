import test from 'node:test';
import assert from 'node:assert/strict';
import { configuracaoBanco, erroDeUnicidade, oracledb } from '../src/config/banco.js';

const variaveisBanco = [
  'DB_HOST',
  'DB_PORT',
  'DB_ENGINE',
  'DB_MYSQL_HOST',
  'DB_MYSQL_PORT',
  'DB_MYSQL_USER',
  'DB_MYSQL_PASSWORD',
  'DB_NAME',
  'DB_DATABASE',
  'DB_SERVICE_NAME',
  'DB_CONNECT_STRING',
  'DB_USER',
  'DB_PASSWORD',
];

function comVariaveisLimpas(callback) {
  const anteriores = Object.fromEntries(variaveisBanco.map((chave) => [chave, process.env[chave]]));
  for (const chave of variaveisBanco) {
    delete process.env[chave];
  }
  try {
    return callback();
  } finally {
    for (const chave of variaveisBanco) {
      if (anteriores[chave] === undefined) {
        delete process.env[chave];
      } else {
        process.env[chave] = anteriores[chave];
      }
    }
  }
}

test('configuração Oracle usa o serviço local padrão', () => {
  comVariaveisLimpas(() => {
    assert.deepEqual(configuracaoBanco(), {
      user: 'PI2_APP',
      password: '',
      connectString: '127.0.0.1:1521/FREEPDB1',
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
    });
  });
});

test('configuração Oracle aceita connect string e rejeita identificadores inválidos', () => {
  comVariaveisLimpas(() => {
    process.env.DB_CONNECT_STRING = 'db.example:1521/PI2PDB';
    process.env.DB_USER = 'PI2_APP';
    assert.equal(configuracaoBanco().connectString, 'db.example:1521/PI2PDB');

    process.env.DB_PORT = '70000';
    assert.throws(() => configuracaoBanco(), /DB_PORT inválida/);
    delete process.env.DB_PORT;

    process.env.DB_USER = 'PI2 APP';
    assert.throws(() => configuracaoBanco(), /DB_USER inválido/);
  });
});

test('configuração MySQL usa conexão e credenciais próprias', () => {
  comVariaveisLimpas(() => {
    process.env.DB_ENGINE = 'mysql';
    process.env.DB_MYSQL_PORT = '3307';
    process.env.DB_MYSQL_PASSWORD = 'senha-mysql';
    process.env.DB_NAME = 'PI2_TESTE';

    assert.deepEqual(configuracaoBanco(), {
      host: '127.0.0.1',
      port: 3307,
      user: 'PI2_APP',
      password: 'senha-mysql',
      database: 'PI2_TESTE',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  });
});

test('rejeita motor de banco desconhecido', () => {
  comVariaveisLimpas(() => {
    process.env.DB_ENGINE = 'sqlite';
    assert.throws(() => configuracaoBanco(), /DB_ENGINE inválida/);
  });
});

test('identifica violação de unicidade Oracle sem classificar outros erros', () => {
  assert.equal(erroDeUnicidade({ errorNum: 1 }), true);
  assert.equal(erroDeUnicidade({ errorNum: 942 }), false);
});

test('expõe as constantes do driver Oracle para os binds e formatos de consulta', () => {
  assert.ok(oracledb.NUMBER);
  assert.equal(typeof oracledb.BIND_OUT, 'number');
  assert.equal(typeof oracledb.OUT_FORMAT_OBJECT, 'number');
});
