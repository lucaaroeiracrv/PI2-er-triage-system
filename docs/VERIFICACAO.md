# Verificação do projeto

O backend suporta Oracle e MySQL, selecionados individualmente pela variável `DB_ENGINE`. Os bancos mantêm schemas e dados independentes. Esta verificação combina testes automatizados, execução em bancos locais e fluxos HTTP; as instâncias locais usadas nos testes não são necessárias para rodar `npm test`.

## Verificações registradas

- `npm test`: testes automatizados de configuração dos bancos, validação, senhas, permissões e arquivos públicos.
- Testes específicos para validação da triagem, gravação transacional, mudança de status e consultas que alimentam as filas de enfermagem e médica.
- `npm run verificar:formatacao`: verificação de formatação com Prettier.
- `npm run testar:conexao`: teste de conexão Oracle.
- `npm run testar:mysql`: teste de conexão MySQL.
- Preparação idempotente verificada nos dois motores; os dados existentes foram preservados.
- Fluxo HTTP real MySQL verificado com login, cadastro, abertura de atendimento, triagem, persistência de classificação/autoria/data/hora, mudança de status e exibição na fila médica; os registros fictícios criados para o teste foram removidos ao final.
- O fluxo da interface Oracle foi testado com banco local; conexão, preparação e uso confirmado.
- O arquivo Compose e os perfis de MySQL e Oracle foram verificados por configuração; o primeiro início em cada computador baixa as imagens e cria volumes independentes.

Para repetir as verificações disponíveis, execute `npm test` e `npm run verificar:formatacao`. Os testes reais de conexão precisam das instâncias locais; consulte os [guias Oracle](GUIA_BANCO_ORACLE_WSL.md) e [MySQL](GUIA_BANCO_MYSQL.md). A inicialização Compose também pode ser feita com `.\scripts\iniciar-docker.ps1` no PowerShell.

## Fluxo de classificação de risco

Na aplicação, a enfermagem seleciona a classificação após sua avaliação profissional. A triagem fica vinculada ao atendimento, registra data/hora pelo banco e identifica o profissional autenticado. O painel médico consulta os atendimentos liberados e atualiza a fila automaticamente a cada dois segundos. A classificação não é calculada pelo sistema e não substitui a avaliação clínica.

Os testes automatizados usam banco simulado. Nesta execução, o fluxo completo também foi validado contra a instância local MySQL. A conexão Oracle não foi testada nesta execução; consulte os guias de banco para preparar e validar outro ambiente.

## Limitações

A validação técnica não substitui a comparação do schema com os requisitos completos e o MER oficial do grupo. Consulta médica, medicações e encerramento continuam como protótipos. O projeto é acadêmico, não é uma ferramenta clínica validada e não deve ser usado para atendimento real.
