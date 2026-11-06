import { gerarHash } from '../src/auth/senhas.js';

export async function criarUsuariosDeTeste(conexao) {
  const engine = String(process.env.DB_ENGINE || 'oracle').trim().toLowerCase();

  for (const [nome, login, perfil] of [
    ['Recepção de teste', 'recepcao', 'recepcao'],
    ['Enfermagem de teste', 'enfermagem', 'enfermagem'],
    ['Médico de teste', 'medico', 'medico'],
  ]) {
    const senha_hash = await gerarHash('Pi2@2026!');

    if (engine === 'mysql') {
      await conexao.execute(
        `INSERT INTO usuarios (nome, login, senha_hash, perfil, ativo)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE nome = VALUES(nome), senha_hash = VALUES(senha_hash), perfil = VALUES(perfil)`,
        [nome, login, senha_hash, perfil],
      );
      continue;
    }

    await conexao.execute(
      `MERGE INTO usuarios destino
       USING (
         SELECT :nome nome, :login login, :senha_hash senha_hash, :perfil perfil FROM dual
       ) origem
       ON (destino.login = origem.login)
       WHEN NOT MATCHED THEN INSERT (nome, login, senha_hash, perfil)
       VALUES (origem.nome, origem.login, origem.senha_hash, origem.perfil)`,
      { nome, login, senha_hash, perfil },
    );
  }
}
