// src\atendimentos\abertura.js
import { ErroHttp } from '../http/respostas.js';
import { erroDeUnicidade, iniciarTransacao, oracledb } from '../config/banco.js';
// Compartilha a regra de cadastro e seu identificador de tentativa com as operações relacionadas.
import { formatoChave } from '../pacientes/cadastro.js';

const CATEGORIAS_PRIORIDADE = new Set([
  'pessoa_com_deficiencia',
  'pessoa_com_tea',
  'idoso_60_79',
  'gestante',
  'lactante',
  'pessoa_com_crianca_de_colo',
  'pessoa_obesa',
  'pessoa_com_mobilidade_reduzida',
  'idoso_80_mais',
  'doador_sangue',
]);
const CATEGORIAS_ETARIAS = new Set(['idoso_60_79', 'idoso_80_mais']);
const DECLARACOES_PRIORIDADE = new Set(['sim', 'nao', 'nao_informado']);

function dataIsoValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function dataLocalIso(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function subtrairDias(dataIso, dias) {
  const data = new Date(`${dataIso}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() - dias);
  return data.toISOString().slice(0, 10);
}

function obterCategoriaEtaria(dataNascimento, hojeIso) {
  if (!dataIsoValida(dataNascimento)) {
    throw new Error('A data de nascimento do paciente é inválida no banco.');
  }
  const [anoNascimento, mesNascimento, diaNascimento] = dataNascimento.split('-').map(Number);
  const [anoAtual, mesAtual, diaAtual] = hojeIso.split('-').map(Number);
  let idade = anoAtual - anoNascimento;
  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
    idade -= 1;
  }
  if (idade >= 80) return 'idoso_80_mais';
  if (idade >= 60) return 'idoso_60_79';
  return null;
}

export function validarPrioridadeLegal(dados, dataNascimento, hoje = new Date()) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroHttp(400, 'Informe a declaração de prioridade legal.');
  }
  if (!DECLARACOES_PRIORIDADE.has(dados.declaracao)) {
    throw new ErroHttp(400, 'Selecione Sim, Não ou Não sabe/não informou para prioridade legal.');
  }
  if (
    !Array.isArray(dados.categorias) ||
    dados.categorias.some((categoria) => !CATEGORIAS_PRIORIDADE.has(categoria))
  ) {
    throw new ErroHttp(400, 'As categorias de prioridade legal informadas são inválidas.');
  }

  const categoriasEnviadas = [...new Set(dados.categorias)];
  const dataDoacaoInformada = dados.data_doacao_sangue;
  if (dados.declaracao !== 'sim') {
    if (categoriasEnviadas.length || (dataDoacaoInformada != null && dataDoacaoInformada !== '')) {
      throw new ErroHttp(
        400,
        'Categorias e data de doação só podem ser informadas quando a resposta for Sim.',
      );
    }
    return {
      declaracao: dados.declaracao,
      categorias: [],
      data_doacao_sangue: null,
    };
  }

  const categorias = new Set(
    categoriasEnviadas.filter((categoria) => !CATEGORIAS_ETARIAS.has(categoria)),
  );
  const hojeIso = dataLocalIso(hoje);
  const categoriaEtaria = obterCategoriaEtaria(dataNascimento, hojeIso);
  if (categoriaEtaria) categorias.add(categoriaEtaria);
  if (!categorias.size) {
    throw new ErroHttp(400, 'Selecione ao menos uma categoria de prioridade declarada.');
  }

  let dataDoacaoSangue = null;
  if (categorias.has('doador_sangue')) {
    if (!dataIsoValida(dataDoacaoInformada)) {
      throw new ErroHttp(400, 'Informe uma data válida para a doação de sangue.');
    }
    if (dataDoacaoInformada < subtrairDias(hojeIso, 120) || dataDoacaoInformada > hojeIso) {
      throw new ErroHttp(400, 'A doação de sangue deve ter ocorrido nos últimos 120 dias.');
    }
    dataDoacaoSangue = dataDoacaoInformada;
  } else if (dataDoacaoInformada != null && dataDoacaoInformada !== '') {
    throw new ErroHttp(
      400,
      'A data da doação só pode ser informada para a categoria doador de sangue.',
    );
  }

  return {
    declaracao: dados.declaracao,
    categorias: [...categorias],
    data_doacao_sangue: dataDoacaoSangue,
  };
}

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
    await iniciarTransacao(conexao);
    // O bloqueio do paciente organiza duas aberturas simultâneas para a mesma pessoa.
    const pacientes = await conexao.execute(
      `SELECT id AS "id",
              TO_CHAR(data_nascimento, 'YYYY-MM-DD') AS "data_nascimento"
         FROM pacientes
        WHERE id = :paciente_id
        FOR UPDATE`,
      { paciente_id: dados.paciente_id },
      { outFormat: oracledb?.OUT_FORMAT_OBJECT },
    );
    // Não existe cadastro para vincular; a operação deve parar antes de gravar um atendimento sem paciente.
    if (!pacientes.rows.length) {
      throw new ErroHttp(404, 'Paciente não encontrado.');
    }
    const prioridadeLegal = validarPrioridadeLegal(
      dados.prioridade_legal,
      pacientes.rows[0].data_nascimento,
    );
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
    const prioridade = await conexao.execute(
      `INSERT INTO prioridades_legais
        (atendimento_id, declaracao, data_doacao_sangue, registrado_por)
       VALUES
        (:atendimento_id, :declaracao, TO_DATE(:data_doacao_sangue, 'YYYY-MM-DD'), :registrado_por)
       RETURNING id INTO :id`,
      {
        atendimento_id: resultado.outBinds.id[0],
        declaracao: prioridadeLegal.declaracao,
        data_doacao_sangue: prioridadeLegal.data_doacao_sangue,
        registrado_por: usuario.id,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
    );
    for (const categoria of prioridadeLegal.categorias) {
      await conexao.execute(
        `INSERT INTO categorias_prioridade_legal (prioridade_id, categoria)
         VALUES (:prioridade_id, :categoria)`,
        {
          prioridade_id: prioridade.outBinds.id[0],
          categoria,
        },
      );
    }
    await conexao.execute(
      `INSERT INTO historico_prioridades_legais
        (prioridade_id, declaracao, categorias_json, data_doacao_sangue, registrado_por)
       VALUES
        (:prioridade_id, :declaracao, :categorias_json,
         TO_DATE(:data_doacao_sangue, 'YYYY-MM-DD'), :registrado_por)`,
      {
        prioridade_id: prioridade.outBinds.id[0],
        declaracao: prioridadeLegal.declaracao,
        categorias_json: JSON.stringify(prioridadeLegal.categorias),
        data_doacao_sangue: prioridadeLegal.data_doacao_sangue,
        registrado_por: usuario.id,
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
      prioridade_legal: {
        ...prioridadeLegal,
        registrado_por: usuario.id,
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
