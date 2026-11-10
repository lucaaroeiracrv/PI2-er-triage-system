# Verificação do projeto

O backend suporta Oracle e MySQL, selecionados individualmente pela variável `DB_ENGINE`. Os bancos mantêm schemas e dados independentes. Esta verificação combina testes automatizados, execução em bancos locais e fluxos HTTP; as instâncias locais usadas nos testes não são necessárias para rodar `npm test`.

## Verificações registradas

- `npm test`: testes automatizados de configuração dos bancos, validação, senhas, permissões e arquivos públicos.
- `npm run verificar:formatacao`: verificação de formatação com Prettier.
- `npm run testar:conexao`: teste de conexão Oracle.
- `npm run testar:mysql`: teste de conexão MySQL.
- Preparação idempotente verificada nos dois motores; os dados existentes foram preservados.
- Fluxo HTTP MySQL verificado com saúde, login, cadastro e busca de paciente e abertura de atendimento.
- O fluxo da interface Oracle foi testado com banco local; conexão, preparação e uso confirmado.
- O arquivo Compose e os perfis de MySQL e Oracle foram verificados por configuração; o primeiro início em cada computador baixa as imagens e cria volumes independentes.

Para repetir as verificações disponíveis, execute `npm test` e `npm run verificar:formatacao`. Os testes reais de conexão precisam das instâncias locais; consulte os [guias Oracle](GUIA_BANCO_ORACLE_WSL.md) e [MySQL](GUIA_BANCO_MYSQL.md). A inicialização Compose também pode ser feita com `.\scripts\iniciar-docker.ps1` no PowerShell.

## Limitações

A validação técnica não substitui a comparação do schema com os requisitos completos e o MER oficial do grupo. Triagem, consulta, medicações e encerramento continuam como protótipos; não foram implementados como fluxos persistidos no banco.
