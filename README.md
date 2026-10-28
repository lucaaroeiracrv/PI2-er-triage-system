# PI2 Sistema de atendimento

Projeto integrador com Node.js, MySQL e HTML, CSS e JavaScript. O código é organizado por função e atualizado no mesmo lugar. O histórico identifica as tarefas; não há uma pasta de código por tarefa.

## Abrir os desenhos

Abra `public/index.html` no navegador. Os rascunhos usam as mesmas telas de `public/screens/` com o parâmetro `?modo=rascunho`. O padrão visual compartilhado fica em `public/assets/css/tema.css`.

## Estrutura

- `public/`: páginas que podem ser abertas no navegador.
  - `assets/css/` e `assets/js/`: estilos e comportamentos por função.
  - `design/`: guia de cores, fontes e componentes.
  - `screens/`: desenhos das telas e revisão do grupo.
- `src/`: backend, separado em configuração, HTTP, autenticação, pacientes e atendimentos conforme essas partes entram no projeto.
- `scripts/`: comandos de configuração e preparação do ambiente.
- `database/`: estrutura de exemplo e dados fictícios.
- `docs/`: material explicativo de cada tarefa e mapa dos campos.
- `tests/`: testes automatizados das regras já implementadas.

As pastas aparecem quando recebem conteúdo. Arquivos JSON não têm comentários porque o formato não aceita essa sintaxe; suas opções são explicadas na documentação.

## Comentários e formatação

Os comentários em português explicam imports, variáveis, funções, condições, repetições e regras de banco e de acesso. Chaves de fechamento e linhas vazias não recebem comentários artificiais. A indentação é de dois espaços, com UTF-8 e quebras LF.

Depois de `npm install`, execute `npm run verificar:formatacao` para conferir o padrão ou `npm run formatar` para aplicá-lo. SQL usa comentários `--` e o mesmo recuo; JSON continua sendo JSON válido.

## Histórico local e GitHub

O pacote original não possuía repositório Git. Os commits deste pacote registram a organização feita agora, em ordem de dependência, sem simular datas de desenvolvimento anteriores. Não foi publicado nada no GitHub. A identificação técnica dos commits é `PI2 Reorganização local`, sem atribuir autoria aos integrantes do grupo.

O ZIP inclui a pasta `.git`. Depois de extrair, `git log --reverse --oneline` mostra os commits. A sequência completa e os arquivos envolvidos estão em `docs/HISTORICO.md`. Enviar apenas os arquivos pelo site do GitHub não transporta o histórico: para preservar os commits, use o Git na pasta extraída e configure o repositório remoto escolhido por você.

## Limites do material

O escopo segue as tarefas 11 a 25 do PI2. O texto individual dos requisitos e o MER original não estavam disponíveis: os campos e o banco são propostas a comparar com os documentos do grupo. A aprovação da revisão das telas depende dos integrantes. Os perfis continuam sendo recepção, enfermagem e médico.

## Executar o backend

Você precisa de Node.js 22 ou superior, npm e MySQL em execução. No terminal da raiz do projeto:

1. Execute `npm install`.
2. Execute `npm run configurar` e preencha o `.env` com os dados do seu MySQL.
3. Execute `npm run preparar` para criar o banco de exemplo, sem apagar registros existentes.
4. Execute `npm run testar:conexao` para conferir `SELECT 1`.
5. Execute `npm start` e abra http://127.0.0.1:3000.

O banco padrão é `pi2_academico`. A estrutura é um apoio à tarefa 10, necessária para testar o backend; não a importe por cima do MER já usado pelo grupo. O script exige permissão para criar o banco. O programa MySQL não está incluído no ZIP. O `.env` não deve ser versionado.

## Login e testes

Os usuários fictícios `recepcao`, `enfermagem` e `medico` são criados com a senha inicial `Pi2@2026!`. A preparação preserva contas existentes. As senhas são guardadas como hash scrypt e a sessão fica em memória; ao reiniciar o servidor, entre novamente.

Execute `npm test` para as validações, senhas e permissões presentes nesta etapa. O resultado da verificação final da reorganização fica em `docs/VERIFICACAO.md` quando essa revisão estiver incorporada.

## Testar o fluxo disponível

Entre como `recepcao`, busque `DEMO-002` e abra um atendimento. Cadastre também um paciente fictício novo e busque seu registro. O atendimento é salvo como `aguardando_triagem`, com a identidade do usuário conectado. `DEMO-001` já possui um atendimento em aberto para testar a mensagem de conflito.

Os outros perfis entram em suas próprias áreas, mas não executam as funções da recepção. O salvamento de triagem, consulta, medicações e encerramento pertence às tarefas seguintes; seus desenhos foram preservados.

Para comparar os caminhos antigos e novos, consulte `docs/ORGANIZACAO.md`. Para configurar o projeto no GitHub, preserve a pasta `.git` e execute os comandos de remoto no repositório extraído.

As mensagens dos commits seguem `tipo(escopo): descrição (tarefa N)`. `feat` identifica funcionalidades, `docs` documentação e `chore` preparação técnica. Use `fix` quando houver uma correção de defeito; não é necessário usar todos os tipos em toda sequência.
