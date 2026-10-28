-- TAREFA 14: dados exclusivamente fictícios. Não dependem de telas funcionando.
-- Pré-requisito: criar a estrutura em database/estrutura.sql.
-- Os documentos DEMO-* são identificadores de teste, não CPFs reais.
-- WHERE NOT EXISTS permite repetir a carga sem sobrescrever pacientes existentes.

INSERT INTO pacientes (nome, data_nascimento, documento, telefone, chave_cadastro)
SELECT 'Paciente Exemplo Um', '1998-05-12', 'DEMO-001', NULL, '00000000-0000-4000-8000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE documento = 'DEMO-001');

INSERT INTO pacientes (nome, data_nascimento, documento, telefone, chave_cadastro)
SELECT 'Paciente Exemplo Dois', '1985-11-23', 'DEMO-002', NULL, '00000000-0000-4000-8000-000000000002'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE documento = 'DEMO-002');

INSERT INTO pacientes (nome, data_nascimento, documento, telefone, chave_cadastro)
SELECT 'Paciente Exemplo Três', '2003-02-04', 'DEMO-003', NULL, '00000000-0000-4000-8000-000000000003'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE documento = 'DEMO-003');

-- O primeiro paciente começa com um atendimento em aberto para demonstrar a busca.
-- O recepcionista é NULL somente nesta carga feita diretamente no banco.
INSERT INTO atendimentos (paciente_id, recepcionista_id, situacao, chave_abertura)
SELECT id, NULL, 'aguardando_triagem', '00000000-0000-4000-8000-000000000101'
FROM pacientes
WHERE documento = 'DEMO-001'
AND NOT EXISTS (SELECT 1 FROM atendimentos WHERE chave_abertura = '00000000-0000-4000-8000-000000000101');

-- Execute estas consultas para conferir o que foi inserido.
SELECT id, nome, documento FROM pacientes WHERE documento LIKE 'DEMO-%' ORDER BY id;
SELECT a.id, p.nome, a.situacao FROM atendimentos a
JOIN pacientes p ON p.id = a.paciente_id WHERE p.documento LIKE 'DEMO-%';
