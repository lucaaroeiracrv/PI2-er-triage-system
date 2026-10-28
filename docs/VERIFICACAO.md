# Verificação da reorganização

O projeto reorganizado foi conferido com Node.js 24 e MySQL 8.0.46-0ubuntu0.24.04.3. Os testes utilizaram um banco isolado com contas e pacientes fictícios.

| Conferência                                           | Resultado                               |
| ----------------------------------------------------- | --------------------------------------- |
| Testes automatizados de regras e proteção de arquivos | 21 passaram                             |
| Integração HTTP com MySQL real                        | 23 verificações passaram                |
| Páginas e navegação no Chromium                       | 28 verificações passaram                |
| Formatação por Prettier                               | Todos os arquivos aplicáveis conferidos |
| Preparação do banco repetida                          | Sem apagar registros existentes         |
| Layouts de computador e celular                       | Conferidos em 1365 px e 390 px          |
| Erros JavaScript nos fluxos de página testados        | Nenhum                                  |

## Integração preservada

- Backend responde e consulta SELECT 1.
- Painel e arquivos estáticos são servidos.
- Configurações, SQL e caminhos privados não são publicados.
- Sessão e dados exigem login.
- Senha inválida e tentativa SQL no login são recusadas.
- Login cria cookie HttpOnly e não devolve o hash.
- Sessão recuperada após novo pedido.
- Perfil próprio permitido e perfil diferente recusado.
- Perfil enfermagem não pode cadastrar, buscar ou abrir atendimento.
- Perfil medico não pode cadastrar, buscar ou abrir atendimento.
- Envio sem CSRF ou de outro site é bloqueado.
- JSON inválido é recusado.
- Campos inválidos não são gravados.
- Cadastro salva dados reais no MySQL.
- Repetir a mesma chave não duplica o cadastro.
- Chave reutilizada com outros dados e documento duplicado são conflitos.
- Busca por nome e documento recupera o paciente.
- Busca vazia, sem resultados e tentativa SQL são tratadas.
- Abertura vincula paciente, recepção e situação inicial.
- Repetição da abertura devolve o mesmo atendimento.
- Novo atendimento ativo e paciente inexistente são tratados.
- Aberturas simultâneas não geram dois atendimentos ativos.
- Logout invalida a sessão no servidor.

## Mudanças de caminhos

O teste adicional de arquivos públicos confere a nova raiz, o redirecionamento do índice antigo e o bloqueio de `.env`, SQL, código privado e tentativas de sair de `public/`. Os testes de navegador verificam a navegação dos rascunhos nas telas compartilhadas e a exportação da avaliação do grupo.

## Como repetir

Execute `npm install`, `npm test` e `npm run verificar:formatacao` na raiz. Os 21 testes incluídos não precisam de um MySQL ligado. Para testar o fluxo manual com banco, siga o README. As verificações adicionais de integração e navegador foram executadas durante a preparação; não fazem parte do comando `npm test`.

## Limitações

A conferência técnica não substitui o confronto com os requisitos completos e com o MER original, que não estavam disponíveis. A revisão da tarefa 20 continua dependendo da discussão do grupo. Triagem, consulta, medicações e encerramento continuam como desenhos, conforme o escopo das tarefas 11 a 25.

A versão final foi testada de ponta a ponta. Os checkpoints intermediários do histórico têm sintaxe JavaScript e imports locais conferidos; isso não representa um teste completo de todas as interfaces em cada commit.
