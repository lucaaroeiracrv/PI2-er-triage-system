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

No Ubuntu, digite o comando abaixo. A senha será solicitada sem aparecer na tela:

```bash
read -rsp "Senha forte para SYS/SYSTEM: " ORACLE_ADMIN_PASSWORD
echo
docker run -d \
  --name pi2-oracle \
  --restart unless-stopped \
  -p 127.0.0.1:1521:1521 \
  -e ORACLE_PASSWORD="$ORACLE_ADMIN_PASSWORD" \
  -v pi2-oracle-data:/opt/oracle/oradata \
  gvenzl/oracle-free:latest
unset ORACLE_ADMIN_PASSWORD
```

O primeiro início pode demorar alguns minutos enquanto o banco é criado. A senha passada na primeira criação fica associada ao banco persistido no volume.

### Se o container já existir

Se o Docker avisar que o nome `pi2-oracle` já está em uso, não execute outro `docker run`. Inicie o container existente:

```bash
docker start pi2-oracle
```

Ao reutilizar um volume existente, mudar `ORACLE_PASSWORD` no comando não troca a senha já gravada no banco.

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

Esse comando cria uma senha aleatória para o usuário da aplicação e não substitui um `.env` que já exista. Abra o `.env` em um editor e preencha `DB_ADMIN_PASSWORD` com a senha de `SYS`/`SYSTEM` escolhida na etapa 2. Para a configuração local padrão, os valores de conexão devem ser:

```dotenv
DB_ADMIN_USER=SYSTEM
DB_ADMIN_PASSWORD=83480903d557ba10127c5d857cde149d2156db530781877f7700009cad1c9159
DB_HOST=127.0.0.1
DB_PORT=1521
DB_SERVICE_NAME=FREEPDB1
DB_USER=PI2_APP
DB_PASSWORD=83480903d557ba10127c5d857cde149d2156db530781877f7700009cad1c9159
```

O texto descritivo acima é apenas um exemplo: não o copie literalmente como senha. Use a senha administrativa escolhida na etapa 2 em `DB_ADMIN_PASSWORD` e mantenha em `DB_PASSWORD` o valor aleatório que o comando gerou. Essas são duas senhas diferentes. Para consultar a senha da aplicação, abra o `.env` na pasta do projeto; essa mesma senha é usada pelo backend e pelo DBeaver. Não substitua uma senha por outra.

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
