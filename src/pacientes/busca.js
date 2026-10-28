// buscar no MySQL pelo nome ou documento.
import { ErroHttp } from '../http/respostas.js';
// Busca nome ou documento como texto literal e limita o retorno para a tela.
export async function buscarPacientes(banco, termo) {
  if (typeof termo !== 'string' || termo.trim().length < 2 || termo.trim().length > 100) {
    throw new ErroHttp(400, 'Digite de 2 a 100 caracteres para buscar.');
  }
  // LOCATE procura texto literal: % e _ não se tornam filtros especiais.
  const busca = termo.trim();
  // Registros encontrados no banco ou lista recebida para apresentação.
  const [pacientes] = await banco.execute(
    `SELECT id, nome, data_nascimento, documento, telefone FROM pacientes
     WHERE LOCATE(?, nome) > 0 OR LOCATE(?, documento) > 0 ORDER BY nome, id LIMIT 50`,
    [busca, busca],
  );
  // A lista vazia continua sendo um resultado válido e recebe uma mensagem específica para a tela.
  return {
    pacientes,
    mensagem: pacientes.length ? 'Pacientes encontrados.' : 'Nenhum paciente encontrado.',
    limite: 50,
  };
}
