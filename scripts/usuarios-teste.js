// Somente o comando de preparação chama esta função.
// Esses usuários fictícios permitem testar os três perfis separadamente.
import { gerarHash } from '../src/auth/senhas.js';
// Prepara contas fictícias de cada perfil sem sobrescrever usuários já existentes.
export async function criarUsuariosDeTeste(banco) {
  // Cria uma conta fictícia por perfil sem repetir a regra de derivação e gravação.
  for (const [nome, login, perfil] of [
    ['Recepção de teste', 'recepcao', 'recepcao'],
    ['Enfermagem de teste', 'enfermagem', 'enfermagem'],
    ['Médico de teste', 'medico', 'medico'],
  ]) {
    // Resultado derivado da senha; este valor substitui o armazenamento da senha em texto.
    const hash = await gerarHash('Pi2@2026!');
    // Aguarda a operação do banco; consultas de formulário usam valores separados do texto SQL.
    await banco.execute(
      'INSERT IGNORE INTO usuarios (nome, login, senha_hash, perfil) VALUES (?, ?, ?, ?)',
      [nome, login, hash, perfil],
    );
  }
}
