# Estrutura do projeto

Este documento descreve a organização da versão atual do Sistema de Atendimento e Triagem.

```text
.
├── database/
│   ├── mysql/                 # Estrutura e cargas SQL para MySQL
│   ├── oracle/                # Estrutura e cargas SQL para Oracle
│   └── *.sql                  # Scripts SQL de referência
├── docs/                      # Requisitos, modelo, guias e registros finais
├── public/
│   ├── assets/css/            # Estilos do painel e dos protótipos
│   ├── assets/js/             # Lógica do painel e das telas integradas
│   ├── design/                # Referência visual
│   ├── screens/               # Telas de desenho e telas funcionais complementares
│   ├── index.html             # Índice de telas
│   └── painel.html            # Painel integrado do fluxo de atendimento
├── scripts/                   # Configuração, preparação e teste dos bancos
├── src/
│   ├── atendimentos/          # Abertura, resumo e encerramento
│   ├── auth/                  # Sessões, senhas e permissões
│   ├── config/                # Configuração e adaptação Oracle/MySQL
│   ├── consultas/             # Registro de consultas médicas
│   ├── http/                  # Respostas HTTP e arquivos públicos
│   ├── medicacoes/            # Registro e consulta de medicações
│   ├── pacientes/             # Cadastro e busca
│   ├── triagens/              # Registro e filas de triagem
│   └── servidor.js            # Rotas e inicialização do backend
├── tests/                     # Testes automatizados Node.js
├── compose.yaml               # Perfis Docker separados para MySQL e Oracle
├── Dockerfile
├── package.json
└── README.md
```

## Responsabilidades principais

- **Interface:** `public/painel.html` e `public/assets/js/painel.js` integram login, recepção,
  enfermagem e o painel médico único, incluindo consultas, medicações, resumo e encerramento. A
  tela `public/screens/busca-atendimento.html` permite à recepção localizar atendimentos pelo número
  e CPF e excluir somente os que ainda aguardam triagem. As demais telas em `public/screens/` e
  `public/design/` servem como protótipos ou redirecionam para o painel funcional.
- **Backend:** `src/servidor.js` recebe as requisições e encaminha cada operação para o módulo de
  domínio correspondente. As regras de validação, autorização e persistência não dependem somente
  da interface.
- **Persistência:** `src/config/banco.js` seleciona MySQL ou Oracle por `DB_ENGINE` e adapta as
  consultas. Os bancos são independentes; a aplicação conecta a um motor por execução.
- **Banco de dados:** `database/mysql/` e `database/oracle/` contêm estruturas e cargas próprias de
  cada motor.
- **Execução local:** `compose.yaml` e `scripts/iniciar-docker.ps1` permitem iniciar a aplicação com
  um dos bancos. A configuração local com Node.js também está documentada nos guias de banco.
- **Testes:** `tests/` usa o executor nativo `node:test`. Testes com banco simulado não substituem a
  validação de uma instância real.

Consulte [GUIA_ARQUIVOS.md](GUIA_ARQUIVOS.md) para o inventário dos arquivos e
[VERIFICACAO.md](VERIFICACAO.md) para o escopo e as limitações dos testes.
