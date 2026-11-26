// src\atendimentos\exclusao.js
import { ErroHttp } from '../http/respostas.js';
import { iniciarTransacao, oracledb } from '../config/banco.js';

const TABELAS_REGISTROS_CLINICOS = ['triagens', 'consultas', 'medicacoes'];

export async function excluirAtendimento(banco, usuario, dados) {
  if (usuario?.perfil !== 'recepcao') {
    throw new ErroHttp(403, 'Somente a recepção pode excluir atendimentos.');
  }
  if (!dados || !Number.isSafeInteger(dados.atendimento_id) || dados.atendimento_id <= 0) {
    throw new ErroHttp(400, 'Informe um número de atendimento válido.');
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
    if (!atendimento) {
      throw new ErroHttp(404, 'Atendimento não encontrado.');
    }
    if (atendimento.situacao !== 'aguardando_triagem') {
      throw new ErroHttp(
        409,
        'Somente atendimentos que ainda aguardam triagem podem ser excluídos.',
      );
    }

    for (const tabela of TABELAS_REGISTROS_CLINICOS) {
      const registros = await conexao.execute(
        `SELECT id AS "id"
           FROM ${tabela}
          WHERE atendimento_id = :atendimento_id
          FETCH FIRST 1 ROWS ONLY`,
        { atendimento_id: dados.atendimento_id },
        { outFormat: oracledb?.OUT_FORMAT_OBJECT },
      );
      if (registros.rows?.length) {
        throw new ErroHttp(
          409,
          'O atendimento não pode ser excluído porque já possui registros clínicos.',
        );
      }
    }

    await conexao.execute(
      `DELETE FROM categorias_prioridade_legal
        WHERE prioridade_id IN (
          SELECT id FROM prioridades_legais WHERE atendimento_id = :atendimento_id
        )`,
      { atendimento_id: dados.atendimento_id },
    );
    await conexao.execute(
      `DELETE FROM historico_prioridades_legais
        WHERE prioridade_id IN (
          SELECT id FROM prioridades_legais WHERE atendimento_id = :atendimento_id
        )`,
      { atendimento_id: dados.atendimento_id },
    );
    await conexao.execute('DELETE FROM prioridades_legais WHERE atendimento_id = :atendimento_id', {
      atendimento_id: dados.atendimento_id,
    });
    await conexao.execute(
      `DELETE FROM atendimentos
        WHERE id = :atendimento_id
          AND situacao = 'aguardando_triagem'`,
      { atendimento_id: dados.atendimento_id },
    );
    await conexao.commit();
    return {
      sucesso: true,
      atendimento_id: dados.atendimento_id,
      mensagem: `Atendimento #${dados.atendimento_id} excluído.`,
    };
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    await conexao.close();
  }
}
