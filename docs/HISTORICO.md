# Sequência de commits do PI2

Esta é a sequência de organização do material existente, preparada agora. As mensagens seguem Conventional Commits: tipo(escopo): descrição (tarefa N). Identificam tarefas reais do quadro. Os mesmos arquivos são modificados ao longo da sequência. Os materiais de conferência não representam aprovação do grupo.

| Commit                                                              | Alterações agrupadas                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `feat(ui): adicionar rascunhos das telas principais (tarefa 11)`    | Índice, rascunhos e telas compartilhadas iniciais.                  |
| `feat(design): definir cores, fontes e componentes (tarefa 12)`     | Tema compartilhado e guia visual.                                   |
| `docs: mapear campos e funções das telas (tarefa 13)`               | Mapa de campos e material de conferência.                           |
| `chore(db): preparar estrutura e dados fictícios (tarefa 14)`       | SQL de exemplo e dados fictícios.                                   |
| `feat(backend): criar servidor e conexão com MySQL (tarefa 15)`     | Servidor, acesso a arquivos públicos, configuração MySQL e scripts. |
| `feat(ui): desenhar cadastro do paciente (tarefa 16)`               | Refinamento do mesmo cadastro.html.                                 |
| `feat(ui): desenhar formulário de triagem (tarefa 17)`              | Refinamento do mesmo triagem.html.                                  |
| `feat(ui): desenhar painel do médico (tarefa 18)`                   | Refinamento do mesmo medico.html.                                   |
| `feat(ui): desenhar medicações e encerramento (tarefa 19)`          | Desenhos de medicações e encerramento.                              |
| `feat(review): adicionar revisão dos desenhos (tarefa 20)`          | Página de revisão e exportação da avaliação pendente.               |
| `feat(auth): implementar login e sessões (tarefa 21)`               | Login, hash, sessões, usuários de teste e início do painel.         |
| `feat(auth): restringir acesso por perfil (tarefa 22)`              | Permissões no backend e visibilidade por perfil.                    |
| `feat(patients): implementar cadastro de pacientes (tarefa 23)`     | Cadastro, validação e evolução do painel.                           |
| `feat(patients): implementar busca de pacientes (tarefa 24)`        | Busca no MySQL e evolução do painel.                                |
| `feat(attendance): implementar abertura de atendimento (tarefa 25)` | Abertura, prevenção de duplicações e conferência final.             |

Use `git show --stat <hash>` para ver os arquivos efetivamente alterados em cada etapa. O histórico local não foi enviado ao GitHub. A preparação do banco depende da tarefa 10; o SQL fornecido é o apoio já existente no pacote original.
