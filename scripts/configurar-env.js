import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
// Acessa arquivos com operações assíncronas para não bloquear o servidor durante a leitura.
const caminhoExemplo = new URL('../.env.example', import.meta.url);
const caminhoLocal = new URL('../.env', import.meta.url);
try {
  const exemplo = await readFile(caminhoExemplo, 'utf8');
  const senha = randomBytes(32).toString('hex');
  await writeFile(caminhoLocal, exemplo.replace(/^DB_PASSWORD=$/m, `DB_PASSWORD=${senha}`), {
    flag: 'wx',
  });
  console.log('.env criado com senha Oracle aleatória. Preencha DB_ADMIN_PASSWORD localmente.');
} catch (erro) {
  // Traduz apenas a falha prevista; um erro desconhecido continua visível no tratamento central.
  if (erro.code === 'EEXIST') {
    // Informa no terminal o resultado da preparação ou o endereço para testar a etapa.
    console.log('.env já existe; as configurações foram preservadas.');
  } else {
    // Informa a causa no terminal para ajudar a corrigir o ambiente sem expor detalhes na tela.
    console.error('Não foi possível criar o .env:', erro.message);
    // Marca a falha para o terminal e para quem automatizar a execução deste comando.
    process.exitCode = 1;
  }
}
