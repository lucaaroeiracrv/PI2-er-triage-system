# Verificação do projeto

O backend suporta Oracle e MySQL, selecionados individualmente pela variável `DB_ENGINE`. Os bancos mantêm schemas e dados independentes. Esta verificação combina testes automatizados, execução em bancos locais e fluxos HTTP; as instâncias locais usadas nos testes não são necessárias para rodar `npm test`.

## Verificações registradas

- `npm test`: testes automatizados de configuração dos bancos, validação, senhas, permissões e arquivos públicos.
- Testes específicos para validação e gravação transacional da triagem e da consulta, vínculo com paciente/atendimento/triagem, mudança de status e filas médicas.
- `npm run verificar:formatacao`: verificação de formatação com Prettier.
- `npm run testar:conexao`: teste de conexão Oracle.
- `npm run testar:mysql`: teste de conexão MySQL.
- Preparação idempotente verificada nos dois motores; os dados existentes foram preservados.
- Fluxo HTTP real MySQL verificado com login, cadastro, abertura de atendimento, triagem, persistência de classificação/autoria/data/hora, mudança de status e exibição na fila médica; os registros fictícios criados para o teste foram removidos ao final.
- Medicações e encerramento possuem testes automatizados unitários/transacionais simulados. Esses testes não substituem execução real em MySQL ou Oracle.
- MySQL 8.4 validado diretamente em Docker: o script preparou a tabela `medicacoes`, os tipos físicos, a chave primária, o índice de atendimento e as referências estrangeiras.
- Oracle Database 23 Free validado diretamente em Docker: o script criou `MEDICACOES`, a identidade, o índice `IDX_MEDICACOES_ATENDIMENTO` e as restrições de chave estrangeira.
- Conversão CLOB validada em Oracle 23 Free usando `TO_CLOB()` e os aliases `registro_consulta`/`observacoes`: `consultar()` retornou strings JavaScript com os valores esperados.
- Os dois bancos retornaram sucesso nos endpoints `/api/saude` após a preparação e o início da aplicação.
- CPF possui validação matemática no backend e validação equivalente no frontend.
- Pressão arterial é validada no backend no formato sistólica/diastólica.
- O fluxo da interface Oracle foi testado com banco local; conexão, preparação e uso confirmado.
- O arquivo Compose e os perfis de MySQL e Oracle foram verificados por configuração; o primeiro início em cada computador baixa as imagens e cria volumes independentes.

Para repetir as verificações disponíveis, execute `npm test` e `npm run verificar:formatacao`. Os testes reais de conexão precisam das instâncias locais; consulte os [guias Oracle](GUIA_BANCO_ORACLE_WSL.md) e [MySQL](GUIA_BANCO_MYSQL.md). A inicialização Compose também pode ser feita com `.\scripts\iniciar-docker.ps1` no PowerShell.

## Fluxo de classificação de risco

Na aplicação, a enfermagem seleciona a classificação após sua avaliação profissional. A triagem fica vinculada ao atendimento, registra data/hora pelo banco e identifica o profissional autenticado. O painel médico consulta os atendimentos liberados e atualiza a fila automaticamente a cada dois segundos. A classificação não é calculada pelo sistema e não substitui a avaliação clínica.

Após registrar a triagem, o backend recupera o registro vinculado ao atendimento dentro da transação; somente confirma após o commit. O painel da enfermagem exibe os dados recuperados e a classificação.

O médico pode registrar vários apontamentos de consulta para o mesmo atendimento. O primeiro registro altera sua situação para `em_atendimento`; o atendimento deixa a fila de espera e fica disponível na lista de atendimentos em andamento. O registro usa `registro_consulta`, é associado ao médico autenticado e ao atendimento, e valida que paciente e triagem selecionados pertencem a esse atendimento. A etapa não finaliza o atendimento.

Os testes automatizados usam banco simulado. Eles cobrem as regras de validação, transação, permissões, vínculos e filas; não substituem a execução de integração. A preparação física e o endpoint de saúde foram validados diretamente em instâncias Docker de MySQL e Oracle. Fluxos HTTP completos das novas medicações e do encerramento continuam cobertos por testes simulados e podem ser reforçados com uma rodada HTTP pós-login em cada banco.

## Medicações e encerramento

As telas de medicações e resumo de encerramento passaram a usar dados da API. A medicação é opcional e pode ser registrada enquanto o atendimento está em `em_atendimento`; o profissional autenticado é gravado automaticamente.

O encerramento exige situação `em_atendimento` e pelo menos uma consulta médica. O usuário autorizado provisoriamente é o perfil `medico`. Uma repetição já com situação `finalizado` retorna sucesso idempotente e não executa novo `UPDATE`.

Rotas utilizadas:

- `GET /api/medicacoes?atendimento_id=<id>`
- `POST /api/medicacoes`
- `GET /api/atendimentos/resumo?atendimento_id=<id>`
- `POST /api/atendimentos/finalizar`

## Limitações

A validação técnica não substitui a comparação do schema com os requisitos completos e o MER oficial do grupo. O registro da consulta usa os campos acordados no modelo proposto (`id`, `atendimento_id`, `medico_id`, `registro_consulta` e `criado_em`). Medicações e encerramento estão implementados, mas o perfil autorizado oficialmente ainda não foi confirmado pelo grupo. O projeto é acadêmico, não é uma ferramenta clínica validada e não deve ser usado para atendimento real.
