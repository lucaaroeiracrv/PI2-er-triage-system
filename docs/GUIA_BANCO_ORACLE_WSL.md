# Banco Oracle com Docker no Ubuntu WSL

Este guia explica como iniciar o Oracle do projeto em um computador Windows usando Docker no Ubuntu pelo WSL. Siga os passos na ordem. Os comandos Docker deste guia devem ser executados no terminal **Ubuntu (WSL)**; os comandos `npm` devem ser executados na pasta do projeto.

## O que será instalado

- Imagem Oracle Free: `gvenzl/oracle-free:latest`.
- Nome do container: `pi2-oracle`.
- Porta: `1521`.
- Serviço Oracle: `FREEPDB1`.
- Usuário do projeto: `PI2_APP`.
- Volume persistente: `pi2-oracle-data`.

O volume guarda o banco mesmo quando o container é parado ou removido. **Não remova o volume** se quiser preservar seus dados.

## 1. Inicie o Docker no WSL

Abra o Ubuntu pelo menu Iniciar do Windows e confira se o Docker responde:

```bash
docker version
```

Se você usa **Docker Desktop**:

1. Abra o Docker Desktop no Windows e espere ele indicar que está em execução.
2. No Docker Desktop, abra **Settings > Resources > WSL Integration**.
3. Ative a integração para sua distribuição Ubuntu e selecione **Apply & restart**.
4. Volte ao terminal Ubuntu e execute `docker version` novamente.

Se você instalou o Docker Engine diretamente no Ubuntu, talvez precise iniciar o serviço:

```bash
sudo service docker start
sudo docker version
```

Se aparecer `permission denied` ao acessar `/var/run/docker.sock`, tente os comandos Docker com `sudo`, como nos exemplos do Docker Engine acima. No Docker Desktop integrado ao WSL, normalmente use `docker` sem `sudo`. Não altere as permissões do socket com `chmod`.

## 2. Crie o container Oracle

Escolha uma senha forte para as contas administrativas `SYS` e `SYSTEM`. Guarde-a: será necessária para criar o usuário da aplicação. Não reutilize uma senha importante de outro serviço.

No Ubuntu, gere uma senha aleatória para `SYS` e `SYSTEM` e guarde o valor que será mostrado ao final. Não reutilize uma senha importante de outro serviço:

```bash
ORACLE_ADMIN_PASSWORD=$(openssl rand -hex 24)
docker run -d \
  --name pi2-oracle \
  --restart unless-stopped \
  -p 127.0.0.1:1521:1521 \
  -e ORACLE_PASSWORD="$ORACLE_ADMIN_PASSWORD" \
  -v pi2-oracle-data:/opt/oracle/oradata \
  gvenzl/oracle-free:latest &&
printf 'Guarde esta senha para DB_ADMIN_PASSWORD: %s\n' "$ORACLE_ADMIN_PASSWORD"
unset ORACLE_ADMIN_PASSWORD
```

Copie a senha mostrada diretamente para o `.env` na etapa 4. Ela não fica guardada no histórico de comandos. O primeiro início pode demorar alguns minutos enquanto o banco é criado. A senha passada na primeira criação fica associada ao banco persistido no volume.

### Se o container já existir

Se o Docker avisar que o nome `pi2-oracle` já está em uso, não execute outro `docker run`. Inicie o container existente:

```bash
docker start pi2-oracle
```

Ao reutilizar um volume existente, mudar `ORACLE_PASSWORD` no comando não troca a senha já gravada no banco.

Se você esqueceu a senha administrativa de um container que já foi inicializado, redefina-a sem apagar o volume. No Ubuntu:

```bash
ORACLE_ADMIN_PASSWORD=$(openssl rand -hex 24)
docker exec pi2-oracle resetPassword "$ORACLE_ADMIN_PASSWORD" &&
printf 'Guarde esta senha para DB_ADMIN_PASSWORD: %s\n' "$ORACLE_ADMIN_PASSWORD"
unset ORACLE_ADMIN_PASSWORD
```

