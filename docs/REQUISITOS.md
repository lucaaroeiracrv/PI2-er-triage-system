# Requisitos do sistema

Este documento atualiza os requisitos funcionais e não funcionais do relatório do grupo, registrando
o estado encontrado no código após as tarefas 32, 33 e 34. Os estados indicam implementação no
repositório, não validação clínica ou aprovação formal do grupo.

## Legenda

- **Implementado:** o fluxo correspondente existe no backend/interface.
- **Parcial:** há suporte no código, mas falta validação, cobertura ou garantia exigida pelo requisito.
- **Pendente:** a funcionalidade ainda não foi integrada; telas de protótipo não contam como implementação.

## Requisitos funcionais

| Código | Requisito                                                                       | Estado       | Observação                                                                                         |
| ------ | ------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| RF01   | Permitir login com usuário e senha.                                             | Implementado | A autenticação usa senha com hash.                                                                 |
| RF02   | Identificar o perfil do usuário autenticado.                                    | Implementado | A sessão contém a identidade e o perfil.                                                           |
| RF03   | Restringir o acesso conforme os perfis de recepção, enfermagem e médico.        | Implementado | As permissões são verificadas no backend.                                                          |
| RF04   | Permitir cadastrar pacientes.                                                   | Implementado | O painel funcional envia os dados ao backend.                                                      |
| RF05   | Validar nome, data de nascimento e CPF.                                         | Implementado | O backend valida os campos antes da persistência.                                                  |
| RF06   | Impedir cadastro com CPF já existente.                                          | Implementado | CPF único no banco e conflito tratado pelo backend.                                                |
| RF07   | Buscar pacientes por nome ou documento.                                         | Implementado | A busca usa consulta parametrizada.                                                                |
| RF08   | Permitir à recepção abrir atendimento para paciente cadastrado.                 | Implementado | A operação valida o paciente e o perfil da sessão.                                                 |
| RF09   | Registrar data/hora e situação inicial do atendimento.                          | Implementado | A situação inicial é `aguardando_triagem`.                                                         |
| RF10   | Disponibilizar atendimentos aguardando triagem à enfermagem.                    | Implementado | A fila informa quando está vazia.                                                                  |
| RF11   | Registrar queixa principal e sinais vitais.                                     | Implementado | Os dados são validados e associados à triagem.                                                     |
| RF12   | Permitir à enfermagem informar a classificação de risco.                        | Implementado | A classificação é selecionada pelo profissional, sem cálculo automático.                           |
| RF13   | Armazenar triagem ligada ao atendimento correspondente.                         | Implementado | Há chave estrangeira e restrição de uma triagem por atendimento.                                   |
| RF14   | Exibir resultado da triagem após salvar.                                        | Implementado | A interface mostra os dados recuperados do banco após confirmação.                                 |
| RF15   | Mudar a situação para `aguardando_medico` após a triagem.                       | Implementado | A gravação da triagem e a mudança de situação são transacionais.                                   |
| RF16   | Disponibilizar ao médico a fila de atendimentos aguardando consulta.            | Implementado | A fila filtra a situação `aguardando_medico`.                                                      |
| RF17   | Exibir paciente, classificação e dados de triagem na fila médica.               | Implementado | Os dados são consultados pelo vínculo do mesmo atendimento.                                        |
| RF18   | Ordenar a fila conforme a regra definida para o projeto.                        | Implementado | FIFO por horário da triagem e, em empate, ID do atendimento; sem prioridade por cor.               |
| RF19   | Permitir ao médico selecionar um atendimento.                                   | Implementado | O painel oferece ação para iniciar ou continuar o registro.                                        |
| RF20   | Registrar as informações da consulta médica.                                    | Implementado | O escopo aprovado usa o campo textual `registro_consulta`.                                         |
| RF21   | Associar a consulta ao paciente e ao atendimento corretos.                      | Implementado | A consulta armazena `atendimento_id`; o backend valida paciente e triagem contra esse atendimento. |
| RF22   | Registrar medicações associadas ao atendimento.                                 | Pendente     | Existe somente protótipo visual.                                                                   |
| RF23   | Consultar registros de medicação de um atendimento.                             | Pendente     | Não há persistência/API funcional de medicações.                                                   |
| RF24   | Exibir resumo do atendimento antes do encerramento.                             | Pendente     | Existe somente proposta visual.                                                                    |
| RF25   | Finalizar atendimento e registrar a situação final.                             | Pendente     | O fluxo atual não muda o atendimento para `finalizado`.                                            |
| RF26   | Informar resultados de operações de cadastro, consulta, triagem e encerramento. | Parcial      | Há mensagens para as operações implementadas; medicações e encerramento ainda estão pendentes.     |
| RF27   | Informar quando não houver pacientes ou atendimentos nas filas.                 | Implementado | As filas de triagem, espera médica e andamento exibem estado vazio.                                |
| RF28   | Impedir operações não autorizadas para o perfil.                                | Implementado | A autorização é aplicada no backend, além do controle visual da tela.                              |

