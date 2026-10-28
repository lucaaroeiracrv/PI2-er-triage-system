# Organização contínua do PI2

O pacote anterior agrupava código por tarefa. A nova estrutura usa a responsabilidade de cada arquivo, permitindo que o Git mostre a evolução do mesmo código sem manter cópias para cada etapa.

## Estrutura final

- `PI2/`
  - `src/`
    - `config/banco.js`: configuração e pool MySQL.
    - `http/arquivos.js` e `http/respostas.js`: arquivos públicos, respostas, corpo JSON e erros.
    - `auth/`: autenticação, senhas e permissões.
    - `pacientes/`: cadastro e busca.
    - `atendimentos/abertura.js`: abertura e transação.
    - `servidor.js`: entrada e encaminhamento das operações.
  - `public/`
    - `index.html`: índice das páginas de apresentação.
    - `painel.html`: painel funcional de teste.
    - `assets/css/`: tema e estilo do painel.
    - `assets/js/`: protótipos, rascunhos, revisão e painel.
    - `design/padrao-visual.html`: cores, fontes e componentes.
    - `screens/`: cadastro, triagem, médico, medicações e encerramento, rascunhos, campos e revisão.
  - `database/`: estrutura SQL proposta e carga fictícia.
  - `scripts/`: configuração local, preparação do banco, usuários fictícios e teste de conexão.
  - `tests/`: testes de arquivos públicos, senhas, permissões e cadastro.
  - `docs/`: materiais numerados, histórico, campos e verificações.
  - `README.md`, `package.json`, `package-lock.json` e configurações de edição.
  - `.git/`: histórico local incluído no ZIP.

## Caminhos de código que mudaram

| Caminho anterior                                       | Caminho atual                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `tarefa_15_backend/configuracao.js`                    | `src/config/banco.js`                                                                           |
| `tarefa_15_backend/http.js`                            | `src/http/respostas.js`                                                                         |
| `tarefa_15_backend/criar_env.js`                       | `scripts/configurar-env.js`                                                                     |
| `tarefa_15_backend/testar_conexao.js`                  | `scripts/testar-conexao.js`                                                                     |
| `tarefa_21_login/login.js`                             | `src/auth/autenticacao.js`                                                                      |
| `tarefa_21_login/senhas.js`                            | `src/auth/senhas.js`                                                                            |
| `tarefa_21_login/usuarios_teste.js`                    | `scripts/usuarios-teste.js`                                                                     |
| `tarefa_22_perfis/permissoes.js`                       | `src/auth/permissoes.js`                                                                        |
| `tarefa_23_cadastro_paciente/cadastro.js`              | `src/pacientes/cadastro.js`                                                                     |
| `tarefa_24_busca_paciente/busca.js`                    | `src/pacientes/busca.js`                                                                        |
| `tarefa_25_abertura_atendimento/atendimento.js`        | `src/atendimentos/abertura.js`                                                                  |
| `_comum/tema.css`                                      | `public/assets/css/tema.css`                                                                    |
| `_comum/prototipos.js`                                 | `public/assets/js/prototipos.js`, `rascunhos.js` e `revisao.js`, separados por responsabilidade |
| `tarefa_15_backend/public/`                            | `public/painel.html` e os arquivos funcionais em `public/assets/`                               |
| `tarefa_16_desenho_cadastro/index.html`                | `public/screens/cadastro.html`                                                                  |
| `tarefa_17_desenho_triagem/index.html`                 | `public/screens/triagem.html`                                                                   |
| `tarefa_18_desenho_medico/index.html`                  | `public/screens/medico.html`                                                                    |
| `tarefa_19_desenho_medicacoes_encerramento/index.html` | `public/screens/medicacoes-encerramento.html`                                                   |
| `apoio_banco/estrutura_exemplo.sql`                    | `database/estrutura.sql`                                                                        |
| `tarefa_14_dados_ficticios/dados_teste.sql`            | `database/dados-teste.sql`                                                                      |
| `ABRIR_PRIMEIRO.html`                                  | `public/index.html`; o servidor redireciona o endereço antigo do índice                         |
| `COMECE_AQUI.md` e READMEs das tarefas                 | `README.md` e os materiais em `docs/`                                                           |

## O que foi consolidado

Os rascunhos deixaram de ter suas próprias cópias dos formulários. Eles carregam os mesmos arquivos de cadastro, triagem e médico com `?modo=rascunho`. As tarefas 16, 17 e 18 refinam os arquivos criados na tarefa 11.

O JavaScript comum foi separado apenas quando havia responsabilidades diferentes: os desenhos explicam os botões, a navegação muda o rascunho, a revisão exporta a avaliação e o painel conversa com o backend. Não são versões numeradas do mesmo código.

O painel funcional de teste e os desenhos foram mantidos porque têm propósitos diferentes: o primeiro grava e consulta o banco; os outros representam as telas previstas para as próximas implementações. Nenhuma triagem ou medicação fictícia passou a ser apresentada como salvamento real.

## O que foi preservado

Foram preservados os três perfis, as validações, a sessão em memória, o hash de senhas, as consultas parametrizadas, os dados fictícios e a prevenção de repetições no cadastro e na abertura de atendimento. O esquema de três tabelas não ganhou novas funções. As senhas reais do ambiente não fazem parte do ZIP nem do histórico.

## Commits e desenvolvimento contínuo

As quinze etapas usam os números e títulos das tarefas existentes. Cada commit modifica os arquivos necessários para aquela etapa; por exemplo, `src/servidor.js` e `public/assets/js/painel.js` continuam mudando do login até a abertura de atendimento.

O pacote original não tinha histórico Git. Estes são commits locais da reorganização atual, sem datas retroativas e sem atribuir autoria aos integrantes. A sequência e o conteúdo agrupado estão em `HISTORICO.md`. O comando `git show --stat <hash>` apresenta os arquivos de uma etapa.

Para publicar preservando o histórico, mantenha `.git`, configure o remoto escolhido e envie a branch `main` pelo Git. O envio de arquivos pela interface web não conserva os commits locais. Nenhum repositório remoto foi criado ou alterado durante este trabalho.
