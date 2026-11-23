# Requisitos da versão atual

Este documento descreve os requisitos funcionais presentes na versão de demonstração. Os itens
abaixo estão implementados na aplicação; sua aceitação acadêmica ainda depende da validação do
grupo e da comparação com a especificação oficial da disciplina.

## Requisitos funcionais

| Código | Requisito                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| RF01   | Permitir login com usuário e senha e identificar o perfil autenticado.                                       |
| RF02   | Controlar acesso de recepção, enfermagem e médico no backend.                                                |
| RF03   | Cadastrar e buscar pacientes por nome ou documento, validando dados e unicidade do CPF.                      |
| RF04   | Permitir que a recepção abra atendimento para paciente existente e registrar data, hora e situação inicial.  |
| RF05   | Disponibilizar atendimentos aguardando triagem para a enfermagem.                                            |
| RF06   | Registrar queixa, sinais vitais e classificação informada pela enfermagem.                                   |
| RF07   | Persistir triagem associada a atendimento e profissional e exibir o resultado salvo.                         |
| RF08   | Alterar a situação para `aguardando_medico` depois da triagem confirmada.                                    |
| RF09   | Disponibilizar a fila médica com paciente, classificação, autoria, horário, queixa e sinais vitais.          |
| RF10   | Ordenar a fila médica por horário da triagem e identificador do atendimento em caso de empate.               |
| RF11   | Permitir registro de consulta pelo médico, validando os vínculos de atendimento, paciente e triagem.         |
| RF12   | Persistir consulta e alterar a situação para `em_atendimento`; aceitar registros adicionais enquanto aberta. |
| RF13   | Permitir consultar e registrar medicações durante atendimento em andamento.                                  |
| RF14   | Apresentar resumo com paciente, atendimento, triagem, consultas e medicações.                                |
| RF15   | Permitir encerramento após consulta registrada e retornar o estado `finalizado`; repetição é idempotente.    |
| RF16   | Informar resultados e erros e indicar filas vazias sem declarar sucesso em caso de falha.                    |

## Requisitos não funcionais

| Código | Requisito                                                                                 |
| ------ | ----------------------------------------------------------------------------------------- |
| RNF01  | Interface web em HTML, CSS e JavaScript, com padrão visual compartilhado.                 |
| RNF02  | Backend Node.js com suporte a Oracle e MySQL, selecionados por `DB_ENGINE`.               |
| RNF03  | Usar consultas parametrizadas e validar entradas no servidor.                             |
| RNF04  | Armazenar senhas como hash e verificar permissões no backend.                             |
| RNF05  | Preservar integridade referencial e usar transações em operações relacionadas.            |
| RNF06  | Evitar duplicidades em operações repetidas por chaves de tentativa e restrições do banco. |
| RNF07  | Disponibilizar testes automatizados para as principais regras e rotas.                    |
| RNF08  | Permitir execução local via Docker Compose ou com Node.js e banco configurado.            |
| RNF09  | Manter credenciais em variáveis/arquivos locais ignorados pelo Git.                       |
| RNF10  | Usar dados fictícios; não utilizar o sistema para atendimento real.                       |

## Regras e limitações

- A classificação é informada pela enfermagem. O sistema não calcula risco e não substitui
  avaliação clínica.
- A fila médica segue FIFO por `triagens.criado_em`, com desempate por `atendimentos.id`; a cor não
  confere prioridade adicional.
- As operações de medicação e encerramento estão autorizadas ao perfil `medico` na implementação
  atual. Essa decisão provisória precisa de confirmação formal do grupo.
- A aplicação e os schemas são demonstração acadêmica; não constituem validação clínica, de
  segurança de produção ou conformidade com requisitos externos.

## Documentos relacionados

- [Modelo de dados](MER.md)
- [Fluxo implementado](FLUXO_ESPERADO.md)
- [Verificações e limitações](VERIFICACAO.md)
