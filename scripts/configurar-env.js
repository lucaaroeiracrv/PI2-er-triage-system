// Este comando funciona no Windows, Linux e macOS. Não sobrescreve um .env existente.
import { copyFile } from 'node:fs/promises';
// Acessa arquivos com operações assíncronas para não bloquear o servidor durante a leitura.
import { constants } from 'node:fs';
try {
  await copyFile(
    new URL('../.env.example', import.meta.url),
    new URL('../.env', import.meta.url),
    constants.COPYFILE_EXCL,
  );
  // Informa no terminal o resultado da preparação ou o endereço para testar a etapa.
  console.log('.env criado. Abra o arquivo e preencha os dados do seu MySQL.');
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
