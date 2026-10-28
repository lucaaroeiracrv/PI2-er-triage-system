# 13 Conferir os campos e as funções das telas

Foi conferida a consistência desta proposta. A comparação com os documentos originais continua pendente.

## Arquivos relacionados

`public/screens/campos.html e docs/campos.json`.

## Continuidade

Este material explica a tarefa. Os arquivos de código continuam no mesmo lugar e podem ser alterados pelos próximos commits. Para executar o projeto, siga o README da raiz.

Proposta 01 baseada no cronograma e nos cartões atuais. O texto individual dos requisitos e o MER não foram disponibilizados. A validação com esses documentos está pendente.

| Tela ou função | Campo                             | Formato proposto        | Obrigatório        | Onde guardar                  | Conferência                                                                     |
| -------------- | --------------------------------- | ----------------------- | ------------------ | ----------------------------- | ------------------------------------------------------------------------------- |
| Login          | login                             | Texto, até 100          | Sim                | usuarios.login                | Usuário fictício: recepcao, enfermagem ou medico.                               |
| Login          | senha                             | Texto, até 200          | Sim                | usuarios.senha_hash           | O código salva e compara um hash scrypt.                                        |
| Paciente       | nome                              | Texto de 2 a 120        | Sim                | pacientes.nome                | Remover espaços nas pontas. Mostrar como texto nas telas.                       |
| Paciente       | data_nascimento                   | Data AAAA-MM-DD         | Sim                | pacientes.data_nascimento     | Data existente, de 1900 até o dia atual.                                        |
| Paciente       | documento                         | Texto de 3 a 40         | Não                | pacientes.documento           | Identificador genérico nesta proposta; único quando informado.                  |
| Paciente       | telefone                          | Texto, até 20           | Não                | pacientes.telefone            | Ao informar: pelo menos 8 dígitos; aceita espaços, +, -, ( e ).                 |
| Cadastro       | chave_cadastro                    | UUID v4                 | Gerado pelo código | pacientes.chave_cadastro      | Reutilizar ao repetir a mesma tentativa; evita duplicação por repetição.        |
| Atendimento    | paciente_id                       | Número inteiro positivo | Sim                | atendimentos.paciente_id      | Deve apontar para paciente existente.                                           |
| Atendimento    | recepcionista_id                  | Número inteiro          | Pela sessão        | atendimentos.recepcionista_id | Não confiar em um ID de usuário enviado pelo formulário.                        |
| Atendimento    | situacao                          | Texto controlado        | Pelo backend       | atendimentos.situacao         | Começa como aguardando_triagem.                                                 |
| Abertura       | chave_abertura                    | UUID v4                 | Gerado pelo código | atendimentos.chave_abertura   | Uma mesma tentativa retorna o mesmo atendimento.                                |
| Triagem        | queixa e sinais vitais            | Proposta visual         | A validar          | Etapa seguinte                | Queixa, pressão, temperatura, frequência e saturação são campos propostos.      |
| Triagem        | classificacao                     | Proposta visual         | A validar          | Etapa seguinte                | Registrar segundo os requisitos aprovados; nenhum algoritmo clínico foi criado. |
| Consulta       | registro_consulta                 | Texto, proposta visual  | A validar          | Etapa seguinte                | Campos definitivos dependem dos requisitos originais.                           |
| Medicações     | medicacao, dose, via, observacoes | Proposta visual         | A validar          | Etapa seguinte                | Confirmar também qual perfil pode usar essa etapa.                              |
| Encerramento   | resumo e confirmação              | Proposta visual         | A validar          | Etapa seguinte                | A função real será desenvolvida nas tarefas 38 e 40.                            |

## O que conferir com o grupo

- Campos obrigatórios de cada formulário e formato dos documentos usados.
- Tabelas e nomes de colunas do MER já feito pelo Eduardo.
- Regras e perfis permitidos para triagem, medicações e encerramento.
- Texto completo de RF0001 a RF0011, sem deduzir a descrição de cada código apenas pelo cronograma.

## Como adaptar

Esta proposta usa as tabelas usuarios, pacientes e atendimentos. Se o banco existente tiver outra estrutura, ajustar o SQL em src/pacientes/cadastro.js, src/pacientes/busca.js, src/atendimentos/abertura.js e src/auth/autenticacao.js antes de usar as tabelas do grupo. Não importar a estrutura de exemplo por cima do banco existente.
