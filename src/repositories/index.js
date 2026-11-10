// src\repositories\index.js
export { criarAutenticacao } from '../auth/autenticacao.js';
export { abrirAtendimento } from '../atendimentos/abertura.js';
export { buscarPacientes } from '../pacientes/busca.js';
export { cadastrarPaciente, formatoChave, validarPaciente } from '../pacientes/cadastro.js';
export {
  configuracaoBanco,
  criarPool,
  consultar,
  executar,
  erroDeUnicidade,
  motorDoBanco,
} from '../config/banco.js';
