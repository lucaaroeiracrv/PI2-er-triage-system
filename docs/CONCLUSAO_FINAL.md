# Conclusão final

O desenvolvimento do Sistema de Atendimento e Triagem permitiu à equipe exercitar, de ponta a
ponta, a construção de uma aplicação web com interface, backend, banco de dados e testes. O
resultado integra o fluxo de recepção, triagem de enfermagem, atendimento médico, registro de
medicações, consulta do resumo e encerramento.

## Aprendizados da equipe

- **Decomposição e integração:** separar a aplicação por responsabilidades — interface, rotas,
  autenticação, regras de domínio e persistência — tornou mais claro onde cada validação deveria
  acontecer e facilitou a integração das etapas desenvolvidas.
- **Modelagem de dados:** relacionamentos, chaves e restrições no banco complementam as validações
  do backend. A experiência com MySQL e Oracle também mostrou que oferecer suporte a dois motores
  exige considerar diferenças de SQL, tipos, transações, parâmetros e retorno de identificadores.
- **Integridade do fluxo:** operações relacionadas precisam manter estado consistente. Transações,
  validação de vínculos entre paciente, atendimento e triagem e tratamento de requisições repetidas
  são importantes para evitar registros parciais ou duplicados.
- **Autenticação e autorização:** a identidade e o perfil devem ser confirmados no servidor. Senhas
  são armazenadas como hash, e as operações POST usam proteção CSRF; esconder uma ação na interface
  não é controle de acesso suficiente.
- **Testes e documentação:** testes automatizados ajudam a detectar regressões nas regras e nos
  fluxos, enquanto documentação sincronizada com o código ajuda a preparar, executar e avaliar o
  projeto. Testes simulados e testes de integração têm alcances diferentes e não devem ser
  confundidos.
- **Responsabilidade no domínio:** a classificação de risco é uma informação de responsabilidade
  profissional. O software registra a escolha, mas não calcula risco nem substitui avaliação
  clínica.

## Resultado e próximos cuidados

A versão entregue disponibiliza a aplicação para demonstração acadêmica, schemas para MySQL e
Oracle, telas integradas, scripts de preparação e testes. Para o uso acadêmico, ainda é importante
revalidar os testes e as conexões no ambiente de entrega, comparar os schemas e requisitos com a
especificação oficial e confirmar com o grupo a autorização de perfil para medicações e
encerramento.

O projeto não foi desenvolvido nem validado para uso clínico ou produção. Devem ser utilizados
somente dados fictícios; não se deve armazenar ou processar informações reais de pacientes.
