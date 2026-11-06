CREATE TABLE PACIENTE (
    codigo_paciente INT AUTO_INCREMENT PRIMARY KEY,
    nome_completo VARCHAR(150) NOT NULL,
    nome_pai VARCHAR(150),
    nome_mae VARCHAR(150),
    CPF CHAR(11) NOT NULL UNIQUE,
    RG VARCHAR(20),
    data_nascimento DATE,
    CEP CHAR(8),
    logradouro VARCHAR(150),
    numero VARCHAR(10),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    UF CHAR(2)
);

CREATE TABLE USUARIO (
    codigo_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    tipo_usuario VARCHAR(30) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE
);


CREATE TABLE LOGIN (
    codigo_login INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    codigo_usuario INT NOT NULL UNIQUE,

    FOREIGN KEY (codigo_usuario) REFERENCES USUARIO(codigo_usuario)
);


CREATE TABLE ATENDIMENTO (
    numero_atendimento VARCHAR(10) PRIMARY KEY,
    codigo_paciente INT NOT NULL,
    codigo_usuario INT NOT NULL,
    abertura_data_hora DATETIME NOT NULL,
    situacao VARCHAR(30) NOT NULL,
    cancelamento_data_hora DATETIME,
    confirmacao_data_hora DATETIME,

    FOREIGN KEY (codigo_paciente) REFERENCES PACIENTE(codigo_paciente),

    FOREIGN KEY (codigo_usuario) REFERENCES USUARIO(codigo_usuario)
);


CREATE TABLE CLASSIFICACAO_RISCO (
    codigo_classificacao INT AUTO_INCREMENT PRIMARY KEY,
    prioridade VARCHAR(30) NOT NULL,
    descricao VARCHAR(255),
    orientacao VARCHAR(255)
);


CREATE TABLE TRIAGEM (
    codigo_triagem INT AUTO_INCREMENT PRIMARY KEY,
    numero_atendimento VARCHAR(10) NOT NULL,
    codigo_usuario INT NOT NULL,
    codigo_classificacao INT NOT NULL,
    data_hora DATETIME NOT NULL,
    pressao VARCHAR(20),
    temperatura DECIMAL(4,1),
    batimentos_cardiacos INT,
    queixas TEXT,

    FOREIGN KEY (numero_atendimento) REFERENCES ATENDIMENTO(numero_atendimento),

    FOREIGN KEY (codigo_usuario) REFERENCES USUARIO(codigo_usuario),

    FOREIGN KEY (codigo_classificacao) REFERENCES CLASSIFICACAO_RISCO(codigo_classificacao)
);


CREATE TABLE CONSULTA_MEDICA (
    codigo_consulta INT AUTO_INCREMENT PRIMARY KEY,
    numero_atendimento VARCHAR(10) NOT NULL,
    codigo_usuario INT NOT NULL,
    inicio_data_hora DATETIME NOT NULL,
    observacao TEXT,

    FOREIGN KEY (numero_atendimento) REFERENCES ATENDIMENTO(numero_atendimento),
    FOREIGN KEY (codigo_usuario) REFERENCES USUARIO(codigo_usuario)
);


CREATE TABLE MEDICAMENTO (
    codigo_medicamento INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    apresentacao VARCHAR(100)
);


CREATE TABLE PRESCRICAO (
    codigo_prescricao INT AUTO_INCREMENT PRIMARY KEY,
    codigo_consulta INT NOT NULL,
    codigo_medicamento INT NOT NULL,
    data_hora DATETIME NOT NULL,
    dose VARCHAR(100),
    via_administracao VARCHAR(100),
    orientacao TEXT,

    FOREIGN KEY (codigo_consulta) REFERENCES CONSULTA_MEDICA(codigo_consulta),

    FOREIGN KEY (codigo_medicamento) REFERENCES MEDICAMENTO(codigo_medicamento)
);