Só copie a senha exibida se o comando `resetPassword` terminar com sucesso. Atualize `DB_ADMIN_PASSWORD` no `.env` com esse valor. Essa operação redefine as senhas administrativas Oracle; não altera a senha `DB_PASSWORD` do usuário `PI2_APP`.

## 3. Aguarde o banco ficar pronto

Veja o estado do container:

```bash
docker ps --filter name=pi2-oracle
```

Veja as mensagens de inicialização:

```bash
docker logs --tail 50 pi2-oracle
```

Na primeira inicialização, aguarde no log a mensagem `DATABASE IS READY TO USE!`. Você também pode acompanhar o log continuamente com:

```bash
docker logs -f pi2-oracle
```

Para sair do acompanhamento, pressione `Ctrl+C`. Isso não para o banco.

## 4. Configure o projeto

Abra um terminal na pasta do projeto. Se o projeto está no Windows, use o PowerShell; se está dentro do Ubuntu, use o terminal Ubuntu. A pasta precisa conter `package.json`.

Confira se está usando Node.js 22 ou superior:

```text
node --version
```

Instale as dependências:

```text
npm install
```

Se ainda não existir um arquivo `.env` na raiz do projeto, crie-o:

```text
npm run configurar
```

Esse comando cria uma senha aleatória para o usuário da aplicação e não substitui um `.env` que já exista. Abra o `.env` em um editor. Preencha `DB_ADMIN_PASSWORD` com a senha `SYS`/`SYSTEM` guardada na etapa 2. Se o `.env` já existia e `DB_PASSWORD` estiver vazia, gere uma senha nova no PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie o valor gerado para `DB_PASSWORD`. Essa é uma senha diferente da administrativa. Para a configuração local padrão, o `.env` deve ter estes campos:

```dotenv
DB_ADMIN_USER=SYSTEM
DB_ADMIN_PASSWORD=<senha_SYS_SYSTEM_guardada_no_Ubuntu>
DB_HOST=127.0.0.1
DB_PORT=1521
DB_SERVICE_NAME=FREEPDB1
DB_USER=PI2_APP
DB_PASSWORD=<senha_aleatoria_gerada_para_PI2_APP>
```

Os valores entre `<...>` são indicações, não texto para copiar. Use a senha administrativa guardada no Ubuntu em `DB_ADMIN_PASSWORD` e uma senha gerada separadamente em `DB_PASSWORD`. Para conferir a senha da aplicação, abra o `.env`; ela também é usada pelo backend e pelo DBeaver. Não substitua uma senha pela outra.

O `.env` contém as senhas reais desta instalação e é ignorado pelo Git. Por isso, elas não são valores fixos deste guia: cada grupo cria suas próprias senhas ao instalar o Oracle e configurar o projeto. Não publique o `.env` nem copie suas senhas para arquivos versionados.

## 5. Crie o usuário e prepare as tabelas

Na raiz do projeto, execute:

```text
npm run criar:usuario
npm run preparar
npm run testar:conexao
```

- `criar:usuario` conecta como administrador e cria o usuário `PI2_APP`, ou atualiza as permissões dele. Ele precisa de `DB_ADMIN_PASSWORD` preenchida no `.env`.
- `preparar` cria as tabelas e índices do projeto, usuários de teste e dados de demonstração. Também insere uma carga genérica fictícia de 100 pacientes e 100 atendimentos. A carga pode ser repetida e preserva registros existentes.
- `testar:conexao` confirma que a aplicação consegue conectar ao Oracle.

Se todos terminarem sem erro, o banco está pronto. Para iniciar também o sistema web:

```text
npm start
```

Abra `http://127.0.0.1:3000` no navegador. Para entrar no sistema, use qualquer uma destas contas de teste:

| Usuário      | Senha de login |
| ------------ | -------------- |
| `recepcao`   | `Pi2@2026!`    |
| `enfermagem` | `Pi2@2026!`    |
| `medico`     | `Pi2@2026!`    |

Essa senha serve somente para entrar no sistema web. Ela não é a senha do Oracle, do DBeaver, de `SYSTEM` ou do usuário `PI2_APP`.

