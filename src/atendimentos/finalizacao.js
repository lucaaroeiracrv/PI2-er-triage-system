import { ErroHttp } from '../http/respostas.js';
import { iniciarTransacao, oracledb } from '../config/banco.js';

export async function finalizarAtendimento(banco, dados) {
  if (!dados || !Number.isSafeInteger(dados.atendimento_id) || dados.atendimento_id <= 0) {
    throw new ErroHttp(400, 'Escolha um atendimento válido.');
  }
  const conexao = await banco.getConnection();
  try {
    await iniciarTransacao(conexao);
    const resultado = await conexao.execute(
      `SELECT id AS "id", situacao AS "situacao"
         FROM atendimentos
        WHERE id = :atendimento_id
        FOR UPDATE`,
      { atendimento_id: dados.atendimento_id },
      { outFormat: oracledb?.OUT_FORMAT_OBJECT },
    );
    const atendimento = resultado.rows?.[0];
    if (!atendimento) throw new ErroHttp(404, 'Atendimento não encontrado.');
    if (atendimento.situacao === 'finalizado') {
      await conexao.commit();
      return {
        sucesso: true,
        ja_finalizado: true,
        mensagem: 'Este atendimento já está finalizado.',
        atendimento_id: dados.atendimento_id,
        situacao: 'finalizado',
      };
    }
    if (atendimento.situacao !== 'em_atendimento') {
      throw new ErroHttp(409, 'Este atendimento ainda não está pronto para encerramento.');
    }
    const consulta = await conexao.execute(
      `SELECT id AS "id"
         FROM consultas
        WHERE atendimento_id = :atendimento_id
        FETCH FIRST 1 ROWS ONLY`,
      { atendimento_id: dados.atendimento_id },
      { outFormat: oracledb?.OUT_FORMAT_OBJECT },
    );
    if (!consulta.rows?.length) {
      throw new ErroHttp(
        409,
        'O atendimento precisa ter ao menos uma consulta médica antes do encerramento.',
      );
    }
    await conexao.execute(
      `UPDATE atendimentos
          SET situacao = 'finalizado'
        WHERE id = :atendimento_id
          AND situacao = 'em_atendimento'`,
      { atendimento_id: dados.atendimento_id },
    );
    await conexao.commit();
    return {
      sucesso: true,
      ja_finalizado: false,
      mensagem: 'Atendimento finalizado com sucesso.',
      atendimento_id: dados.atendimento_id,
      situacao: 'finalizado',
    };
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    await conexao.close();
  }
}
