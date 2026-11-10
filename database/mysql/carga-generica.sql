-- Carga sintética para desenvolvimento em MySQL.
INSERT IGNORE INTO pacientes (nome, data_nascimento, documento, telefone, chave_cadastro)
VALUES
  ('Paciente de Teste 001', '1980-01-01', 'GEN-0001', NULL, '00000000-0000-4000-8000-000000000101'),
  ('Paciente de Teste 002', '1980-04-05', 'GEN-0002', NULL, '00000000-0000-4000-8000-000000000102');

INSERT IGNORE INTO atendimentos (paciente_id, recepcionista_id, situacao, chave_abertura)
SELECT p.id, u.id, 'aguardando_triagem', '00000000-0000-4000-8000-000000000201'
FROM pacientes p
JOIN usuarios u ON u.login = 'recepcao'
WHERE p.documento = 'GEN-0001';
