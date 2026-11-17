import { ErroHttp } from '../http/respostas.js';
import { erroDeUnicidade, iniciarTransacao, motorDoBanco, oracledb } from '../config/banco.js';

export function validarConsulta(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroHttp(400, 'Informe os dados da consulta.');
  }

  for (const campo of ['atendimento_id', 'paciente_id', 'triagem_id']) {
    if (!Number.isSafeInteger(dados[campo]) || dados[campo] <= 0) {
      throw new ErroHttp(400, 'Selecione um atendimento, paciente e triagem válidos.');
    }
  }

  if (typeof dados.registro_consulta !== 'string' || !dados.registro_consulta.trim()) {
    throw new ErroHttp(400, 'Informe o registro da consulta.');
  }

  return {
    atendimento_id: dados.atendimento_id,
    paciente_id: dados.paciente_id,
    triagem_id: dados.triagem_id,
    registro_consulta: dados.registro_consulta.trim(),
  };
}

export async function registrarConsulta(banco, medico, dados) {
  const consulta = validarConsulta(dados);
  const conexao = await banco.getConnection();

  try {
    await iniciarTransacao(conexao);
    const resultadoAtendimento = await conexao.execute(
      `SELECT id AS "id",
              paciente_id AS "paciente_id",
              situacao AS "situacao"
         FROM atendimentos
        WHERE id = :atendimento_id
        FOR UPDATE`,
      { atendimento_id: consulta.atendimento_id },
      { outFormat: oracledb?.OUT_FORMAT_OBJECT },
    );
    const atendimento = resultadoAtendimento.rows?.[0];

    if (!atendimento) {
      throw new ErroHttp(404, 'Atendimento não encontrado.');
    }
    if (atendimento.paciente_id !== consulta.paciente_id) {
      throw new ErroHttp(409, 'O paciente selecionado não pertence a este atendimento.');
    }
    if (!['aguardando_medico', 'em_atendimento'].includes(atendimento.situacao)) {
      throw new ErroHttp(409, 'Este atendimento não está disponível para consulta médica.');
    }

    const resultadoTriagem = await conexao.execute(
      `SELECT id AS "triagem_id"
         FROM triagens
        WHERE atendimento_id = :atendimento_id`,
      { atendimento_id: consulta.atendimento_id },
      { outFormat: oracledb?.OUT_FORMAT_OBJECT },
    );
    if (resultadoTriagem.rows?.[0]?.triagem_id !== consulta.triagem_id) {
      throw new ErroHttp(409, 'A triagem selecionada não pertence a este atendimento.');
    }

    const engine = motorDoBanco();
    const registroConsulta =
      engine === 'oracle'
        ? { val: consulta.registro_consulta, type: oracledb.CLOB }
        : consulta.registro_consulta;
    const resultado = await conexao.execute(
      `INSERT INTO consultas
        (atendimento_id, medico_id, registro_consulta)
       VALUES
        (:atendimento_id, :medico_id, :registro_consulta)
       RETURNING id INTO :id`,
      {
        atendimento_id: consulta.atendimento_id,
        medico_id: medico.id,
        registro_consulta: registroConsulta,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
    );
    if (!resultado.outBinds?.id?.[0]) {
      throw new Error('O banco não retornou o identificador do registro da consulta.');
    }

    if (atendimento.situacao === 'aguardando_medico') {
      await conexao.execute(
        `UPDATE atendimentos
            SET situacao = 'em_atendimento'
          WHERE id = :atendimento_id
            AND situacao = 'aguardando_medico'`,
        { atendimento_id: consulta.atendimento_id },
      );
    }

    await conexao.commit();
    return {
      sucesso: true,
      mensagem: 'Consulta registrada com sucesso.',
      consulta_id: resultado.outBinds.id[0],
      atendimento_id: consulta.atendimento_id,
      situacao: 'em_atendimento',
    };
  } catch (erro) {
    await conexao.rollback();
    if (erroDeUnicidade(erro)) {
      throw new ErroHttp(409, 'Não foi possível registrar esta consulta devido a um conflito.');
    }
    throw erro;
  } finally {
    await conexao.close();
  }
}