## 6. Conecte pelo DBeaver

No DBeaver, crie uma conexão Oracle e preencha:

| Campo           | Valor                            |
| --------------- | -------------------------------- |
| Host            | `127.0.0.1`                      |
| Porta           | `1521`                           |
| Tipo de conexão | `Service name`                   |
| Service name    | `FREEPDB1`                       |
| Usuário         | `PI2_APP`                        |
| Senha           | valor de `DB_PASSWORD` no `.env` |

Clique em **Test Connection** e depois em **Finish**. Use `PI2_APP` para ver e manipular as tabelas da aplicação. A senha administrativa `SYSTEM` é diferente e não é necessária para o uso normal do DBeaver.

Para inspecionar os objetos da aplicação, confirme que o editor SQL está conectado à conexão Oracle `FREEPDB1` (não ao banco de exemplo SQLite do DBeaver) e execute:

```sql
SELECT object_name, object_type, status
FROM user_objects
WHERE object_name = 'USUARIOS';
```

Para verificar um paciente fictício cadastrado pela tela:

```sql
SELECT id, nome, data_nascimento, documento, telefone
FROM pacientes
WHERE documento = 'DOCUMENTO_FICTICIO_USADO_NO_CADASTRO';
```

Use somente dados fictícios nos testes. Não compartilhe o `.env`, senhas ou informações de pacientes.

Quando o app, Docker e DBeaver estão em ambientes diferentes, use `127.0.0.1` primeiro: o Docker está publicando a porta somente no loopback do WSL, e o WSL2 normalmente encaminha essa conexão para o Windows. Se o encaminhamento não estiver disponível, execute o app e o DBeaver no mesmo ambiente em que o Docker está rodando ou peça ajuda para configurar a rede do WSL; não publique a porta em todas as interfaces sem necessidade.

## 7. Parar, iniciar e preservar o banco

No Ubuntu:

```bash
docker stop pi2-oracle
docker start pi2-oracle
docker logs --tail 50 pi2-oracle
```

Parar o container não apaga os dados. O container também reinicia automaticamente quando o Docker inicia, por causa de `--restart unless-stopped`.

**Não execute `docker volume rm pi2-oracle-data`** se quiser manter o banco: remover esse volume apaga os dados persistidos.

## 8. Limpar os registros de teste

O comando abaixo pede a confirmação digitando `RESETAR`. Ele apaga todos os registros das tabelas `atendimentos`, `pacientes` e `usuarios`, mas mantém as tabelas, índices, o usuário/schema Oracle `PI2_APP` e o volume Docker. Use-o somente no banco local de testes:

```text
npm run resetar:banco
```

Digite `RESETAR` no prompt para confirmar. A operação é transacional e pode ser cancelada antes de confirmar. Depois do reset, não haverá contas para entrar no sistema. Para recriar os usuários de teste e também os dados de demonstração, execute `npm run preparar` novamente. Não execute esse comando em uma base com dados que queira preservar.

Para selecionar o Oracle explicitamente, use `npm run resetar:oracle`. Para uma base MySQL selecionada explicitamente, use `npm run resetar:mysql`.

## 9. Testar MySQL sem alterar o Oracle

O projeto também tem um caminho de teste MySQL em um container separado. Ele usa a porta externa `3307` e o volume `pi2-mysql-data`; assim, não reutiliza nem apaga o container ou volume Oracle. Execute os comandos Docker no Ubuntu (WSL).

Gere uma senha forte para o administrador MySQL, inicie o container e guarde a senha exibida:

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

Se o container `pi2-mysql` já existir, não repita `docker run`; use `docker start pi2-mysql`. Aguarde até o MySQL ficar pronto:

```bash
docker logs -f pi2-mysql
```

Quando o log mostrar `ready for connections`, pressione `Ctrl+C` (isso não para o banco). No `.env` do projeto, preencha os campos específicos do MySQL sem alterar as credenciais Oracle:

