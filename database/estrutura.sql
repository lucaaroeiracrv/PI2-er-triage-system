-- APOIO À TAREFA 10, necessária antes das tarefas 14 e 15.
-- Esta é uma estrutura PROPOSTA: o MER do Eduardo não foi fornecido.
-- Execute em um banco novo. Não substitua as tabelas do grupo sem comparar os campos.
-- O script não apaga tabelas ou registros existentes.

CREATE TABLE IF NOT EXISTS usuarios (
  -- Identificador gerado pelo banco para relacionar os registros sem depender de nomes.
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- Nome exibido nas telas, guardado com espaço suficiente para os exemplos do projeto.
  nome VARCHAR(100) NOT NULL,
  -- Identificador único da conta; duas pessoas não podem usar o mesmo login.
  login VARCHAR(100) NOT NULL UNIQUE,
  -- Resultado da derivação criptográfica; a senha em texto não é gravada aqui.
  senha_hash VARCHAR(200) NOT NULL,
  -- Mantém os três perfis já previstos no PI2, usados pelas regras do backend.
  perfil ENUM('recepcao', 'enfermagem', 'medico') NOT NULL,
  -- Permite que o login reconheça se a conta está habilitada.
  ativo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pacientes (
  -- Identificador gerado pelo banco para relacionar os registros sem depender de nomes.
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- Nome exibido nas telas, guardado com espaço suficiente para os exemplos do projeto.
  nome VARCHAR(120) NOT NULL,
  -- Data de calendário validada no código antes da gravação.
  data_nascimento DATE NOT NULL,
  -- Identificador opcional; a restrição UNIQUE evita repetir um documento informado.
  documento VARCHAR(40) NULL UNIQUE,
  -- Contato opcional em texto, preservando sinais e zeros.
  telefone VARCHAR(20) NULL,
  -- Uma mesma tentativa de cadastro usa a mesma chave, inclusive ao repetir um clique.
  -- Identifica uma tentativa de envio; repetir a mesma chave não deve duplicar o cadastro.
  chave_cadastro CHAR(36) NOT NULL UNIQUE,
  -- Registra automaticamente o momento de criação do cadastro.
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_paciente_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS atendimentos (
  -- Identificador gerado pelo banco para relacionar os registros sem depender de nomes.
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- Liga a abertura a um paciente que precisa existir na tabela de cadastros.
  paciente_id BIGINT UNSIGNED NOT NULL,
  -- Identifica a conta que abriu o atendimento; os exemplos SQL não possuem uma sessão de navegador.
  recepcionista_id BIGINT UNSIGNED NULL,
  -- Define a etapa do atendimento; os valores permanecem os mesmos do pacote original.
  situacao ENUM('aguardando_triagem', 'aguardando_medico', 'em_atendimento', 'finalizado')
    NOT NULL DEFAULT 'aguardando_triagem',
  -- Identifica a tentativa de abertura e impede repetir a mesma operação por outro clique.
  chave_abertura CHAR(36) NOT NULL UNIQUE,
  -- Momento de abertura preenchido pelo banco, sem exigir digitação.
  aberto_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_atendimento_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  CONSTRAINT fk_atendimento_usuario FOREIGN KEY (recepcionista_id) REFERENCES usuarios(id),
  INDEX idx_atendimento_situacao (situacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- As tabelas de triagem, consulta e medicação ficam para as tarefas seguintes.
