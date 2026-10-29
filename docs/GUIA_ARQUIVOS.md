# Guia de arquivos do PI2 — recorte até a tarefa 25

## 1. Escopo deste guia

Este guia descreve os **64 arquivos do projeto que existiam no repositório no commit da tarefa 25**, incluindo código, configurações, documentação, mapas de campos, dados fictícios, protótipos, rascunhos e testes.

**Último commit**: `feat(attendance): implementar abertura de atendimento (tarefa 25)`.

O arquivo `docs/GUIA_ARQUIVOS.md` foi criado  para explicar os materiais existentes. Por isso, **o próprio guia não faz parte dos arquivos**. 

A pasta interna `.git/` guarda os objetos e metadados do Git, não o código do sistema. Ela deve ser preservada para manter o histórico, mas seus arquivos internos gerados pelo Git não são listados um a um aqui.

## 2. Como interpretar os status

- **Funcional nesta etapa:** participa de uma parte executável do fluxo implementado.
- **Protótipo/rascunho:** representa uma tela ou uma ideia visual; não significa que aquela função já grave dados ou execute regras reais.
- **Proposta a validar:** serve como referência técnica inicial e precisa ser comparada aos requisitos e ao modelo de dados oficiais do grupo.
- **Apoio técnico:** configuração, script, teste ou documentação usado para preparar, manter ou conferir o projeto.



## 3. Visão geral das pastas

```text
PI2/
├── .editorconfig, .env.example, .gitattributes, .gitignore
├── .prettierignore, .prettierrc.json
├── README.md
├── package.json, package-lock.json
├── database/
│   ├── estrutura.sql
│   └── dados-teste.sql
├── docs/
│   ├── ORGANIZACAO.md
│   ├── VERIFICACAO.md
│   └── campos.json
├── public/
│   ├── index.html
│   ├── painel.html
│   ├── assets/css/ — tema dos protótipos e estilo do painel funcional
│   ├── assets/js/ — painel, protótipos, rascunhos e revisão
│   ├── design/padrao-visual.html
│   └── screens/ — telas de desenho, rascunhos e revisão
├── scripts/ — preparação do ambiente e do banco
├── src/ — backend Node.js organizado por responsabilidade
└── tests/ — testes automatizados da etapa
```

## 4. Arquivos da raiz e configurações

### `.editorconfig`
Define regras básicas para editores: UTF-8, indentação com espaços de dois caracteres, quebras de linha LF, linha final e remoção de espaços no fim das linhas. Ajuda integrantes diferentes a manterem o mesmo padrão de edição. Não é executado pelo sistema.

