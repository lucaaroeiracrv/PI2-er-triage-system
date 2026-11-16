// src\triagens\cadastro.js
import { ErroHttp } from '../http/respostas.js';
import { consultar, erroDeUnicidade, iniciarTransacao, oracledb } from '../config/banco.js';

// Confere os campos recebidos da tela antes de permitir qualquer gravação.
export function validarTriagem(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroHttp(400, 'Informe os dados da triagem.');
  }

  if (!Number.isSafeInteger(dados.atendimento_id) || dados.atendimento_id <= 0) {
    throw new ErroHttp(400, 'Escolha um atendimento válido.');
  }

  if (typeof dados.queixa !== 'string') {
    throw new ErroHttp(400, 'Informe a queixa principal.');
  }
  const queixa = dados.queixa.trim();
  if (queixa.length < 3 || queixa.length > 500) {
    throw new ErroHttp(400, 'A queixa deve ter entre 3 e 500 caracteres.');
  }

  if (typeof dados.pressao !== 'string') {
    throw new ErroHttp(400, 'Informe a pressão arterial.');
  }
  const pressao = dados.pressao.trim();
  if (!pressao || pressao.length > 20) {
    throw new ErroHttp(400, 'Informe uma pressão arterial com até 20 caracteres.');
  }

  const temperatura = Number(dados.temperatura);

  if (
    !Number.isFinite(temperatura) ||
    temperatura < 30 ||
    temperatura > 45 ||
    Math.round(temperatura * 10) / 10 !== temperatura
  ) {
    throw new ErroHttp(400, 'Informe uma temperatura válida.');
  }

  const frequencia = Number(dados.frequencia);

  if (!Number.isInteger(frequencia) || frequencia < 20 || frequencia > 300) {
    throw new ErroHttp(400, 'Informe uma frequência cardíaca válida.');
  }

  const saturacao = Number(dados.saturacao);

  if (!Number.isInteger(saturacao) || saturacao < 0 || saturacao > 100) {
    throw new ErroHttp(400, 'Informe uma saturação válida.');
  }

  const classificacoes = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'];

  if (!classificacoes.includes(dados.classificacao)) {
    throw new ErroHttp(400, 'Classificação de risco inválida.');
  }

  return {
    atendimento_id: dados.atendimento_id,
    queixa,
    pressao,
    temperatura,
    frequencia,
    saturacao,
    classificacao: dados.classificacao,
  };
}

// Registra a avaliação e a classificação informada pela enfermagem sem calculá-la.
export async function cadastrarTriagem(banco, usuario, dados) {
  const triagem = validarTriagem(dados);
  const conexao = await banco.getConnection();

  try {
    await iniciarTransacao(conexao);
    const resultadoAtendimento = await conexao.execute(
      `SELECT id AS "id",
              situacao AS "situacao"
         FROM atendimentos
        WHERE id = :id
        FOR UPDATE`,
      { id: triagem.atendimento_id },
      { outFormat: oracledb?.OUT_FORMAT_OBJECT },
    );
    const atendimento = resultadoAtendimento.rows?.[0];

    if (!atendimento) {
      throw new ErroHttp(404, 'Atendimento não encontrado.');
    }
    if (atendimento.situacao !== 'aguardando_triagem') {
      throw new ErroHttp(409, 'Este atendimento não está aguardando triagem.');
    }

    await conexao.execute(
      `INSERT INTO triagens
        (
          atendimento_id,
          enfermeiro_id,
          queixa,
          pressao,
          temperatura,
          frequencia,
          saturacao,
          classificacao
        )
        VALUES
        (
          :atendimento_id,
          :enfermeiro_id,
          :queixa,
          :pressao,
          :temperatura,
          :frequencia,
          :saturacao,
          :classificacao
        )`,
      {
        atendimento_id: triagem.atendimento_id,
        enfermeiro_id: usuario.id,
        queixa: triagem.queixa,
        pressao: triagem.pressao,
        temperatura: triagem.temperatura,
        frequencia: triagem.frequencia,
        saturacao: triagem.saturacao,
        classificacao: triagem.classificacao,
      },
    );

    await conexao.execute(
      `UPDATE atendimentos
          SET situacao = 'aguardando_medico'
        WHERE id = :id`,
      { id: triagem.atendimento_id },
    );
    await conexao.commit();

    return {
      sucesso: true,
      mensagem: 'Triagem registrada com sucesso.',
      atendimento_id: triagem.atendimento_id,
    };
  } catch (erro) {
    await conexao.rollback();
    if (erroDeUnicidade(erro)) {
      throw new ErroHttp(409, 'Este atendimento já possui uma triagem registrada.');
    }
    throw erro;
  } finally {
    await conexao.close();
  }
}

export async function listarAtendimentosAguardandoTriagem(banco) {
  return consultar(
    banco,
    `SELECT a.id AS "atendimento_id",
            p.nome AS "paciente_nome",
            a.aberto_em AS "aberto_em"
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
      WHERE a.situacao = 'aguardando_triagem'
      ORDER BY a.aberto_em, a.id`,
  );
}

export async function listarAtendimentosAguardandoMedico(banco) {
  return consultar(
    banco,
    `SELECT a.id AS "atendimento_id",
            p.nome AS "paciente_nome",
            t.classificacao AS "classificacao",
            t.criado_em AS "data_hora",
            u.nome AS "profissional_responsavel",
            t.queixa AS "queixa",
            t.pressao AS "pressao",
            t.temperatura AS "temperatura",
            t.frequencia AS "frequencia",
            t.saturacao AS "saturacao"
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       JOIN triagens t ON t.atendimento_id = a.id
       JOIN usuarios u ON u.id = t.enfermeiro_id
      WHERE a.situacao = 'aguardando_medico'
      ORDER BY t.criado_em, a.id`,
  );
}
