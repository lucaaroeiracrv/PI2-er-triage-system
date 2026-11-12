<div align="center">

# PI2 - Sistema de Atendimento e Triagem

Projeto acadêmico integrador de desenvolvimento web e banco de dados

[![Projeto acadêmico](https://img.shields.io/badge/Status-Acad%C3%AAmico-6B46C1)](https://github.com/lucaaroeiracrv/PI2-er-triage-system)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/Frontend-JavaScript-F7DF1E)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![MySQL](https://img.shields.io/badge/DB-MySQL-4479A1)](https://www.mysql.com/)
[![Oracle](https://img.shields.io/badge/DB-Oracle-F80000)](https://www.oracle.com/database/)
[![Status](https://img.shields.io/badge/Status-Em%20desenvolvimento-1F6FEB)](https://github.com/lucaaroeiracrv/PI2-er-triage-system)


</div>

---

## Sobre o projeto

O Sistema de Atendimento e Triagem é um projeto integrador desenvolvido no contexto acadêmico do PI2. A proposta é construir uma aplicação web que reúna etapas iniciais de atendimento a pacientes e permita estudar, na prática, conceitos de desenvolvimento de software, autenticação, persistência de dados e organização de sistemas.

A aplicação utiliza Node.js no backend, HTML, CSS e JavaScript na interface, e oferece suporte a MySQL e Oracle Database. O sistema e os dados de exemplo são destinados a demonstração e desenvolvimento acadêmico, não a uso clínico ou produção.

### Objetivos de aprendizagem

- Organizar uma aplicação web em módulos com responsabilidades distintas.
- Integrar uma interface web a uma API e a um banco de dados relacional.
- Implementar autenticação e permissões por perfil.
- Comparar configurações de acesso a MySQL e Oracle.
- Registrar testes, decisões técnicas e limitações do projeto.

## Escopo implementado

O estado atual do sistema inclui:

- Autenticação com perfis fictícios de recepção, enfermagem e médico.
- Cadastro e busca de pacientes.
- Abertura de atendimento pela recepção.
- Persistência do atendimento com status inicial de espera pela triagem.
- Configuração do backend para MySQL ou Oracle.
- Testes automatizados para partes já implementadas.

> Importante: triagem, consulta médica, medicações e encerramento aparecem como telas ou protótipos, mas ainda não estão implementados como fluxos funcionais completos. Consulte o arquivo [docs/VERIFICACAO.md](docs/VERIFICACAO.md) para detalhes das verificações e limitações.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Interface | HTML, CSS e JavaScript |
| Backend | Node.js |
| Bancos de dados | MySQL e Oracle Database |
| Execução local | Docker e Docker Compose |
| Testes | Node.js Test Runner |
| Formatação | Prettier |

## Como executar

### Opção recomendada: Docker no Windows

Instale e inicie o Docker Desktop. No PowerShell, na pasta do projeto, execute:

```powershell
.\scripts\iniciar-docker.ps1
```

Escolha o banco (`mysql` ou `oracle`) quando solicitado. No primeiro uso, o script prepara as credenciais locais, inicia o banco e sobe a aplicação. Depois, acesse:

**http://localhost:3000**

### Docker Compose manual

Com Docker Engine e Docker Compose instalados e ativos, crie o arquivo local `.env.docker` conforme as instruções do script `scripts/iniciar-docker.ps1`. Em seguida, inicie um banco por vez:

```bash
docker compose --env-file .env.docker --profile mysql up --build -d
```

Ou, para Oracle:

```bash
docker compose --env-file .env.docker --profile oracle up --build -d
```

Para parar os serviços sem remover os dados persistidos:

```bash
docker compose --env-file .env.docker --profile mysql down
```

Troque `mysql` por `oracle` se estiver usando Oracle. Não acrescente `-v` ao comando `down` se quiser preservar os dados locais. Mantenha `.env.docker` privado: ele contém credenciais locais.

### Execução com Node.js instalado

É possível executar o backend sem usar a imagem da aplicação. Esse fluxo exige Node.js 22 ou superior, um banco configurado e as variáveis de ambiente corretas. Consulte os guias de banco em `docs/` antes de iniciar.

```bash
npm install
npm test
npm start
```

A interface deve ser acessada pelo servidor em **http://127.0.0.1:3000**. Não abra os arquivos HTML diretamente com `file://`, pois as chamadas à API precisam do backend.

## Testes e formatação

Execute os testes automatizados:

```bash
npm test
```

Confira a formatação:

```bash
npm run verificar:formatacao
```

Para aplicar a formatação:

```bash
npm run formatar
```

Os testes automatizados não substituem a validação de conexão com uma instância local de MySQL ou Oracle. Consulte o arquivo [docs/VERIFICACAO.md](docs/VERIFICACAO.md) para o registro das verificações e suas limitações.

## Acesso de demonstração

O projeto cria usuários fictícios para os perfis:

| Usuário | Perfil |
|---|---|
| `recepcao` | Recepção |
| `enfermagem` | Enfermagem |
| `medico` | Médico |

**Senha inicial:** `Pi2@2026!`

Essas contas são apenas para demonstração local. Altere ou substitua as credenciais antes de qualquer uso fora do ambiente acadêmico. Não utilize dados reais de pacientes.

## Organização do repositório

```text
.
├── database/     # Schemas e dados fictícios para MySQL e Oracle
├── docs/         # Guias técnicos, estrutura e resultados de verificação
├── public/       # Interface web, estilos, scripts e telas
├── scripts/      # Configuração e preparação do ambiente e dos bancos
├── src/          # Backend: autenticação, pacientes, atendimentos e HTTP
├── tests/        # Testes automatizados
├── compose.yaml  # Serviços Docker e perfis de banco
├── Dockerfile
└── README.md
```

## Documentação

- [Organização do projeto](docs/ESTRUTURA.md)
- [Guia de arquivos](docs/GUIA_ARQUIVOS.md)
- [Guia do MySQL](docs/GUIA_BANCO_MYSQL.md)
- [Guia do Oracle no WSL](docs/GUIA_BANCO_ORACLE_WSL.md)
- [Verificações e limitações](docs/VERIFICACAO.md)

## Considerações acadêmicas e limitações

Este projeto tem finalidade educacional. Os schemas, campos e fluxos devem ser comparados com os requisitos e o MER oficial da disciplina; não devem ser considerados uma especificação clínica validada.

- Os registros utilizados para demonstração são fictícios.
- A aplicação não deve ser usada para atendimento real nem para armazenar dados pessoais ou clínicos reais.
- Os protótipos de algumas etapas não representam funcionalidades concluídas.
- A execução local não equivale a uma implantação segura para produção.

---

<div align="center">

**Projeto Integrador II · Sistema de Atendimento e Triagem**

Desenvolvido para fins acadêmicos.

</div>