```dotenv
DB_MYSQL_HOST=127.0.0.1
DB_MYSQL_PORT=3307
DB_MYSQL_USER=PI2_APP
DB_MYSQL_PASSWORD=<senha_forte_nova_para_o_usuario_PI2_APP>
DB_MYSQL_ADMIN_USER=root
DB_MYSQL_ADMIN_PASSWORD=<senha_guardada_na_etapa_do_container_MySQL>
DB_MYSQL_ACCOUNT_HOST=%
DB_NAME=PI2_APP
```

Gere `DB_MYSQL_PASSWORD` separadamente com o comando PowerShell mostrado na etapa 4. `DB_MYSQL_ACCOUNT_HOST=%` permite que o app local se conecte pela porta encaminhada pelo Docker; use somente com o MySQL de desenvolvimento exposto no loopback `127.0.0.1`. No PowerShell, na raiz do projeto, prepare e teste o banco MySQL:

```powershell
npm run criar:usuario:mysql
npm run preparar:mysql
npm run testar:mysql
```

Esses comandos selecionam MySQL sem mudar `DB_ENGINE=oracle` no `.env`. Para testar a interface web com MySQL, pare o servidor, altere temporariamente `DB_ENGINE=mysql` no `.env`, execute `npm start` e abra `http://127.0.0.1:3000`. Faça login com `recepcao` e `Pi2@2026!`; cadastros feitos nesse modo vão para MySQL. Para voltar ao Oracle, pare o servidor e restaure `DB_ENGINE=oracle`.

No DBeaver, crie uma conexão MySQL com host `127.0.0.1`, porta `3307`, schema `PI2_APP`, usuário `PI2_APP` e a senha em `DB_MYSQL_PASSWORD`. Para verificar os pacientes:

```sql
SELECT id, nome, data_nascimento, documento, telefone
FROM pacientes;
```

O banco MySQL é independente do Oracle. `npm run resetar:mysql` limpa seus atendimentos, pacientes e usuários de teste com a mesma confirmação explícita, mantendo o schema. Guarde o volume `pi2-mysql-data` se quiser conservar esse banco.

## Problemas comuns

### `permission denied while trying to connect to the Docker API`

Inicie o Docker Desktop e confira a integração WSL. Se o Docker Engine foi instalado dentro do Ubuntu, tente `sudo docker version` e use `sudo` nos comandos Docker. Não altere as permissões de `/var/run/docker.sock`.

### `Conflict. The container name "/pi2-oracle" is already in use`

O container já existe. Use `docker start pi2-oracle` no Ubuntu; não crie outro container com o mesmo nome.

### O banco ainda não está pronto

Consulte `docker logs --tail 50 pi2-oracle` e aguarde a mensagem de pronto. Na primeira inicialização, isso pode levar alguns minutos.

### Porta `1521` ocupada

Outro serviço já está usando a porta. Confira `docker ps` no Ubuntu antes de alterar qualquer container. Se precisar usar outra porta, a porta externa publicada pelo Docker e `DB_PORT` no `.env` devem ser iguais; no DBeaver, informe essa mesma porta. Não pare containers que você não reconhece.

### `ORA-01017` ou falha de autenticação

Confira usuário e senha. `DB_ADMIN_PASSWORD` é a senha administrativa usada por `criar:usuario`; `DB_PASSWORD` é a senha do usuário `PI2_APP`, usada pelo app e pelo DBeaver. Verifique também `DB_HOST`, `DB_PORT` e `DB_SERVICE_NAME`.

Se o Oracle já foi inicializado com um volume existente, a senha administrativa persistida pode ser diferente da senha digitada em uma execução posterior do `docker run`. Nesse caso, use a senha administrativa original no `.env`.

Se você esqueceu a senha de login do sistema web, as contas de teste são criadas com `Pi2@2026!` quando o banco é preparado. Isso não altera nem recupera as senhas do Oracle.

### `ORA-01031` ao preparar o banco

Execute primeiro `npm run criar:usuario` com `DB_ADMIN_USER=SYSTEM` e a senha correta em `DB_ADMIN_PASSWORD`. Depois execute `npm run preparar` novamente.
