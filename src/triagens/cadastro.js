// src\triagens\cadastro.js
import { ErroHttp } from '../http/respostas.js';
import { consultar, erroDeUnicidade, iniciarTransacao, oracledb } from '../config/banco.js';

const CAMPOS_TRIAGEM_ATENDIMENTO = `a.id AS "atendimento_id",
            a.paciente_id AS "paciente_id",
            p.nome AS "paciente_nome",
            t.id AS "triagem_id",
            t.classificacao AS "classificacao",
            t.criado_em AS "data_hora",
            u.nome AS "profissional_responsavel",
            t.queixa AS "queixa",
            t.pressao AS "pressao",
            t.temperatura AS "temperatura",
            t.frequencia AS "frequencia",
            t.saturacao AS "saturacao"`;
const TABELAS_TRIAGEM_ATENDIMENTO = `FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       JOIN triagens t ON t.atendimento_id = a.id
       JOIN usuarios u ON u.id = t.enfermeiro_id`;
const CONSULTA_TRIAGEM_ATENDIMENTO = `SELECT ${CAMPOS_TRIAGEM_ATENDIMENTO}
       ${TABELAS_TRIAGEM_ATENDIMENTO}`;
const CAMPOS_PRIORIDADE_FILA = `CASE WHEN EXISTS (
              SELECT 1
                FROM prioridades_legais pl
                JOIN categorias_prioridade_legal c ON c.prioridade_id = pl.id
               WHERE pl.atendimento_id = a.id
                 AND pl.declaracao = 'sim'
                 AND c.categoria IN (
                   'pessoa_com_deficiencia',
                   'pessoa_com_tea',
                   'idoso_60_79',
                   'gestante',
                   'lactante',
                   'pessoa_com_crianca_de_colo',
                   'pessoa_obesa',
                   'pessoa_com_mobilidade_reduzida'
                 )
            ) THEN 1 ELSE 0 END AS "_prioridade_grupo_a",
            CASE WHEN EXISTS (
              SELECT 1
                FROM prioridades_legais pl
                JOIN categorias_prioridade_legal c ON c.prioridade_id = pl.id
               WHERE pl.atendimento_id = a.id
                 AND pl.declaracao = 'sim'
                 AND c.categoria = 'idoso_80_mais'
            ) THEN 1 ELSE 0 END AS "_prioridade_80_mais",
            CASE WHEN EXISTS (
              SELECT 1
                FROM prioridades_legais pl
                JOIN categorias_prioridade_legal c ON c.prioridade_id = pl.id
               WHERE pl.atendimento_id = a.id
                 AND pl.declaracao = 'sim'
                 AND c.categoria = 'idoso_60_79'
            ) THEN 1 ELSE 0 END AS "_prioridade_60_79",
            CASE WHEN EXISTS (
              SELECT 1
                FROM prioridades_legais pl
                JOIN categorias_prioridade_legal c ON c.prioridade_id = pl.id
               WHERE pl.atendimento_id = a.id
                 AND pl.declaracao = 'sim'
                 AND c.categoria = 'doador_sangue'
            ) THEN 1 ELSE 0 END AS "_prioridade_doador"`;
const CONSULTA_FILA_MEDICA = `SELECT ${CAMPOS_TRIAGEM_ATENDIMENTO},
            ${CAMPOS_PRIORIDADE_FILA}
       ${TABELAS_TRIAGEM_ATENDIMENTO}`;
const CLASSIFICACOES_FILA_MEDICA = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'];
const ORDENACAO_FILA_MEDICA = `CASE t.classificacao
        WHEN 'Vermelho' THEN 1
        WHEN 'Laranja' THEN 2
        WHEN 'Amarelo' THEN 3
        WHEN 'Verde' THEN 4
        WHEN 'Azul' THEN 5
        ELSE 6
      END, t.criado_em, a.id`;

function valorAtivo(valor) {
  return valor === true || Number(valor) === 1;
}

function compararChegada(a, b) {
  const horarioA = new Date(a.data_hora).getTime();
  const horarioB = new Date(b.data_hora).getTime();
  const comparacaoHorario =
    Number.isFinite(horarioA) && Number.isFinite(horarioB)
      ? horarioA - horarioB
      : String(a.data_hora).localeCompare(String(b.data_hora));
  if (comparacaoHorario !== 0) return comparacaoHorario;

  const comparacaoId = Number(a.atendimento_id) - Number(b.atendimento_id);
  return Number.isFinite(comparacaoId) && comparacaoId !== 0
    ? comparacaoId
    : String(a.atendimento_id).localeCompare(String(b.atendimento_id));
}

