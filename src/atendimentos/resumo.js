import { ErroHttp } from '../http/respostas.js';
import { consultar } from '../config/banco.js';

export async function obterResumoAtendimento(banco, atendimentoId) {
  if (!Number.isSafeInteger(atendimentoId) || atendimentoId <= 0) {
    throw new ErroHttp(400, 'Escolha um atendimento válido.');
  }
  const identificacoes = await consultar(
    banco,
    `SELECT a.id AS "atendimento_id",
            a.paciente_id AS "paciente_id",
            p.nome AS "paciente_nome",
            a.situacao AS "situacao"
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
      WHERE a.id = :atendimento_id`,
    { atendimento_id: atendimentoId },
  );
  if (!identificacoes.length) throw new ErroHttp(404, 'Atendimento não encontrado.');

  const [triagens, consultas, medicacoes] = await Promise.all([
    consultar(
      banco,
      `SELECT t.id AS "triagem_id", t.queixa AS "queixa", t.pressao AS "pressao",
              t.temperatura AS "temperatura", t.frequencia AS "frequencia",
              t.saturacao AS "saturacao", t.classificacao AS "classificacao",
              t.criado_em AS "criado_em", u.nome AS "profissional_responsavel"
         FROM triagens t JOIN usuarios u ON u.id = t.enfermeiro_id
        WHERE t.atendimento_id = :atendimento_id`,
      { atendimento_id: atendimentoId },
    ),
    consultar(
      banco,
      `SELECT c.id AS "consulta_id", c.registro_consulta AS "registro_consulta",
              c.criado_em AS "criado_em", u.nome AS "medico_nome"
         FROM consultas c JOIN usuarios u ON u.id = c.medico_id
        WHERE c.atendimento_id = :atendimento_id
        ORDER BY c.criado_em, c.id`,
      { atendimento_id: atendimentoId },
    ),
    consultar(
      banco,
      `SELECT m.id AS "medicacao_id", m.medicacao AS "medicacao",
              m.dose AS "dose", m.via AS "via", m.observacoes AS "observacoes",
              m.criado_em AS "criado_em", u.nome AS "profissional_nome"
         FROM medicacoes m JOIN usuarios u ON u.id = m.profissional_id
        WHERE m.atendimento_id = :atendimento_id
        ORDER BY m.criado_em, m.id`,
      { atendimento_id: atendimentoId },
    ),
  ]);

  return {
    ...identificacoes[0],
    triagem: triagens[0] || null,
    consultas,
    medicacoes,
  };
}