## Requisitos não funcionais

| Código | Requisito                                                     | Estado       | Observação                                                                                                                                                |
| ------ | ------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF01  | Interface web intuitiva e fácil de navegar.                   | Parcial      | O painel funcional existe; a usabilidade precisa ser validada com o grupo/usuários.                                                                       |
| RNF02  | Manter consistência visual entre as telas.                    | Parcial      | Há estilos compartilhados e painel funcional; os protótipos ainda não comprovam consistência de toda a aplicação.                                         |
| RNF03  | Usar Node.js no backend e HTML, CSS e JavaScript no frontend. | Implementado | Tecnologias utilizadas no projeto.                                                                                                                        |
| RNF04  | Ser compatível com MySQL e Oracle Database.                   | Parcial      | Há configuração e schemas para os dois motores; as alterações recentes precisam de integração real em ambos.                                              |
| RNF05  | Selecionar o banco por `DB_ENGINE`.                           | Implementado | A configuração central do banco valida e seleciona o motor.                                                                                               |
| RNF06  | Usar parâmetros nas consultas para evitar SQL Injection.      | Implementado | Os valores de entrada são passados como binds.                                                                                                            |
| RNF07  | Armazenar senhas com hash seguro, sem texto puro.             | Implementado | O projeto usa `scrypt`.                                                                                                                                   |
| RNF08  | Verificar permissões no backend.                              | Implementado | Rotas exigem sessão e perfil autorizado.                                                                                                                  |
| RNF09  | Preservar integridade referencial com chaves e vínculos.      | Implementado | Schemas usam chaves estrangeiras; vínculos de paciente/triagem da consulta também são conferidos na aplicação.                                            |
| RNF10  | Usar transações em operações com alterações relacionadas.     | Implementado | Abertura, triagem e consulta agrupam suas gravações e mudanças de situação.                                                                               |
| RNF11  | Validar dados antes da persistência.                          | Implementado | Validações existentes cobrem os fluxos entregues; etapas futuras ainda não foram desenvolvidas.                                                           |
| RNF12  | Apresentar mensagens claras de sucesso e erro.                | Implementado | As operações funcionais reportam sucesso somente após confirmação do backend.                                                                             |
| RNF13  | Evitar duplicidade causada por repetição de operações.        | Parcial      | Cadastro, abertura e triagem têm proteção contra repetição; múltiplas consultas são permitidas e não há chave de idempotência para reenviar uma consulta. |
| RNF14  | Ter testes automatizados para as regras principais.           | Implementado | Há testes automatizados; eles não substituem teste de integração com cada SGBD.                                                                           |
| RNF15  | Permitir execução local com Docker e Docker Compose.          | Implementado | O repositório possui Dockerfile, Compose e scripts de inicialização.                                                                                      |
| RNF16  | Manter credenciais em variáveis de ambiente.                  | Implementado | As configurações do banco usam variáveis de ambiente.                                                                                                     |
| RNF17  | Usar dados fictícios em desenvolvimento e demonstração.       | Implementado | Dados de demonstração são fictícios e a interface orienta seu uso.                                                                                        |
| RNF18  | Manter estruturas conceitualmente compatíveis nos dois SGBDs. | Parcial      | Os schemas representam as mesmas entidades; tipos físicos diferem e ainda falta validar em instâncias reais após as últimas mudanças.                     |

## Escopo e referências

- O sistema não calcula classificação de risco nem substitui avaliação profissional.
- A fila médica usa FIFO; não foi definido ordenamento adicional por cor.
- Consulta médica armazena o campo acordado `registro_consulta`; não foram acrescentados campos de
  medicação, diagnóstico ou encerramento.
- A implementação atual e suas limitações estão descritas em
  [VERIFICACAO.md](VERIFICACAO.md); as relações de dados, em [MER.md](MER.md); o percurso entre
  perfis, em [FLUXO_ESPERADO.md](FLUXO_ESPERADO.md).