### `.env.example`
Modelo das variáveis de ambiente necessárias para iniciar o servidor e conectar ao MySQL, como `HOST`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER` e `DB_PASSWORD`. É um exemplo para copiar para `.env`; a senha real deve ser preenchida apenas no arquivo local e nunca publicada.

### `.gitattributes`
Instrui o Git a tratar os arquivos como texto e padronizar as quebras de linha em LF quando aplicável. Evita diferenças desnecessárias entre Windows, Linux e macOS.

### `.gitignore`
Impede que itens locais ou gerados sejam adicionados ao Git, incluindo `node_modules/`, `.env`, arquivos de log e `coverage/`. É especialmente importante para não versionar credenciais locais.

### `.prettierignore`
Lista os caminhos que o Prettier deve ignorar ao verificar ou formatar o projeto: dependências instaladas, metadados do Git e SQL. Não altera o comportamento da aplicação.

### `.prettierrc.json`
Configura o Prettier com dois espaços, sem tabulações, aspas simples em JavaScript, ponto e vírgula, vírgula final, largura de linha de 100 caracteres e quebras LF. O formato JSON não admite comentários.

### `README.md`
É o ponto inicial para integrantes: explica a estrutura, como abrir as telas, como instalar dependências, configurar o `.env`, preparar o banco, iniciar o servidor, entrar com usuários fictícios e executar os testes. Também registra limitações da proposta e orienta a preservar `.git` ao publicar o repositório.

### `package.json`
Identifica o projeto como aplicação Node.js com módulos ES, define Node.js 22 ou superior e declara as dependências `mysql2` e `prettier`. Contém os comandos `configurar`, `preparar`, `testar:conexao`, `start`, `test`, `formatar` e `verificar:formatacao`.

### `package-lock.json`
Registra as versões resolvidas das dependências npm e suas dependências transitivas. Ajuda os integrantes a instalar versões consistentes. Deve ser atualizado pelo npm quando as dependências forem alteradas; não é um arquivo para editar manualmente.

## 5. Banco de dados e dados fictícios

### `database/estrutura.sql`
Propõe as tabelas `usuarios`, `pacientes` e `atendimentos`, com chaves, restrições e relacionamentos necessários para testar login, cadastro e abertura de atendimento. É uma estrutura auxiliar: os comentários avisam que o MER original não estava disponível. Use em banco de exemplo e compare com o modelo oficial antes de adotá-la no banco do grupo.

### `database/dados-teste.sql`
Insere pacientes identificados por códigos fictícios `DEMO-*` e um atendimento inicial para demonstrar a busca e o tratamento de conflito. Usa condições para permitir repetir a carga sem sobrescrever os pacientes já existentes. Depende da estrutura de `database/estrutura.sql` e serve para desenvolvimento, nunca para representar pacientes reais.

## 6. Documentação em `docs/`



### `docs/ESTRUTURA.md`
Mostra a estrutura final do código

### `docs/VERIFICACAO.md`
Registra as verificações técnicas realizadas para a versão documentada, os resultados de testes automatizados e de integração, os fluxos conferidos e as limitações. É um relatório de conferência; não é um script de teste nem uma garantia de que o ambiente de cada integrante terá a mesma configuração.

### `docs/campos.json`
Mapa estruturado de campos por tela, com formato, obrigatoriedade, tabela/campo de destino e observações. Abrange login, cadastro de paciente, atendimento e propostas para triagem, consulta, medicações e encerramento. As etapas futuras são explicitamente marcadas como propostas a validar. Como é JSON válido, não deve receber comentários de linha.

## 7. Interface, protótipos e rascunhos em `public/`

### `public/index.html`
Página inicial de navegação do projeto. Reúne links para rascunhos, padrão visual, mapa de campos, cadastro, triagem, painel médico, medicações/encerramento, revisão do grupo e painel funcional. Não implementa as regras de negócio; serve como catálogo das páginas.

### `public/painel.html`
Interface funcional de demonstração para a parte implementada até a tarefa 25. Oferece login, exibição da sessão, logout, cadastro de paciente fictício, busca e abertura de atendimento. Usa `public/assets/css/painel.css` e `public/assets/js/painel.js`; é a tela ligada às APIs do backend nesta etapa.

### `public/assets/css/painel.css`
Estiliza o painel funcional de teste: cabeçalho, formulários, cartões, mensagens de estado, tabelas e adaptação para telas menores. É separado do tema dos protótipos porque o painel tem controles e mensagens próprios.

### `public/assets/css/tema.css`
Folha de estilo compartilhada pelas telas de desenho. Define variáveis de cor, tipografia, espaçamento, cartões, formulários, botões, tabelas, estados de aviso/erro e elementos visuais de risco. Alterações aqui afetam vários protótipos, por isso é a referência visual comum.

### `public/assets/js/painel.js`
Controla a interação do painel funcional no navegador: envia pedidos de login, consulta a sessão, faz logout, cadastra e busca pacientes e solicita a abertura de atendimento. Envia as requisições às rotas `/api/...` do servidor e apresenta as respostas e erros na tela. Não contém a implementação das regras de negócio, que fica em `src/`.

### `public/assets/js/prototipos.js`
Comportamento auxiliar das telas de desenho. Lê o parâmetro `?modo=rascunho` da URL e aplica o modo visual em cinza sem duplicar o HTML de cada formulário. Os botões e campos dos protótipos não devem ser confundidos com funcionalidades integradas ao banco.

### `public/assets/js/rascunhos.js`
Controla a página que exibe telas existentes dentro de um `iframe` em modo rascunho e ajusta sua altura e navegação. Reutiliza as páginas originais com o parâmetro de rascunho em vez de manter cópias separadas dos formulários.

### `public/assets/js/revisao.js`
Lê a avaliação preenchida pelo grupo na página de revisão, reúne as respostas e caixas marcadas em um objeto JSON e inicia o download local `PI2_revisao_do_grupo.json`. Não envia a avaliação para o backend e não decide se as telas foram aprovadas.

### `public/design/padrao-visual.html`
Página de referência da tarefa 12 para visualizar a paleta de cores, a tipografia e os componentes usados nos desenhos. Importa o tema compartilhado e pode ser aberta pelo índice. É um guia visual, não uma tela operacional do atendimento.

### `public/screens/cadastro.html`
Protótipo visual de cadastro do paciente. Mostra os campos e ações planejados para a tela, mas nesta página de desenho os controles não representam o fluxo de persistência do painel funcional.

### `public/screens/campos.html`
Página visual da tarefa 13 que organiza e apresenta os campos e as funções previstos nas telas. Ajuda o grupo a revisar consistência e obrigatoriedade em conjunto com `docs/campos.json`; não é a fonte de validação executada pelo backend.

### `public/screens/medicacoes-encerramento.html`
Protótipo que apresenta as áreas de registro de medicações e encerramento do atendimento. Os campos são uma proposta visual e não salvam medicações nem finalizam um atendimento nesta etapa.

### `public/screens/medico.html`
Protótipo do painel médico, com exemplos de pacientes aguardando atendimento e registro da consulta. Os dados exibidos são ilustrativos; a fila e a consulta ainda não estão integradas ao banco neste recorte.

### `public/screens/rascunhos.html`
Página para consultar os rascunhos das telas. Usa `rascunhos.js` para carregar telas compartilhadas em modo cinza dentro de um `iframe`, permitindo comparar a disposição sem manter uma segunda cópia do HTML.

### `public/screens/revisao.html`
Formulário de revisão para que os integrantes registrem a avaliação dos desenhos. Trabalha com `public/assets/js/revisao.js` para exportar localmente o resultado em JSON. A decisão e os comentários dependem do grupo; abrir a página não equivale a aprovação.

### `public/screens/triagem.html`
Protótipo visual da triagem, com campos sugeridos para queixa e sinais vitais. Não implementa cálculo clínico de classificação de risco nem grava uma triagem no banco nesta etapa.

## 8. Scripts de preparação em `scripts/`

### `scripts/configurar-env.js`
Copia `.env.example` para `.env` quando o arquivo local ainda não existe. Evita sobrescrever uma configuração já preenchida. É o comando executado por `npm run configurar`.

### `scripts/preparar-banco.js`
Prepara o banco de exemplo: lê a configuração local, cria o banco quando necessário, executa os scripts SQL de estrutura e dados fictícios e prepara os usuários de teste. Deve ser usado no ambiente de desenvolvimento, com MySQL ativo e permissões adequadas; não substitui o banco oficial do grupo.

### `scripts/testar-conexao.js`
Abre a conexão usando a configuração comum e executa uma consulta simples para confirmar que o Node.js consegue alcançar o MySQL. Serve para diagnosticar a configuração antes de iniciar o sistema.

### `scripts/usuarios-teste.js`
Cria ou prepara as contas fictícias de recepção, enfermagem e médico para testes. Usa a função de hash de senhas e permite exercitar os três perfis sem inserir credenciais reais no código do servidor.

## 9. Backend em `src/`

### `src/servidor.js`
Ponto de entrada do backend. Cria o servidor HTTP, conecta os módulos de configuração, autenticação, permissões, arquivos estáticos, pacientes e atendimentos e encaminha as rotas da API. Também centraliza o tratamento de erros e exige sessão/perfil nas operações protegidas.

### `src/config/banco.js`
Lê as opções do MySQL das variáveis de ambiente e cria o pool de conexões reutilizado pelo servidor e pelos scripts. Mantém a configuração de banco em um só lugar, sem embutir senha no código.

### `src/http/arquivos.js`
Entrega os arquivos públicos que ficam sob `public/`, resolve caminhos com segurança e impede que o navegador acesse arquivos privados, configurações ou código do backend por meio de uma URL. Também trata o caminho inicial/legado previsto pelo projeto.

### `src/http/respostas.js`
Reúne utilitários HTTP comuns: classe `ErroHttp` para erros esperados com status, envio padronizado de respostas JSON, leitura e validação do corpo JSON e conferência da origem da requisição. É compartilhado pelas rotas e pelos módulos de domínio.

### `src/auth/autenticacao.js`
Implementa login, criação e consulta de sessão e logout. Verifica a conta com a rotina de senha, mantém as sessões em memória e fornece a identidade autenticada ao restante do backend. Como as sessões são voláteis, reiniciar o servidor encerra as sessões existentes.

### `src/auth/permissoes.js`
Define os perfis permitidos — `recepcao`, `enfermagem` e `medico` — e funções para exigir o perfil autorizado e preparar as informações de perfil exibidas na interface. A decisão de acesso é feita no servidor, não apenas pela aparência da página.

### `src/auth/senhas.js`
Gera e confere hashes de senha com `scrypt`, salt aleatório e comparação segura. Evita guardar ou comparar a senha em texto puro no banco. É usado pela autenticação e pelo script de usuários fictícios.

### `src/pacientes/cadastro.js`
Valida os dados do paciente (tipos, limites, data, documento e telefone) e grava o cadastro no MySQL com consulta parametrizada. Usa uma chave UUID da tentativa para permitir reconhecer repetições e reduzir cadastros duplicados.

### `src/pacientes/busca.js`
Valida o termo da busca e consulta pacientes pelo nome ou documento, limitando a quantidade de resultados. Usa parâmetros SQL para tratar o texto como dado, não como parte executável da consulta.

### `src/atendimentos/abertura.js`
Valida e cria o atendimento associado ao paciente existente e à identidade da recepção autenticada. Define a situação inicial, usa transação e uma chave de abertura para tratar repetições e conflitos, evitando múltiplos atendimentos ativos indevidos.

## 10. Testes automatizados em `tests/`

### `tests/arquivos.test.js`
Verifica as regras de publicação de arquivos: páginas públicas podem ser entregues, enquanto caminhos para `.env`, SQL, código privado e tentativas de escapar de `public/` devem ser bloqueados. Ajuda a evitar exposição acidental de material interno.

### `tests/pacientes.test.js`
Testa as regras de validação do cadastro de pacientes, incluindo dados válidos e inválidos, datas, limites e chave de tentativa. Os testes de validação podem rodar sem conexão ativa ao MySQL.

### `tests/permissoes.test.js`
Testa a autorização por perfil, verificando que a sessão pode acessar a área permitida e é recusada ao tentar usar uma área de outro perfil. Protege as regras centralizadas em `src/auth/permissoes.js`.

### `tests/senhas.test.js`
Testa a geração e verificação de hash de senha, incluindo o uso de salts diferentes e o reconhecimento da senha correta. Usa o executor nativo `node:test`.

## 11. Relações principais entre os arquivos

- **Para abrir as telas de desenho:** `public/index.html` → páginas em `public/screens/` e `public/design/` → `public/assets/css/tema.css` e `public/assets/js/prototipos.js`.
- **Para ver rascunhos:** `public/screens/rascunhos.html` → `public/assets/js/rascunhos.js` → as mesmas telas com `?modo=rascunho`.
- **Para testar a parte funcional:** `public/painel.html` → `public/assets/js/painel.js` e `public/assets/css/painel.css` → rotas de `src/servidor.js` → módulos em `src/auth/`, `src/pacientes/` e `src/atendimentos/` → MySQL configurado em `src/config/banco.js`.
- **Para preparar o ambiente:** `npm run configurar` → `scripts/configurar-env.js`; depois `npm run preparar` → `scripts/preparar-banco.js` → SQL em `database/` e usuários em `scripts/usuarios-teste.js`.
- **Para conferir o comportamento:** `npm test` executa os testes em `tests/`; `docs/VERIFICACAO.md` registra outras verificações realizadas e suas limitações.
- **Para revisar os campos:** `public/screens/campos.html` e `docs/campos.json`, com a ressalva de que os requisitos originais e o MER devem ser confirmados pelo grupo.

