# Verificação e limitações

Este registro separa os testes automatizados das verificações que dependem de instâncias locais.
MySQL e Oracle usam schemas e dados independentes; a configuração seleciona um motor por execução
com `DB_ENGINE`.

## Como reproduzir

Na raiz do repositório, com Node.js 22 ou superior e dependências instaladas:

```bash
npm test
npm run verificar:formatacao
```

Testes de conexão opcionais, que dependem de banco local e `.env` configurado:

```bash
npm run testar:mysql
npm run testar:oracle
```

Para executar a demonstração com Docker no Windows, use
`.\scripts\iniciar-docker.ps1 -Banco mysql` ou
`.\scripts\iniciar-docker.ps1 -Banco oracle`. Os perfis não iniciam os dois bancos juntos.

## Cobertura automatizada

O conjunto em `tests/` inclui testes de API e máscaras da interface, publicação segura de arquivos,
configuração dos motores, validação de pacientes, senhas e permissões, além de regras de triagem,
fila médica, consultas, medicações e encerramento. Há testes HTTP para a triagem; partes que usam
conexão são cobertas também com bancos simulados.

Os testes de banco simulado verificam regras e transações, mas não provam que uma instância real,
uma instalação Docker ou uma conexão de todos os integrantes esteja corretamente configurada.

## Registro de execução

Na preparação desta entrega, a primeira execução de `npm test` encontrou a dependência do driver
Oracle (`oracledb`) ausente no ambiente. Após instalar as dependências declaradas no projeto, a
execução passou: **81 testes passaram, 0 falharam**. Esse resultado valida os testes automatizados,
mas não comprova conexão com um banco real.

`npm run verificar:formatacao` também foi executado após a atualização e passou depois da aplicação
do Prettier aos três documentos apontados. As verificações registradas anteriormente para conexão,
preparação e Docker devem ser repetidas no ambiente de entrega caso seja necessário certificar
novamente esses serviços. Não foram executados nesta atualização testes de integração contra bancos
locais.

## Limitações

- O perfil `medico` para medicações e encerramento ainda aguarda confirmação formal do grupo.
- O schema deve ser comparado ao MER e aos requisitos oficiais da disciplina.
- O sistema é acadêmico, não é uma ferramenta clínica validada e não deve receber dados reais de
  pacientes.
