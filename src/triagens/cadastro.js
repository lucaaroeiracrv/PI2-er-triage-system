// src\triagens\cadastro.js
import { ErroHttp } from '../http/respostas.js';
import { consultar, executar } from '../config/banco.js';

// Confere os campos recebidos da tela antes de permitir qualquer gravação.
export function validarTriagem(dados) {
  if (!Number.isSafeInteger(dados.atendimento_id) || dados.atendimento_id <= 0) {
    throw new ErroHttp(400, 'Escolha um atendimento válido.');
  }

  if (typeof dados.queixa !== 'string' || dados.queixa.trim().length < 3) {
    throw new ErroHttp(400, 'Informe a queixa principal.');
  }

  if (typeof dados.pressao !== 'string' || !dados.pressao.trim()) {
    throw new ErroHttp(400, 'Informe a pressão arterial.');
  }

  const temperatura = Number(dados.temperatura);

  if (!Number.isFinite(temperatura) || temperatura < 30 || temperatura > 45) {
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

  const classificacoes = [
    'Vermelho',
    'Laranja',
    'Amarelo',
    'Verde',
    'Azul',
  ];

  if (!classificacoes.includes(dados.classificacao)) {
    throw new ErroHttp(400, 'Classificação de risco inválida.');
  }

  return {
    atendimento_id: dados.atendimento_id,
    queixa: dados.queixa.trim(),
    pressao: dados.pressao.trim(),
    temperatura,
    frequencia,
    saturacao,
    classificacao: dados.classificacao,
  };
}

// Salva a triagem e relaciona os dados ao atendimento correto.
export async function cadastrarTriagem(banco, usuario, dados) {
  const triagem = validarTriagem(dados);

  const atendimento = await consultar(
    banco,
    `SELECT id AS "id",
            situacao AS "situacao"
       FROM atendimentos
      WHERE id = :id`,
    {
      id: triagem.atendimento_id,
    },
  );

  if (!atendimento.length) {
    throw new ErroHttp(404, 'Atendimento não encontrado.');
  }
    if (atendimento[0].situacao !== 'aguardando_triagem') {
    throw new ErroHttp(
      409,
      'Este atendimento não está aguardando triagem.',
    );
  }

  await executar(
    banco,
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
    {
      autoCommit: true,
    },
  );

  await executar(
    banco,
    `UPDATE atendimentos
        SET situacao = 'aguardando_medico'
      WHERE id = :id`,
    {
      id: triagem.atendimento_id,
    },
    {
      autoCommit: true,
    },
  );

  return {
    sucesso: true,
    mensagem: 'Triagem registrada com sucesso.',
    atendimento_id: triagem.atendimento_id,
  };
}