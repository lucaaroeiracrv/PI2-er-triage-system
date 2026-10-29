# Organização contínua do PI2

Mostra a estrutura final do código

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