function temPrecedencia(a, b) {
  const a80Mais = valorAtivo(a._prioridade_80_mais);
  const b80Mais = valorAtivo(b._prioridade_80_mais);
  const a60a79 = valorAtivo(a._prioridade_60_79);
  const b60a79 = valorAtivo(b._prioridade_60_79);

  if (a80Mais && b60a79) return true;
  if (b80Mais && a60a79) return false;

  const aBeneficiario = valorAtivo(a._prioridade_grupo_a) || a80Mais || a60a79;
  const bBeneficiario = valorAtivo(b._prioridade_grupo_a) || b80Mais || b60a79;
  const aDoador = valorAtivo(a._prioridade_doador) && !aBeneficiario;
  const bDoador = valorAtivo(b._prioridade_doador) && !bBeneficiario;
  const aSemPrioridade = !aBeneficiario && !aDoador;
  const bSemPrioridade = !bBeneficiario && !bDoador;

  return (
    (aBeneficiario && bDoador) || (aBeneficiario && bSemPrioridade) || (aDoador && bSemPrioridade)
  );
}

function ordenarPorPrioridadeLegal(atendimentos) {
  const precedencias = atendimentos.map(() => []);
  const grausEntrada = atendimentos.map(() => 0);

  for (let i = 0; i < atendimentos.length; i += 1) {
    for (let j = i + 1; j < atendimentos.length; j += 1) {
      if (temPrecedencia(atendimentos[i], atendimentos[j])) {
        precedencias[i].push(j);
        grausEntrada[j] += 1;
      } else if (temPrecedencia(atendimentos[j], atendimentos[i])) {
        precedencias[j].push(i);
        grausEntrada[i] += 1;
      }
    }
  }

  const prontos = [];
  for (let i = 0; i < atendimentos.length; i += 1) {
    if (grausEntrada[i] === 0) prontos.push(i);
  }

  const ordenados = [];
  while (prontos.length > 0) {
    prontos.sort((a, b) => compararChegada(atendimentos[a], atendimentos[b]));
    const atual = prontos.shift();
    ordenados.push(atendimentos[atual]);

    for (const proximo of precedencias[atual]) {
      grausEntrada[proximo] -= 1;
      if (grausEntrada[proximo] === 0) prontos.push(proximo);
    }
  }

  if (ordenados.length !== atendimentos.length) {
    throw new Error('As precedências da fila médica formaram um ciclo.');
  }
  return ordenados;
}

function ordenarFilaMedica(atendimentos) {
  const grupos = new Map(CLASSIFICACOES_FILA_MEDICA.map((cor) => [cor, []]));
  const outrasClassificacoes = [];

  for (const atendimento of atendimentos) {
    const grupo = grupos.get(atendimento.classificacao);
    if (grupo) {
      grupo.push(atendimento);
    } else {
      outrasClassificacoes.push(atendimento);
    }
  }

  const ordenados = [];
  for (const classificacao of CLASSIFICACOES_FILA_MEDICA) {
    const grupo = grupos.get(classificacao);
    const ordem =
      classificacao === 'Vermelho' || classificacao === 'Laranja'
        ? grupo.sort(compararChegada)
        : ordenarPorPrioridadeLegal(grupo);
    ordenados.push(...ordem);
  }
  ordenados.push(...outrasClassificacoes.sort(compararChegada));

  return ordenados.map(
    ({
      _prioridade_grupo_a,
      _prioridade_80_mais,
      _prioridade_60_79,
      _prioridade_doador,
      ...atendimento
    }) => atendimento,
  );
}

async function consultarFilaMedica(banco, sql) {
  const atendimentos = await consultar(banco, sql);
  return ordenarFilaMedica(atendimentos);
}
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
  if (!/^\d{2,3}\/\d{2,3}$/.test(pressao) || pressao.length > 20) {
    throw new ErroHttp(400, 'Informe a pressão no formato sistólica/diastólica, como 120/80.');
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
    const resultadoTriagem = await conexao.execute(
      `${CONSULTA_TRIAGEM_ATENDIMENTO}
        WHERE a.id = :atendimento_id`,
      { atendimento_id: triagem.atendimento_id },
      { outFormat: oracledb?.OUT_FORMAT_OBJECT },
    );
    const triagemSalva = resultadoTriagem.rows?.[0];
    if (!triagemSalva) {
      throw new Error('A triagem registrada não foi encontrada para confirmação.');
    }

    await conexao.commit();

    return {
      sucesso: true,
      mensagem: 'Triagem registrada com sucesso.',
      atendimento_id: triagem.atendimento_id,
      triagem: triagemSalva,
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
  return consultarFilaMedica(
    banco,
    `${CONSULTA_FILA_MEDICA}
      WHERE a.situacao = 'aguardando_medico'
      ORDER BY ${ORDENACAO_FILA_MEDICA}`,
  );
}

export async function listarAtendimentosEmAndamento(banco) {
  return consultarFilaMedica(
    banco,
    `${CONSULTA_FILA_MEDICA}
      WHERE a.situacao = 'em_atendimento'
        AND EXISTS (
          SELECT 1 FROM consultas c WHERE c.atendimento_id = a.id
        )
      ORDER BY ${ORDENACAO_FILA_MEDICA}`,
  );
}
