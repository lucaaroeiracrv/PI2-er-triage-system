// Buscar no Oracle pelo nome ou documento.
import { ErroHttp } from '../http/respostas.js';
import { consultar } from '../config/banco.js';
// Busca nome ou documento como texto literal e limita o retorno para a tela.
export async function buscarPacientes(banco, termo) {
  if (typeof termo !== 'string' || termo.trim().length < 2 || termo.trim().length > 100) {
    throw new ErroHttp(400, 'Digite de 2 a 100 caracteres para buscar.');
  }
  // INSTR procura texto literal: % e _ não se tornam filtros especiais.
  const busca = termo.trim();
  const pacientes = await consultar(
    banco,
    `SELECT id AS "id", nome AS "nome",
            TO_CHAR(data_nascimento, 'YYYY-MM-DD') AS "data_nascimento",
            documento AS "documento", telefone AS "telefone"
     FROM pacientes
     WHERE INSTR(UPPER(nome), UPPER(:termo)) > 0
        OR INSTR(UPPER(documento), UPPER(:termo)) > 0
     ORDER BY nome, id FETCH FIRST 50 ROWS ONLY`,
    { termo: busca },
  );
  // A lista vazia continua sendo um resultado válido e recebe uma mensagem específica para a tela.
  return {
    pacientes,
    mensagem: pacientes.length ? 'Pacientes encontrados.' : 'Nenhum paciente encontrado.',
    limite: 50,
  };
}
