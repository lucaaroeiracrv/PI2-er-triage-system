// abrir atendimento ligado ao paciente e ao usuário da recepção.
import { ErroHttp } from '../http/respostas.js';
import { erroDeUnicidade, oracledb } from '../config/banco.js';
// Compartilha a regra de cadastro e seu identificador de tentativa com as operações relacionadas.
import { formatoChave } from '../pacientes/cadastro.js';
// Agrupa as conferências e a gravação em uma transação para impedir duas aberturas ativas simultâneas.
export async function abrirAtendimento(banco, usuario, dados) {
  // O identificador do paciente precisa ser inteiro positivo antes de alcançar a consulta parametrizada.
  if (!Number.isSafeInteger(dados.paciente_id) || dados.paciente_id <= 0) {
    throw new ErroHttp(400, 'Escolha um paciente válido.');
  }
  // A abertura usa um UUID de tentativa para reconhecer repetições sem depender do nome do paciente.
  if (typeof dados.chave_abertura !== 'string' || !formatoChave.test(dados.chave_abertura)) {
    throw new ErroHttp(400, 'Chave de abertura inválida.');
  }
  // Identificador normalizado da abertura para reconhecer uma repetição do mesmo pedido.
  const chave = dados.chave_abertura.toLowerCase();
  // A conexão permanece reservada até confirmar ou desfazer a transação Oracle.
  const conexao = await banco.getConnection();
  try {
    // O bloqueio do paciente organiza duas aberturas simultâneas para a mesma pessoa.
    const pacientes = await conexao.execute(
      'SELECT id FROM pacientes WHERE id = :paciente_id FOR UPDATE',
      { paciente_id: dados.paciente_id },
    );
    // Não existe cadastro para vincular; a operação deve parar antes de gravar um atendimento sem paciente.
    if (!pacientes.rows.length) {
      throw new ErroHttp(404, 'Paciente não encontrado.');
    }
    // Procura a mesma chave antes de criar outro atendimento para esta tentativa.
    const repetidos = await conexao.execute(
      `SELECT id AS "id", paciente_id AS "paciente_id",
              recepcionista_id AS "recepcionista_id", situacao AS "situacao"
       FROM atendimentos WHERE chave_abertura = :chave FOR UPDATE`,
      { chave },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    // Só reaproveita um registro depois de conferir que o banco encontrou a tentativa correspondente.
    if (repetidos.rows.length) {
      // Registro encontrado ao repetir uma chave; é comparado com a tentativa antes de ser reaproveitado.
      const existente = repetidos.rows[0];
      // A chave só pode ser reaproveitada pelo mesmo autor e para o mesmo paciente da tentativa anterior.
      if (
        existente.paciente_id !== dados.paciente_id ||
        existente.recepcionista_id !== usuario.id
      ) {
        throw new ErroHttp(409, 'Esta chave de abertura já foi usada em outra tentativa.');
      }
      // Confirma as alterações somente depois de concluir as regras desta tentativa.
      await conexao.commit();
      // Reconhece a repetição como sucesso do registro existente, sem gravar outra cópia.
      return {
        // Permite distinguir uma criação nova de uma repetição reconhecida.
        criado: false,
        // Dados da abertura confirmada, vinculados ao paciente correto.
        atendimento: existente,
      };
    }
    // Atendimentos ativos do paciente; sua existência impede uma segunda abertura ativa.
    const abertos = await conexao.execute(
      "SELECT id FROM atendimentos WHERE paciente_id = :paciente_id AND situacao <> 'finalizado' FOR UPDATE",
      { paciente_id: dados.paciente_id },
    );
    // Um atendimento ativo já ocupa este fluxo; outro só poderá começar depois do encerramento anterior.
    if (abertos.rows.length) {
      throw new ErroHttp(409, 'Este paciente já tem um atendimento em aberto.');
    }
    // Resultado da operação ou da conferência; o chamador decide a resposta a partir dele.
    const resultado = await conexao.execute(
      `INSERT INTO atendimentos (paciente_id, recepcionista_id, situacao, chave_abertura)
       VALUES (:paciente_id, :recepcionista_id, 'aguardando_triagem', :chave)
       RETURNING id INTO :id`,
      {
        paciente_id: dados.paciente_id,
        recepcionista_id: usuario.id,
        chave,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
    );
    // Confirma as alterações somente depois de concluir as regras desta tentativa.
    await conexao.commit();
    // Informa a criação nova e devolve o identificador persistido para a próxima ação na interface.
    return {
      // Permite distinguir uma criação nova de uma repetição reconhecida.
      criado: true,
      // Dados da abertura confirmada, vinculados ao paciente correto.
      atendimento: {
        // Identificador persistido usado para relacionar registros sem depender de nomes.
        id: resultado.outBinds.id[0],
        // Referência ao paciente existente que foi escolhido na recepção.
        paciente_id: dados.paciente_id,
        // Identidade obtida da sessão; o formulário não escolhe o autor da abertura.
        recepcionista_id: usuario.id,
        // Situação inicial do fluxo, antes de qualquer triagem.
        situacao: 'aguardando_triagem',
      },
    };
  } catch (erro) {
    // Desfaz alterações parciais se alguma etapa da abertura não puder ser concluída.
    await conexao.rollback();
    // Trata conflito de unicidade como regra de repetição; outras falhas de banco precisam seguir para o tratamento de erro.
    if (erroDeUnicidade(erro)) {
      throw new ErroHttp(
        409,
        'Esta tentativa de abertura já foi usada. Confira o atendimento antes de repetir.',
      );
    }
    // Mantém a falha original para que o tratamento central registre a causa e encerre a operação.
    throw erro;
  } finally {
    // Libera o recurso de conexão para não deixá-lo ocupado após a operação.
    await conexao.close();
  }
}
