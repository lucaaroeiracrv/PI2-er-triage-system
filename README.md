# PI2 Sistema de atendimento

Projeto integrador com Node.js, Oracle Database ou MySQL, HTML, CSS e JavaScript. O código é organizado por função e atualizado no mesmo lugar. O histórico identifica as tarefas; não há uma pasta de código por tarefa.

## Abrir as telas

Para usar as telas integradas ao backend, inicie o servidor conforme a seção abaixo e abra http://127.0.0.1:3000. Não abra os arquivos HTML diretamente (`file://`): as chamadas `/api/...` precisam ser feitas pela mesma origem HTTP do servidor. Entre como `recepcao` no painel e depois acesse a busca de pacientes. Os rascunhos usam as mesmas telas de `public/screens/` com o parâmetro `?modo=rascunho`. O padrão visual compartilhado fica em `public/assets/css/tema.css`.

## Estrutura

- `public/`: páginas que podem ser abertas no navegador.
  - `assets/css/` e `assets/js/`: estilos e comportamentos por função.
  - `design/`: guia de cores, fontes e componentes.
  - `screens/`: desenhos das telas e revisão do grupo.
- `src/`: backend, separado em configuração, HTTP, autenticação, pacientes e atendimentos conforme essas partes entram no projeto.
- `scripts/`: comandos de configuração e preparação do ambiente.
- `database/`: estrutura de exemplo e dados fictícios.
- `docs/`: guias de Oracle e MySQL, descrição da estrutura, verificação e mapa dos campos.
- `tests/`: testes automatizados das regras já implementadas.

As pastas aparecem quando recebem conteúdo. Arquivos JSON não têm comentários porque o formato não aceita essa sintaxe; suas opções são explicadas na documentação.

## Comentários e formatação

Os comentários em português explicam imports, variáveis, funções, condições, repetições e regras de banco e de acesso. Chaves de fechamento e linhas vazias não recebem comentários artificiais. A indentação é de dois espaços, com UTF-8 e quebras LF.

Depois de `npm install`, execute `npm run verificar:formatacao` para conferir o padrão ou `npm run formatar` para aplicá-lo. SQL usa comentários `--` e o mesmo recuo; JSON continua sendo JSON válido.

## Limites do material

O escopo segue as tarefas 11 a 25 do PI2. O texto individual dos requisitos e o MER original não estavam disponíveis: os campos e o banco são propostas a comparar com os documentos do grupo. A aprovação da revisão das telas depende dos integrantes. Os perfis continuam sendo recepção, enfermagem e médico.

## Executar o backend

O jeito mais simples em Windows é instalar e iniciar o Docker Desktop e, no PowerShell, na pasta do projeto, executar:

```powershell
.\scripts\iniciar-docker.ps1
```

Escolha MySQL ou Oracle. O primeiro uso baixa as imagens, gera senhas locais em `.env.docker`, prepara o banco e inicia a aplicação. Não é necessário instalar Node.js, Ubuntu/WSL ou DBeaver para executar o sistema por esse caminho. Abra http://127.0.0.1:3000. O DBeaver é opcional para consultar o banco; as portas e credenciais locais estão em `.env.docker`.

### Se você tem Docker Engine, mas não Docker Desktop

Ter apenas o comando `docker` instalado não basta: também é necessário que um **Docker Engine (daemon)** esteja ativo e que o plugin **Docker Compose** esteja instalado. No Windows, uma opção é instalar/iniciar o Docker Engine dentro do Ubuntu/WSL e executar os comandos Compose pelo terminal Ubuntu, na pasta do projeto. Docker Desktop não é obrigatório, mas é o caminho mais simples no Windows.

No Ubuntu/WSL, crie o arquivo local de credenciais (uma vez por computador) e restrinja sua leitura:

```bash
cd /caminho/para/PI2-er-triage-system
umask 077
{
  printf 'MYSQL_ROOT_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'MYSQL_APP_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'ORACLE_ADMIN_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'ORACLE_APP_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'MYSQL_PORT=3308\nORACLE_PORT=1522\nAPP_PORT=3000\n'
} > .env.docker
```

Mantenha `.env.docker` privado e não o apague enquanto quiser preservar e reabrir os bancos existentes. Depois, inicie somente o banco escolhido:

```bash
docker compose --env-file .env.docker --profile mysql up --build -d
# ou, em vez de MySQL:
docker compose --env-file .env.docker --profile oracle up --build -d
```

Abra `http://localhost:3000`. Para parar os serviços sem apagar o banco, use o mesmo perfil com `down` (não acrescente `-v`):

```bash
docker compose --env-file .env.docker --profile mysql down
```

Se o projeto estiver na unidade Windows, o caminho costuma aparecer no Ubuntu como `/mnt/d/...`; adapte o `cd` para a pasta onde você clonou ou extraiu o repositório. O Docker CLI deve estar configurado para falar com o daemon desse Ubuntu/WSL. Se o navegador do Windows não alcançar `localhost:3000`, confira o encaminhamento de portas do WSL; não exponha as portas em todas as interfaces sem necessidade.

Para parar os serviços sem apagar o banco:

```powershell
.\scripts\iniciar-docker.ps1 -Banco mysql -Parar
```

Substitua `mysql` por `oracle` se escolheu Oracle. Não apague `.env.docker`: ele guarda as senhas dos volumes locais. Os dados ficam somente no computador de cada integrante.

Esse fluxo Docker Compose inicia um banco por vez e usa volumes próprios, separados dos containers manuais descritos nos outros guias. Para desenvolvimento com Node.js instalado no computador ou para instruções detalhadas do DBeaver, consulte o [Guia Oracle no WSL](docs/GUIA_BANCO_ORACLE_WSL.md) ou o [Guia MySQL](docs/GUIA_BANCO_MYSQL.md).

Os comandos de preparação inserem dados fictícios idempotentemente e preservam os registros existentes; o reset manual apaga registros de aplicação e exige confirmação.

O schema Oracle padrão e o banco MySQL padrão chamam-se `PI2_APP`. Compare a proposta com o MER oficial antes de usá-la no banco do grupo. O `.env` contém credenciais locais e não deve ser versionado.

## Login e testes

Os usuários fictícios `recepcao`, `enfermagem` e `medico` são criados com a senha inicial `Pi2@2026!`. Essa senha de login é independente das senhas administrativas e de conexão do banco. A preparação preserva contas existentes. As senhas são guardadas como hash scrypt e a sessão fica em memória; ao reiniciar o servidor, entre novamente.

Execute `npm test` para os testes automatizados e `npm run verificar:formatacao` para conferir a formatação. Consulte `docs/VERIFICACAO.md` para os resultados registrados e suas limitações.

## Testar o fluxo disponível

Entre como `recepcao`, busque `DEMO-002` e abra um atendimento. Cadastre também um paciente fictício novo e busque seu registro. O atendimento é salvo como `aguardando_triagem`, com a identidade do usuário conectado. `DEMO-001` já possui um atendimento em aberto para testar a mensagem de conflito.

Os outros perfis entram em suas próprias áreas, mas não executam as funções da recepção. O salvamento de triagem, consulta, medicações e encerramento pertence às tarefas seguintes; seus desenhos foram preservados.

As mensagens dos commits seguem `tipo(escopo): descrição (tarefa N)`. `feat` identifica funcionalidades, `docs` documentação e `chore` preparação técnica. Use `fix` quando houver uma correção de defeito; não é necessário usar todos os tipos em toda sequência.
