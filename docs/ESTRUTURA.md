# Organização contínua do PI2

Mostra a estrutura final do código

## Estrutura final

- `PI2/`
  - `compose.yaml`, `Dockerfile` e `.dockerignore`: execução local em containers.
  - `src/`
    - `config/banco.js`: seleção do motor e configuração dos pools Oracle/MySQL.
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
  - `database/`: schemas Oracle e MySQL, além de dados fictícios.
  - `scripts/`: configuração local, preparação/reset dos bancos, usuários fictícios e testes de conexão.
    - `iniciar-docker.ps1`: escolhe o banco e inicia ou para os serviços Compose no Windows.
  - `tests/`: testes de arquivos públicos, configuração de bancos, senhas, permissões e cadastro.
  - `docs/`: materiais numerados, histórico, campos e verificações.
  - `README.md`, `package.json`, `package-lock.json` e configurações de edição.
  - `.git/`: histórico local incluído no ZIP.
