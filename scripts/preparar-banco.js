import { readFile } from 'node:fs/promises';
import { criarPool, configuracaoBanco, motorDoBanco, oracledb } from '../src/config/banco.js';
import { criarUsuariosDeTeste } from './usuarios-teste.js';

const engineArgumento = process.argv.find((argumento) => argumento.startsWith('--engine='));
if (engineArgumento) {
  process.env.DB_ENGINE = engineArgumento.slice('--engine='.length);
}

const config = configuracaoBanco();
const engine = motorDoBanco();
const driverOracle = oracledb?.default ?? oracledb;
const pool = await criarPool();
let conexao;
let etapa = `conectando ao ${engine === 'mysql' ? 'MySQL' : 'Oracle'}`;

function separarSql(texto) {
  return texto
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((comando) => comando.trim())
    .filter(Boolean);
}

async function criarObjetos(conexao, texto) {
  if (engine === 'mysql') {
    for (const comando of separarSql(texto)) {
      const tabela = comando.match(/^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([A-Z0-9_$#]+)/i);
      const indice = comando.match(/^CREATE\s+(?:UNIQUE\s+)?INDEX\s+([A-Z0-9_$#]+)/i);
      if (indice) {
        const existentes = await conexao.execute(
          `SELECT COUNT(*) AS quantidade
           FROM information_schema.statistics
           WHERE table_schema = DATABASE() AND index_name = ?`,
          [indice[1]],
        );
        if (existentes.rows[0].quantidade > 0) {
          console.log(`Índice MySQL já existe e foi preservado: ${indice[1]}`);
          continue;
        }
      } else if (!tabela) {
        throw new Error('Comando inesperado no arquivo de estrutura MySQL.');
      }
      etapa = `criando objeto MySQL${tabela ? ` ${tabela[1]}` : ` ${indice[1]}`}`;
      await conexao.execute(comando);
    }
    return;
  }

  for (const comando of separarSql(texto)) {
    const objeto = comando.match(/^CREATE\s+(TABLE|(?:UNIQUE\s+)?INDEX)\s+([A-Z0-9_$#]+)/i);
    if (!objeto) {
      throw new Error('Comando inesperado no arquivo de estrutura Oracle.');
    }

    const tipo = objeto[1].toUpperCase().includes('INDEX') ? 'INDEX' : 'TABLE';
    const nome = objeto[2].toUpperCase();
    etapa = `verificando ${tipo} ${nome}`;
    const existentes = await conexao.execute(
      'SELECT object_type FROM user_objects WHERE object_name = :nome',
      { nome },
      { outFormat: driverOracle.OUT_FORMAT_OBJECT },
    );

    if (existentes.rows.length) {
      if (existentes.rows[0].OBJECT_TYPE !== tipo) {
        throw new Error(`O objeto Oracle ${nome} existe com tipo inesperado.`);
      }
      console.log(`Objeto já existe e foi preservado: ${nome}`);
      continue;
    }
    etapa = `criando ${tipo} ${nome}`;
    await conexao.execute(comando);
    console.log(`${tipo} criado: ${nome}`);
  }
}

async function exigirCpfObrigatorio(conexao) {
  if (engine === 'mysql') {
    return;
  }

  const coluna = await conexao.execute(
    `SELECT nullable FROM user_tab_columns
     WHERE table_name = 'PACIENTES' AND column_name = 'DOCUMENTO'`,
    {},
    { outFormat: driverOracle.OUT_FORMAT_OBJECT },
  );
  if (!coluna.rows.length) {
    throw new Error('A coluna PACIENTES.DOCUMENTO não foi encontrada.');
  }
  if (coluna.rows[0].NULLABLE === 'N') {
    return;
  }

  const pendentes = await conexao.execute(
    'SELECT COUNT(*) AS total FROM pacientes WHERE documento IS NULL',
    {},
    { outFormat: driverOracle.OUT_FORMAT_OBJECT },
  );
  if (pendentes.rows[0].TOTAL > 0) {
    throw new Error(
      `${pendentes.rows[0].TOTAL} paciente(s) existente(s) sem CPF. Preencha esses CPFs antes de tornar a coluna obrigatória.`,
    );
  }

  etapa = 'tornando pacientes.documento obrigatório';
  await conexao.execute('ALTER TABLE pacientes MODIFY (documento VARCHAR2(11 CHAR) NOT NULL)');
  console.log('Coluna ajustada para CPF obrigatório: PACIENTES.DOCUMENTO');
}

try {
  conexao = await pool.getConnection();
  const pastaSql = engine === 'mysql' ? 'mysql' : 'oracle';
  const estrutura = await readFile(
    new URL(`../database/${pastaSql}/estrutura.sql`, import.meta.url),
    'utf8',
  );
  const dados = await readFile(
    new URL(`../database/${pastaSql}/dados-teste.sql`, import.meta.url),
    'utf8',
  );
  const cargaGenerica = await readFile(
    new URL(`../database/${pastaSql}/carga-generica.sql`, import.meta.url),
    'utf8',
  );

  await criarObjetos(conexao, estrutura);
  etapa = 'verificando CPFs dos pacientes existentes';
  await exigirCpfObrigatorio(conexao);
  for (const [arquivo, texto] of [
    ['dados-teste.sql', dados],
    ['carga-generica.sql', cargaGenerica],
  ]) {
    for (const [indice, comando] of separarSql(texto).entries()) {
      etapa = `executando ${arquivo}, comando ${indice + 1}`;
      await conexao.execute(comando);
    }
  }
  etapa = 'criando usuários de teste';
  await criarUsuariosDeTeste(conexao);
  etapa = 'confirmando transação';
  if (engine === 'oracle') {
    await conexao.commit();
  }
  console.log(
    `Schema ${engine === 'mysql' ? 'MySQL' : 'Oracle'} preparado; registros existentes não foram apagados.`,
  );
  console.log('Usuários de teste disponíveis: recepcao, enfermagem e medico.');
} catch (erro) {
  if (conexao && engine === 'oracle') {
    try {
      await conexao.rollback();
    } catch (erroRollback) {
      console.error('Falha ao desfazer a transação:', erroRollback.code || erroRollback.message);
    }
  }
  console.error(`Falha na preparação ao ${etapa}:`, erro.code || erro.message);
  if (erro.message && erro.message !== erro.code) {
    console.error(erro.message);
  }
  console.error(
    `Confira o .env, as permissões do usuário ${engine === 'mysql' ? 'MySQL' : 'Oracle'} e se o serviço está ativo.`,
  );
  process.exitCode = 1;
} finally {
  if (conexao) {
    await conexao.close();
  }
  await pool.close();
}
