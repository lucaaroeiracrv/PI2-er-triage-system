# Banco MySQL para o PI2

Este guia oferece duas formas de usar MySQL no Windows: o caminho simples com Docker Compose e, como alternativa, a configuração manual com Docker Desktop e Ubuntu/WSL. Se você já tem um servidor MySQL, pule a criação do container e use os dados de conexão desse servidor.

O MySQL usa configuração e volume próprios, separados do Oracle. A aplicação conecta a apenas um banco por vez, selecionado com `DB_ENGINE`; não há sincronização entre eles.

## Caminho mais simples: Docker Compose

Se você só precisa executar o sistema no Windows, instale e inicie o Docker Desktop. Não precisa instalar Node.js, Ubuntu/WSL nem DBeaver para rodar o app. No PowerShell, abra a pasta do projeto e execute:

```powershell
.\scripts\iniciar-docker.ps1 -Banco mysql
```

O primeiro início baixa as imagens, gera senhas locais e inicia MySQL e aplicação. O banco é preparado automaticamente. Abra `http://127.0.0.1:3000`; para parar sem apagar dados:

```powershell
.\scripts\iniciar-docker.ps1 -Banco mysql -Parar
```

As senhas e portas estão em `.env.docker`. Use `MYSQL_APP_PASSWORD` no DBeaver, com host `127.0.0.1`, porta `3308` e database `PI2_APP`. A senha `MYSQL_ROOT_PASSWORD` é administrativa. Não apague `.env.docker` nem o volume `pi2-compose-mysql-data` se quiser reabrir o mesmo banco; se perder o arquivo de senhas, restaure-o antes de iniciar o volume existente.

O Compose usa um volume próprio `pi2-compose-mysql-data`, independente do container MySQL manual descrito abaixo. Para iniciar o Oracle, use `.\scripts\iniciar-docker.ps1 -Banco oracle`; os dois bancos não iniciam juntos.

## Configuração manual (Node.js local)

As etapas seguintes são uma alternativa para quem prefere instalar Node.js e gerenciar o banco manualmente.

## 1. Inicie o Docker

Abra o Docker Desktop e aguarde ficar pronto. Em **Settings > Resources > WSL Integration**, habilite a integração com sua distribuição Ubuntu. No Ubuntu, confirme:

```bash
docker version
```

## 2. Inicie o MySQL de desenvolvimento

O container abaixo publica o MySQL somente no loopback, na porta `3307`, e persiste os dados no volume `pi2-mysql-data`.

No Ubuntu, gere uma senha forte para o administrador MySQL, crie o container e guarde a senha impressa:

```bash
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
docker run -d \
  --name pi2-mysql \
  --restart unless-stopped \
  -p 127.0.0.1:3307:3306 \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  -e MYSQL_DATABASE=PI2_APP \
  -v pi2-mysql-data:/var/lib/mysql \
  mysql:8.4 &&
printf 'Guarde esta senha para DB_MYSQL_ADMIN_PASSWORD: %s\n' "$MYSQL_ROOT_PASSWORD"
unset MYSQL_ROOT_PASSWORD
```

Se `pi2-mysql` já existir, não crie outro container com o mesmo nome; inicie o existente:

```bash
docker start pi2-mysql
```

Aguarde o MySQL ficar pronto:

```bash
docker logs -f pi2-mysql
```

Quando aparecer `ready for connections`, pressione `Ctrl+C`. Isso encerra o acompanhamento do log, não o banco.

> Não remova o volume `pi2-mysql-data` se quiser conservar o banco. Alterar `MYSQL_ROOT_PASSWORD` ao iniciar um container já inicializado não redefine a senha guardada no volume.

## 3. Configure o `.env`

Na raiz do projeto, no PowerShell:

```powershell
npm install
npm run configurar
```

`npm run configurar` cria `.env` somente se ele ainda não existir. Ele gera `DB_PASSWORD`, que é a senha padrão da conexão Oracle; para este guia, preencha também as variáveis próprias do MySQL. Abra o `.env` no editor e ajuste:

```dotenv
DB_ENGINE=mysql
DB_NAME=PI2_APP
DB_MYSQL_HOST=127.0.0.1
DB_MYSQL_PORT=3307
DB_MYSQL_USER=PI2_APP
DB_MYSQL_PASSWORD=<senha_forte_nova_para_o_usuario_PI2_APP>
DB_MYSQL_ADMIN_USER=root
DB_MYSQL_ADMIN_PASSWORD=<senha_guardada_ao_criar_o_container>
DB_MYSQL_ACCOUNT_HOST=%
```

