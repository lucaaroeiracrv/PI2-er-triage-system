-- Dados fictícios para desenvolvimento em MySQL.
INSERT IGNORE INTO pacientes (nome, data_nascimento, documento, telefone, chave_cadastro)
VALUES
  ('Paciente Exemplo Um', '1998-05-12', 'DEMO-001', NULL, '00000000-0000-4000-8000-000000000001'),
  ('Paciente Exemplo Dois', '1985-11-23', 'DEMO-002', NULL, '00000000-0000-4000-8000-000000000002'),
  ('Paciente Exemplo Três', '2003-02-04', 'DEMO-003', NULL, '00000000-0000-4000-8000-000000000003');

INSERT IGNORE INTO atendimentos (paciente_id, recepcionista_id, situacao, chave_abertura)
SELECT id, NULL, 'aguardando_triagem', '00000000-0000-4000-8000-000000000101'
FROM pacientes
WHERE documento = 'DEMO-001';
