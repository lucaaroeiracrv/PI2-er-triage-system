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

CREATE TABLE IF NOT EXISTS prioridades_legais (
  id INT NOT NULL AUTO_INCREMENT,
  atendimento_id INT NOT NULL,
  declaracao VARCHAR(20) NOT NULL,
  data_doacao_sangue DATE DEFAULT NULL,
  registrado_por INT NOT NULL,
  registrado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prioridade_atendimento (atendimento_id),
  CONSTRAINT fk_prioridade_atendimento FOREIGN KEY (atendimento_id) REFERENCES atendimentos (id),
  CONSTRAINT fk_prioridade_usuario FOREIGN KEY (registrado_por) REFERENCES usuarios (id),
  CHECK (declaracao IN ('sim', 'nao', 'nao_informado'))
);

CREATE TABLE IF NOT EXISTS categorias_prioridade_legal (
  prioridade_id INT NOT NULL,
  categoria VARCHAR(40) NOT NULL,
  PRIMARY KEY (prioridade_id, categoria),
  CONSTRAINT fk_categoria_prioridade FOREIGN KEY (prioridade_id) REFERENCES prioridades_legais (id),
  CHECK (
    categoria IN (
      'pessoa_com_deficiencia',
      'pessoa_com_tea',
      'idoso_60_79',
      'gestante',
      'lactante',
      'pessoa_com_crianca_de_colo',
      'pessoa_obesa',
      'pessoa_com_mobilidade_reduzida',
      'idoso_80_mais',
      'doador_sangue'
    )
  )
);

CREATE TABLE IF NOT EXISTS historico_prioridades_legais (
  id INT NOT NULL AUTO_INCREMENT,
  prioridade_id INT NOT NULL,
  declaracao VARCHAR(20) NOT NULL,
  categorias_json VARCHAR(500) NOT NULL,
  data_doacao_sangue DATE DEFAULT NULL,
  registrado_por INT NOT NULL,
  registrado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_historico_prioridade FOREIGN KEY (prioridade_id) REFERENCES prioridades_legais (id),
  CONSTRAINT fk_historico_prioridade_usuario FOREIGN KEY (registrado_por) REFERENCES usuarios (id),
  CHECK (declaracao IN ('sim', 'nao', 'nao_informado'))
);

CREATE TABLE IF NOT EXISTS triagens (
  id INT NOT NULL AUTO_INCREMENT,
  atendimento_id INT NOT NULL,
  enfermeiro_id INT NOT NULL,
  queixa VARCHAR(500) NOT NULL,
  pressao VARCHAR(20) NOT NULL,
  temperatura DECIMAL(4,1) NOT NULL,
  frequencia INT NOT NULL,
  saturacao INT NOT NULL,
  classificacao VARCHAR(20) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_triagem_atendimento FOREIGN KEY (atendimento_id) REFERENCES atendimentos (id),
  CONSTRAINT fk_triagem_enfermeiro FOREIGN KEY (enfermeiro_id) REFERENCES usuarios (id),
  CHECK (classificacao IN ('Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'))
);

CREATE UNIQUE INDEX uq_triagem_atendimento ON triagens (atendimento_id);

CREATE TABLE IF NOT EXISTS consultas (
  id INT NOT NULL AUTO_INCREMENT,
  atendimento_id INT NOT NULL,
  medico_id INT NOT NULL,
  registro_consulta TEXT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_consulta_atendimento FOREIGN KEY (atendimento_id) REFERENCES atendimentos (id),
  CONSTRAINT fk_consulta_medico FOREIGN KEY (medico_id) REFERENCES usuarios (id)
);

CREATE INDEX idx_consultas_atendimento ON consultas (atendimento_id);

CREATE TABLE IF NOT EXISTS medicacoes (
  id INT NOT NULL AUTO_INCREMENT,
  atendimento_id INT NOT NULL,
  profissional_id INT NOT NULL,
  medicacao VARCHAR(120) NOT NULL,
  dose VARCHAR(80) NOT NULL,
  via VARCHAR(40) NOT NULL,
  observacoes VARCHAR(500) NOT NULL DEFAULT '',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_medicacao_atendimento FOREIGN KEY (atendimento_id) REFERENCES atendimentos (id),
  CONSTRAINT fk_medicacao_profissional FOREIGN KEY (profissional_id) REFERENCES usuarios (id)
);

CREATE INDEX idx_medicacoes_atendimento ON medicacoes (atendimento_id);