Gere uma senha forte para `DB_MYSQL_PASSWORD` separadamente da senha administrativa. No PowerShell, você pode gerar uma com:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`DB_MYSQL_ADMIN_PASSWORD` é a senha de `root` usada somente para criar a conta e conceder permissões. `DB_MYSQL_PASSWORD` é a senha da conta `PI2_APP`, usada pela aplicação e pelo DBeaver. `DB_MYSQL_ACCOUNT_HOST=%` permite a conexão pela porta encaminhada pelo Docker; use essa configuração somente nesse MySQL local publicado em `127.0.0.1`.

Não publique o `.env` nem compartilhe senhas. O arquivo é ignorado pelo Git.

## 4. Crie o usuário e prepare o schema

No PowerShell, na raiz do projeto:

```powershell
npm run criar:usuario:mysql
npm run preparar:mysql
npm run testar:mysql
```

- `criar:usuario:mysql` cria o banco `PI2_APP`, se necessário, cria a conta `PI2_APP` se ela ainda não existir e concede permissões no banco. Ele usa `DB_MYSQL_ADMIN_USER` e `DB_MYSQL_ADMIN_PASSWORD`.
- `preparar:mysql` cria as tabelas e índices e insere dados fictícios idempotentemente. A preparação preserva os registros existentes e renomeia as colunas antigas `triagens.enfermagem_id`/`registrada_em` para `enfermeiro_id`/`criado_em`, quando necessário, sem apagar os dados da triagem.
- `testar:mysql` confirma que o Node.js consegue conectar ao MySQL.

Se a conta `PI2_APP` já existia com outra senha, o script de criação não troca a senha existente. Use a senha cadastrada em `DB_MYSQL_PASSWORD` ou ajuste a conta de forma administrativa antes de iniciar a aplicação.

## 5. Teste o sistema no navegador

Com `DB_ENGINE=mysql` no `.env`, inicie o servidor:

```powershell
npm start
```

Abra `http://127.0.0.1:3000`, entre com `recepcao` e a senha inicial `Pi2@2026!`, cadastre um paciente fictício e pesquise-o. A senha de login do sistema é independente das senhas MySQL. O endpoint `http://127.0.0.1:3000/api/saude` informa o motor usado pelo servidor.

## 6. Confira os dados no DBeaver

Crie uma conexão MySQL com:

| Campo           | Valor                        |
| --------------- | ---------------------------- |
| Host            | `127.0.0.1`                  |
| Porta           | `3307`                       |
| Database/schema | `PI2_APP`                    |
| Usuário         | `PI2_APP`                    |
| Senha           | valor de `DB_MYSQL_PASSWORD` |

Teste a conexão e execute:

```sql
SELECT id, nome, data_nascimento, documento, telefone
FROM pacientes;
```

Use apenas dados fictícios nos testes. Confirme que o servidor está usando MySQL pelo endpoint de saúde antes de comparar os dados.

## 7. Limpe os dados de teste

O comando a seguir apaga os registros de `atendimentos`, `pacientes` e `usuarios` no MySQL selecionado, mas mantém as tabelas e o volume. Ele pede que você digite `RESETAR`:

```powershell
npm run resetar:mysql
```

Use somente em uma base de testes. Para recriar as contas e os dados de demonstração depois do reset, execute `npm run preparar:mysql` novamente.

## Problemas comuns

### A porta `3307` já está em uso

Confira no Docker Desktop ou no Ubuntu se outro container já publica essa porta. Se mudar a porta externa no comando Docker, atualize `DB_MYSQL_PORT` e a porta da conexão DBeaver para o mesmo valor.

### `Access denied`

Confira se a senha de administrador em `DB_MYSQL_ADMIN_PASSWORD` corresponde ao volume existente e se `DB_MYSQL_PASSWORD` corresponde à senha já cadastrada para `PI2_APP`. A senha do container e a da conta da aplicação são diferentes.

### O container existe, mas o banco não conecta

Inicie o container com `docker start pi2-mysql` e confira `docker logs --tail 50 pi2-mysql` no Ubuntu. Aguarde o log indicar `ready for connections` antes de testar.

### O sistema ainda está usando Oracle

Confira `DB_ENGINE=mysql` no `.env`, pare e reinicie o servidor. Consulte `/api/saude` para confirmar o motor ativo. Os comandos com `:mysql` selecionam o MySQL para a preparação e o teste, mas a interface web usa o motor configurado para `npm start`.
