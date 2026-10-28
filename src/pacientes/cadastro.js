// validar e salvar um paciente. Todos os valores vão em parâmetros SQL.
import { ErroHttp } from '../http/respostas.js';
// Expressão de UUID v4 para identificar uma tentativa sem depender do conteúdo do formulário.
export const formatoChave =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Confere tipos, limites e datas antes de permitir qualquer gravação no banco.
export function validarPaciente(dados) {
  // O nome precisa ser texto e caber no campo VARCHAR(120); espaços nas pontas não contam como nome.
  if (
    typeof dados.nome !== 'string' ||
    dados.nome.trim().length < 2 ||
    dados.nome.trim().length > 120
  ) {
    throw new ErroHttp(400, 'O nome deve ter entre 2 e 120 caracteres.');
  }
  // Data recebida em formato ISO, antes da validação do calendário e do limite da proposta.
  const nascimento = dados.data_nascimento;
  // Exige a representação AAAA-MM-DD antes de tentar interpretar uma data recebida do formulário.
  if (typeof nascimento !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) {
    throw new ErroHttp(400, 'Informe uma data de nascimento válida.');
  }
  // Objeto de data usado para identificar datas que o JavaScript normalizaria, como 30 de fevereiro.
  const data = new Date(`${nascimento}T00:00:00.000Z`);
  // Data atual em ISO para impedir um nascimento futuro na proposta do cadastro.
  const hoje = new Date().toISOString().slice(0, 10);
  // A comparação com a data original identifica calendários inválidos que Date normalizaria automaticamente.
  if (
    Number.isNaN(data.getTime()) ||
    data.toISOString().slice(0, 10) !== nascimento ||
    nascimento < '1900-01-01' ||
    nascimento > hoje
  ) {
    throw new ErroHttp(400, 'A data de nascimento deve existir e não pode estar no futuro.');
  }
  // Documento é opcional, mas quando enviado precisa ser texto para aceitar a normalização com segurança.
  if (dados.documento != null && typeof dados.documento !== 'string') {
    throw new ErroHttp(400, 'Documento inválido.');
  }
  // Identificador opcional normalizado; vazio vira NULL para não conflitar com outros cadastros sem documento.
  const documento = dados.documento?.trim().toUpperCase() || null;
  // Limita o identificador ao formato da proposta e ao tamanho aceito pela coluna do banco.
  if (documento && !/^[A-Z0-9.\/-]{3,40}$/.test(documento)) {
    throw new ErroHttp(
      400,
      'O documento deve ter de 3 a 40 caracteres: letras, números, ponto, barra ou hífen.',
    );
  }
  // Um contato opcional não pode chegar como número ou objeto: o formato textual preserva sinais e zeros.
  if (dados.telefone != null && typeof dados.telefone !== 'string') {
    throw new ErroHttp(400, 'Telefone inválido.');
  }
  // Contato opcional, preservado como texto para manter sinais e zeros iniciais.
  const telefone = dados.telefone?.trim() || null;
  // Confere sinais permitidos e quantidade mínima de dígitos, sem tornar obrigatório um telefone vazio.
  if (
    telefone &&
    (telefone.length > 20 ||
      !/^[0-9()+\s-]+$/.test(telefone) ||
      telefone.replace(/\D/g, '').length < 8)
  ) {
    throw new ErroHttp(400, 'Informe um telefone válido ou deixe o campo vazio.');
  }
  // Uma chave de tentativa válida permite distinguir a repetição de um clique de um novo cadastro.
  if (typeof dados.chave_cadastro !== 'string' || !formatoChave.test(dados.chave_cadastro)) {
    throw new ErroHttp(400, 'Chave do cadastro inválida. Inicie uma nova tentativa pelo painel.');
  }
  // Entrega um objeto novo normalizado, sem modificar os dados originais recebidos pelo servidor.
  return {
    // Texto de apresentação; não é usado para conceder permissões.
    nome: dados.nome.trim(),
    // Data ISO já conferida no calendário; o banco a armazena em uma coluna DATE.
    data_nascimento: nascimento,
    // Valor opcional normalizado ou NULL; a unicidade só é aplicada quando há documento.
    documento,
    // Contato opcional guardado como texto, sem perder sinais e zeros iniciais.
    telefone,
    // Identifica a tentativa e não o paciente; uma edição posterior recebe outra chave.
    chave_cadastro: dados.chave_cadastro.toLowerCase(),
  };
}
// Salva o paciente e reconhece uma repetição da mesma tentativa para evitar cadastro duplicado.
export async function cadastrarPaciente(banco, dados) {
  // Cadastro validado ou registro da iteração atual; sua identificação liga as próximas operações.
  const paciente = validarPaciente(dados);
  try {
    // Resultado da operação ou da conferência; o chamador decide a resposta a partir dele.
    const [resultado] = await banco.execute(
      'INSERT INTO pacientes (nome, data_nascimento, documento, telefone, chave_cadastro) VALUES (?, ?, ?, ?, ?)',
      [
        paciente.nome,
        paciente.data_nascimento,
        paciente.documento,
        paciente.telefone,
        paciente.chave_cadastro,
      ],
    );
    // Informa a criação nova e devolve o identificador persistido para a próxima ação na interface.
    return {
      // Permite distinguir uma criação nova de uma repetição reconhecida.
      criado: true,
      // Registro público do paciente que a tela pode apresentar.
      paciente: {
        // Identificador persistido usado para relacionar registros sem depender de nomes.
        id: resultado.insertId,
        ...paciente,
        // Identifica a tentativa e não o paciente; uma edição posterior recebe outra chave.
        chave_cadastro: undefined,
      },
    };
  } catch (erro) {
    // Trata conflito de unicidade como regra de repetição; outras falhas de banco precisam seguir para o tratamento de erro.
    if (erro.code !== 'ER_DUP_ENTRY') {
      // Mantém a falha original para que o tratamento central registre a causa e encerre a operação.
      throw erro;
    }
    // Uma repetição da mesma tentativa devolve o registro já criado.
    const [linhas] = await banco.execute(
      'SELECT id, nome, data_nascimento, documento, telefone FROM pacientes WHERE chave_cadastro = ?',
      [paciente.chave_cadastro],
    );
    // Só reaproveita um registro depois de conferir que o banco encontrou a tentativa correspondente.
    if (linhas.length) {
      // Registro encontrado ao repetir uma chave; é comparado com a tentativa antes de ser reaproveitado.
      const existente = linhas[0];
      // Confere todos os campos relevantes; uma chave já usada não pode servir a outros dados.
      const igual = ['nome', 'data_nascimento', 'documento', 'telefone'].every(
        (campo) => existente[campo] === paciente[campo],
      );
      // Reutilizar a chave com dados diferentes geraria uma resposta ambígua; a operação é recusada como conflito.
      if (!igual) {
        throw new ErroHttp(409, 'Esta chave de cadastro já foi usada com outros dados.');
      }
      // Reconhece a repetição como sucesso do registro existente, sem gravar outra cópia.
      return {
        // Permite distinguir uma criação nova de uma repetição reconhecida.
        criado: false,
        // Registro público do paciente que a tela pode apresentar.
        paciente: existente,
      };
    }
    throw new ErroHttp(
      409,
      'Já existe um paciente com esse documento. Use a busca para encontrá-lo.',
    );
  }
}
