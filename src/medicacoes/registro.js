import { ErroHttp } from '../http/respostas.js';
import { consultar, iniciarTransacao, oracledb, motorDoBanco } from '../config/banco.js';

export function validarMedicacao(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroHttp(400, 'Informe os dados da medicação.');
  }
  if (!Number.isSafeInteger(dados.atendimento_id) || dados.atendimento_id <= 0) {
    throw new ErroHttp(400, 'Escolha um atendimento válido.');
  }

  const campos = [
    ['medicacao', 120, 'medicação'],
    ['dose', 80, 'dose'],
    ['via', 40, 'via'],
  ];
  const normalizados = { atendimento_id: dados.atendimento_id };
  for (const [campo, limite, rotulo] of campos) {
    if (typeof dados[campo] !== 'string') {
      throw new ErroHttp(400, `Informe ${rotulo === 'medicação' ? 'a' : 'a'} ${rotulo}.`);
    }
    const valor = dados[campo].trim();
    if (!valor || valor.length > limite) {
      throw new ErroHttp(400, `O campo ${rotulo} deve ter entre 1 e ${limite} caracteres.`);
    }
    normalizados[campo] = valor;
  }
  if (dados.observacoes != null && typeof dados.observacoes !== 'string') {
    throw new ErroHttp(400, 'Observações inválidas.');
  }
  const observacoes = String(dados.observacoes || '').trim();
  if (observacoes.length > 500) {
    throw new ErroHttp(400, 'Observações deve ter até 500 caracteres.');
  }
  normalizados.observacoes = observacoes;
  return normalizados;
}

export async function listarMedicacoes(banco, atendimentoId) {
  if (!Number.isSafeInteger(atendimentoId) || atendimentoId <= 0) {
    throw new ErroHttp(400, 'Escolha um atendimento válido.');
  }
  const atendimento = await consultar(
    banco,
    `SELECT id AS "id", situacao AS "situacao"
       FROM atendimentos
      WHERE id = :atendimento_id`,
    { atendimento_id: atendimentoId },
  );
  if (!atendimento.length) {
    throw new ErroHttp(404, 'Atendimento não encontrado.');
  }
  if (
    atendimento[0].situacao === 'aguardando_triagem' ||
    atendimento[0].situacao === 'aguardando_medico'
  ) {
    throw new ErroHttp(409, 'Este atendimento ainda não iniciou a consulta médica.');
  }

  const medicacoes = await consultar(
    banco,
    `SELECT m.id AS "id",
            m.atendimento_id AS "atendimento_id",
            m.medicacao AS "medicacao",
            m.dose AS "dose",
            m.via AS "via",
            m.observacoes AS "observacoes",
            m.criado_em AS "criado_em",
            u.nome AS "profissional_nome"
       FROM medicacoes m
       JOIN usuarios u ON u.id = m.profissional_id
      WHERE m.atendimento_id = :atendimento_id
      ORDER BY m.criado_em, m.id`,
    { atendimento_id: atendimentoId },
  );
  return medicacoes;
}

export async function registrarMedicacao(banco, profissional, dados) {
  const medicacao = validarMedicacao(dados);
  const conexao = await banco.getConnection();
  try {
    await iniciarTransacao(conexao);
    const resultado = await conexao.execute(
      `SELECT id AS "id", situacao AS "situacao"
         FROM atendimentos
        WHERE id = :atendimento_id
        FOR UPDATE`,
      { atendimento_id: medicacao.atendimento_id },
      { outFormat: oracledb?.OUT_FORMAT_OBJECT },
    );
    const atendimento = resultado.rows?.[0];
    if (!atendimento) throw new ErroHttp(404, 'Atendimento não encontrado.');
    if (atendimento.situacao !== 'em_atendimento') {
      throw new ErroHttp(409, 'Este atendimento não admite registro de medicações.');
    }

    const observacoes =
      motorDoBanco() === 'oracle'
        ? { val: medicacao.observacoes, type: oracledb.CLOB }
        : medicacao.observacoes;
    const gravacao = await conexao.execute(
      `INSERT INTO medicacoes
        (atendimento_id, profissional_id, medicacao, dose, via, observacoes)
       VALUES
        (:atendimento_id, :profissional_id, :medicacao, :dose, :via, :observacoes)
       RETURNING id INTO :id`,
      {
        ...medicacao,
        observacoes,
        profissional_id: profissional.id,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
    );
    if (!gravacao.outBinds?.id?.[0]) {
      throw new Error('O banco não retornou o identificador da medicação.');
    }
    await conexao.commit();
    return {
      sucesso: true,
      mensagem: 'Medicação registrada com sucesso.',
      medicacao: {
        id: gravacao.outBinds.id[0],
        atendimento_id: medicacao.atendimento_id,
        medicacao: medicacao.medicacao,
        dose: medicacao.dose,
        via: medicacao.via,
        observacoes: medicacao.observacoes,
      },
    };
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    await conexao.close();
  }
}
