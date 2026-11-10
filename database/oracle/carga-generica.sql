-- Carga exclusivamente sintética para desenvolvimento; não representa pessoas reais.
-- Gera 100 pacientes e um atendimento para cada um, sem sobrescrever registros existentes.

MERGE INTO pacientes destino
USING (
  SELECT
    'Paciente de Teste ' || TO_CHAR(n, 'FM000') nome,
    DATE '1980-01-01' + MOD(n * 113, 9000) data_nascimento,
    'GEN-' || TO_CHAR(n, 'FM0000') documento,
    CAST(NULL AS VARCHAR2(20)) telefone,
    '00000000-0000-4000-8000-' || LPAD(TO_CHAR(100000000000 + n), 12, '0') chave_cadastro
  FROM (SELECT LEVEL n FROM dual CONNECT BY LEVEL <= 100)
) origem
ON (destino.documento = origem.documento)
WHEN NOT MATCHED THEN INSERT (
  nome, data_nascimento, documento, telefone, chave_cadastro
) VALUES (
  origem.nome, origem.data_nascimento, origem.documento, origem.telefone, origem.chave_cadastro
);

MERGE INTO atendimentos destino
USING (
  SELECT
    p.id paciente_id,
    (SELECT u.id FROM usuarios u WHERE u.login = 'recepcao') recepcionista_id,
    CASE MOD(n, 4)
      WHEN 0 THEN 'finalizado'
      WHEN 1 THEN 'aguardando_triagem'
      WHEN 2 THEN 'aguardando_medico'
      ELSE 'em_atendimento'
    END situacao,
    '00000000-0000-4000-8000-' || LPAD(TO_CHAR(200000000000 + n), 12, '0') chave_abertura
  FROM (SELECT LEVEL n FROM dual CONNECT BY LEVEL <= 100) sequencia
  JOIN pacientes p ON p.documento = 'GEN-' || TO_CHAR(n, 'FM0000')
) origem
ON (destino.chave_abertura = origem.chave_abertura)
WHEN NOT MATCHED THEN INSERT (
  paciente_id, recepcionista_id, situacao, chave_abertura
) VALUES (
  origem.paciente_id, origem.recepcionista_id, origem.situacao, origem.chave_abertura
);
