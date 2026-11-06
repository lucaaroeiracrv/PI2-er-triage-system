-- Dados fictícios para desenvolvimento. Nenhum documento corresponde a uma pessoa real.

MERGE INTO pacientes destino
USING (
  SELECT 'Paciente Exemplo Um' nome, DATE '1998-05-12' data_nascimento,
         'DEMO-001' documento, CAST(NULL AS VARCHAR2(20)) telefone,
         '00000000-0000-4000-8000-000000000001' chave_cadastro
  FROM dual
) origem
ON (destino.documento = origem.documento)
WHEN NOT MATCHED THEN INSERT (
  nome, data_nascimento, documento, telefone, chave_cadastro
) VALUES (
  origem.nome, origem.data_nascimento, origem.documento, origem.telefone, origem.chave_cadastro
);

MERGE INTO pacientes destino
USING (
  SELECT 'Paciente Exemplo Dois' nome, DATE '1985-11-23' data_nascimento,
         'DEMO-002' documento, CAST(NULL AS VARCHAR2(20)) telefone,
         '00000000-0000-4000-8000-000000000002' chave_cadastro
  FROM dual
) origem
ON (destino.documento = origem.documento)
WHEN NOT MATCHED THEN INSERT (
  nome, data_nascimento, documento, telefone, chave_cadastro
) VALUES (
  origem.nome, origem.data_nascimento, origem.documento, origem.telefone, origem.chave_cadastro
);

MERGE INTO pacientes destino
USING (
  SELECT 'Paciente Exemplo Três' nome, DATE '2003-02-04' data_nascimento,
         'DEMO-003' documento, CAST(NULL AS VARCHAR2(20)) telefone,
         '00000000-0000-4000-8000-000000000003' chave_cadastro
  FROM dual
) origem
ON (destino.documento = origem.documento)
WHEN NOT MATCHED THEN INSERT (
  nome, data_nascimento, documento, telefone, chave_cadastro
) VALUES (
  origem.nome, origem.data_nascimento, origem.documento, origem.telefone, origem.chave_cadastro
);

MERGE INTO atendimentos destino
USING (
  SELECT id paciente_id
  FROM pacientes
  WHERE documento = 'DEMO-001'
) origem
ON (destino.chave_abertura = '00000000-0000-4000-8000-000000000101')
WHEN NOT MATCHED THEN INSERT (
  paciente_id, recepcionista_id, situacao, chave_abertura
) VALUES (
  origem.paciente_id, NULL, 'aguardando_triagem', '00000000-0000-4000-8000-000000000101'
);
