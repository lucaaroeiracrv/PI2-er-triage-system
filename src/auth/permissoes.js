// a decisão de acesso é tomada no backend.
// Esconder um botão na tela, sozinho, não protege uma função.
import { ErroHttp } from '../http/respostas.js';
export const perfis = ['recepcao', 'enfermagem', 'medico'];
// Aplica a permissão no backend, independentemente de o botão estar visível na interface.
export function exigirPerfil(sessao, permitidos) {
  // A permissão é conferida antes de continuar, mesmo se alguém ignorar os controles visuais da página.
  if (!permitidos.includes(sessao.usuario.perfil)) {
    throw new ErroHttp(403, 'Seu perfil não pode usar esta função.');
  }
}
// Entrega a área do perfil autorizado e indica quais funções ainda pertencem às próximas etapas.
export function informacoesDoPerfil(sessao, perfil) {
  // A permissão é conferida antes de continuar, mesmo se alguém ignorar os controles visuais da página.
  if (!perfis.includes(perfil)) {
    throw new ErroHttp(404, 'Perfil não encontrado.');
  }
  exigirPerfil(sessao, [perfil]);
  // Textos de cada área; não concedem acesso sem a conferência do perfil.
  const mensagens = {
    recepcao:
      'Cadastro, busca de paciente e abertura de atendimento disponíveis no painel de teste.',
    enfermagem:
      'Registre a triagem e informe a classificação de risco conforme a avaliação profissional.',
    medico:
      'Consulte os atendimentos liberados pela triagem; a classificação e os dados ficam vinculados ao atendimento.',
  };
  // Entrega a mensagem somente para o perfil cuja permissão já foi conferida.
  return {
    // Perfil conhecido pelo backend, utilizado nas regras de acesso.
    perfil,
    mensagem: mensagens[perfil],
  };
}
