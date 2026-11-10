import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { criarPool, iniciarTransacao, motorDoBanco, oracledb } from '../src/config/banco.js';

const engineArgumento = process.argv.find((argumento) => argumento.startsWith('--engine='));
if (engineArgumento) {
  process.env.DB_ENGINE = engineArgumento.slice('--engine='.length);
}

const confirmacaoArgumento = process.argv.find((argumento) => argumento.startsWith('--confirm='));
const engine = motorDoBanco();
const nomeMotor = engine === 'mysql' ? 'MySQL' : 'Oracle';
const banco = await criarPool();
let conexao;
let etapa = `conectando ao ${nomeMotor}`;

async function confirmarReset() {
  if (confirmacaoArgumento) {
    return confirmacaoArgumento.slice('--confirm='.length) === 'RESETAR';
  }

  const interfaceLeitura = createInterface({ input: stdin, output: stdout });
  try {
    const resposta = await interfaceLeitura.question(
      `Isso apagará todos os registros de atendimentos, pacientes e usuários de teste no ${nomeMotor}, mantendo o schema. Digite RESETAR para confirmar: `,
    );
    return resposta === 'RESETAR';
  } finally {
    interfaceLeitura.close();
  }
}

try {
  if (!(await confirmarReset())) {
    console.log('Reset cancelado; nenhum registro foi alterado.');
    process.exitCode = 1;
  } else {
    conexao = await banco.getConnection();
    await iniciarTransacao(conexao);

    const contagens = {};
    for (const tabela of ['atendimentos', 'pacientes', 'usuarios']) {
      etapa = `contando registros de ${tabela}`;
      const resultado = await conexao.execute(
        `SELECT COUNT(*) AS total FROM ${tabela}`,
        {},
        engine === 'oracle' ? { outFormat: oracledb.OUT_FORMAT_OBJECT } : {},
      );
      contagens[tabela] = resultado.rows[0].TOTAL ?? resultado.rows[0].total;
      etapa = `apagando registros de ${tabela}`;
      await conexao.execute(`DELETE FROM ${tabela}`);
    }

    etapa = 'confirmando transação';
    await conexao.commit();
    console.log(
      `Reset concluído no ${nomeMotor}: ${contagens.atendimentos} atendimentos, ${contagens.pacientes} pacientes e ${contagens.usuarios} usuários apagados. As tabelas foram mantidas.`,
    );
  }
} catch (erro) {
  if (conexao) {
    try {
      await conexao.rollback();
    } catch (erroRollback) {
      console.error('Falha ao desfazer a transação:', erroRollback.code || erroRollback.message);
    }
  }
  console.error(`Falha no reset ao ${etapa}:`, erro.code || erro.message);
  process.exitCode = 1;
} finally {
  if (conexao) {
    await conexao.close();
  }
  await banco.close();
}
