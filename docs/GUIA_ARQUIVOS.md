# Guia de arquivos

Inventário da versão atual do repositório. As telas visuais que não aparecem ligadas às rotas ou à
API são protótipos e não devem ser interpretadas como operações funcionais.

## Raiz

- `.dockerignore`: arquivos excluídos do contexto de build Docker.
- `.editorconfig`, `.gitattributes`, `.gitignore`: convenções de edição, normalização e exclusões
  do Git.
- `.env.example`: modelo de variáveis locais; não contém credenciais válidas.
- `.prettierignore`, `.prettierrc.json`: configuração de formatação.
- `Dockerfile`, `compose.yaml`: imagem da aplicação e serviços com perfis separados para MySQL e
  Oracle.
- `package.json`, `package-lock.json`: dependências, requisitos de Node.js e comandos npm.
- `README.md`: apresentação, instalação, uso, teste e links de documentação.

## Banco de dados: `database/`

- `mysql/estrutura.sql`, `mysql/dados-teste.sql`, `mysql/carga-generica.sql`: schema e dados
  fictícios MySQL.
- `oracle/estrutura.sql`, `oracle/dados-teste.sql`, `oracle/carga-generica.sql`: schema e dados
  fictícios Oracle.
- `estrutura.sql`, `dados-teste.sql`, `carga-generica.sql`: scripts SQL de referência mantidos na
  raiz da pasta.

## Documentação: `docs/`

- `ESTRUTURA.md`: organização atual do código.
- `FLUXO_ESPERADO.md`: fluxo atualmente implementado, estados e limites.
- `GUIA_ARQUIVOS.md`: este inventário.
- `GUIA_BANCO_MYSQL.md`, `GUIA_BANCO_ORACLE_WSL.md`: instalação e execução dos bancos.
- `MER.md`: entidades, relacionamentos e regras de persistência.
- `REQUISITOS.md`: requisitos funcionais e não funcionais da versão.
- `VERIFICACAO.md`: comandos, cobertura e limites de validação.
- `campos.json`: mapa das entradas, origem, validação e persistência.
- `CONCLUSAO_FINAL.md`, `CRONOGRAMA.md`: síntese de aprendizados e cronograma executado.

## Interface: `public/`

- `index.html`: índice das páginas de referência.
- `painel.html`: painel integrado de login, recepção, triagem e atendimento médico.
- `assets/css/painel.css`: estilo do painel funcional.
- `assets/css/tema.css`: tema comum das telas de protótipo.
- `assets/js/api.js`: operações POST da interface, sessão/CSRF e máscaras/validações compartilhadas.
- `assets/js/painel.js`: interação do painel com as APIs de recepção, enfermagem e médico.
- `assets/js/busca-atendimento.js`: busca composta por número e CPF e exclusão autorizada de
  atendimentos ainda sem registros clínicos.
- `assets/js/cadastro.js`: interação da tela de cadastro específica.
- `assets/js/prototipos.js`, `rascunhos.js`, `revisao.js`: modo de protótipo, visualização de
  rascunhos e exportação local da revisão.
- `design/padrao-visual.html`: guia visual.
- `screens/medicacoes.html`, `screens/resumo-encerramento.html`, `screens/medico.html`: rotas
  legadas redirecionadas ao painel médico unificado.
- `screens/cadastro.html`, `busca-atendimento.html`, `campos.html`, `triagem.html`,
  `triagem-form.html`, `medicacoes-encerramento.html`, `rascunhos.html`, `revisao.html`: telas de
  desenho, apoio ou revisão; a presença de formulário não implica persistência por si só.

## Scripts: `scripts/`

- `configurar-env.js`: prepara `.env` local sem substituir arquivo existente.
- `criar-usuario-mysql.js`, `criar-usuario-oracle.js`: criam/configuram a conta do banco.
- `iniciar-docker.ps1`: inicializa ou para a aplicação com um dos bancos no Windows.
- `preparar-banco.js`: cria os objetos que faltam, aplica as cargas fictícias e prepara usuários de
  demonstração.
- `resetar-banco.js`: remove dados das tabelas de teste após confirmação explícita.
- `testar-conexao.js`: verifica a conexão com o motor selecionado.
- `usuarios-teste.js`: cria os perfis de demonstração.

## Backend: `src/`

- `servidor.js`: servidor HTTP, rotas da API, autorização e inicialização.
- `config/banco.js`: conexão, pool e adaptação de SQL Oracle/MySQL.
- `http/arquivos.js`, `http/respostas.js`: publicação restrita de arquivos e respostas/validações
  HTTP.
- `auth/autenticacao.js`, `permissoes.js`, `senhas.js`: sessão, controle de perfil e hash de senha.
- `pacientes/cadastro.js`, `pacientes/busca.js`: cadastro e busca de pacientes.
- `atendimentos/abertura.js`, `resumo.js`, `finalizacao.js`: ciclo do atendimento.
- `triagens/cadastro.js`: gravação da triagem e filas de atendimento.
- `consultas/registro.js`: validação de vínculos e gravação de consultas.
- `medicacoes/registro.js`: validação, gravação e consulta de medicações.

## Testes: `tests/`

- `api.test.js`, `arquivos.test.js`, `banco.test.js`: API compartilhada da interface, publicação de
  arquivos e configuração dos bancos.
- `pacientes.test.js`, `senhas.test.js`, `permissoes.test.js`: validações de pacientes, senha e
  autorização.
- `triagens.test.js`, `triagens-api.test.js`: triagem, filas e fluxo HTTP.
- `consultas.test.js`, `medicacoes.test.js`, `finalizacao.test.js`: consulta, medicação e
  encerramento.

Para executar os testes, use `npm test`. Eles não substituem a verificação de integração com cada
banco real. Consulte [VERIFICACAO.md](VERIFICACAO.md).
