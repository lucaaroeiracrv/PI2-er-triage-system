-- Schema MySQL equivalente à proposta funcional do projeto.
-- Mantém os mesmos nomes principais e regras de domínio para compatibilidade com o backend.

CREATE TABLE IF NOT EXISTS usuarios (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  login VARCHAR(100) NOT NULL,
  senha_hash VARCHAR(200) NOT NULL,
  perfil VARCHAR(20) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_login (login),
  CHECK (perfil IN ('recepcao', 'enfermagem', 'medico')),
  CHECK (ativo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS pacientes (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  data_nascimento DATE NOT NULL,
  documento VARCHAR(11) NOT NULL,
  telefone VARCHAR(20) DEFAULT NULL,
  chave_cadastro CHAR(36) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pacientes_documento (documento),
  UNIQUE KEY uq_pacientes_chave_cadastro (chave_cadastro)
);

CREATE INDEX idx_paciente_nome ON pacientes (nome);

CREATE TABLE IF NOT EXISTS atendimentos (
  id INT NOT NULL AUTO_INCREMENT,
  paciente_id INT NOT NULL,
  recepcionista_id INT DEFAULT NULL,
  situacao VARCHAR(30) NOT NULL DEFAULT 'aguardando_triagem',
  chave_abertura CHAR(36) NOT NULL,
  paciente_ativo_id INT GENERATED ALWAYS AS (
    CASE WHEN situacao <> 'finalizado' THEN paciente_id ELSE NULL END
  ) STORED,
  aberto_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_atendimento_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes (id),
  CONSTRAINT fk_atendimento_usuario FOREIGN KEY (recepcionista_id) REFERENCES usuarios (id),
  UNIQUE KEY uq_atendimento_chave (chave_abertura),
  UNIQUE KEY uq_atendimento_ativo (paciente_ativo_id),
  CHECK (situacao IN ('aguardando_triagem', 'aguardando_medico', 'em_atendimento', 'finalizado'))
);

CREATE INDEX idx_atendimento_situacao ON atendimentos (situacao);