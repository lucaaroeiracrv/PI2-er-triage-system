// Buscar no Oracle pelo nome ou documento.
import { ErroHttp } from '../http/respostas.js';
import { consultar } from '../config/banco.js';
// Busca nome ou documento como texto literal e limita o retorno para a tela.
// Cada paciente traz também o atendimento ativo (qualquer situação diferente de 'finalizado').
export async function buscarPacientes(banco, termo) {
  if (typeof termo !== 'string' || termo.trim().length < 2 || termo.trim().length > 100) {
    throw new ErroHttp(400, 'Digite de 2 a 100 caracteres para buscar.');
  }
  // INSTR procura texto literal: % e _ não se tornam filtros especiais.
  const busca = termo.trim();
  // O LEFT JOIN escolhe no máximo um atendimento ativo por paciente. O índice uq_atendimento_ativo já
  // garante essa unicidade; o MAX(id) mantém uma linha por paciente mesmo se houver dados legados.
  // Atendimentos finalizados ficam fora do join, preservando o histórico sem bloquear nova abertura.
  // A sintaxe é comum a Oracle e MySQL (o adaptador do MySQL converte TO_CHAR e FETCH FIRST).
  const linhas = await consultar(
    banco,
    `SELECT p.id AS "id", p.nome AS "nome",
            TO_CHAR(p.data_nascimento, 'YYYY-MM-DD') AS "data_nascimento",
            p.documento AS "documento", p.telefone AS "telefone",
            a.id AS "atendimento_ativo_id",
            a.situacao AS "atendimento_ativo_situacao"
     FROM pacientes p
     LEFT JOIN atendimentos a
       ON a.id = (
            SELECT MAX(ativo.id)
            FROM atendimentos ativo
            WHERE ativo.paciente_id = p.id
              AND ativo.situacao <> 'finalizado'
          )
     WHERE INSTR(UPPER(p.nome), UPPER(:termo)) > 0
        OR INSTR(UPPER(p.documento), UPPER(:termo)) > 0
     ORDER BY p.nome, p.id FETCH FIRST 50 ROWS ONLY`,
    { termo: busca },
  );
  // Agrupa o atendimento ativo em um objeto próprio; null significa que o paciente pode abrir outro.
  const pacientes = linhas.map(
    ({
      atendimento_ativo_id: atendimentoId,
      atendimento_ativo_situacao: situacao,
      ...paciente
    }) => ({
      ...paciente,
      atendimento_ativo: atendimentoId == null ? null : { id: Number(atendimentoId), situacao },
    }),
  );
  // A lista vazia continua sendo um resultado válido e recebe uma mensagem específica para a tela.
  return {
    pacientes,
    mensagem: pacientes.length ? 'Pacientes encontrados.' : 'Nenhum paciente encontrado.',
    limite: 50,
  };
}
