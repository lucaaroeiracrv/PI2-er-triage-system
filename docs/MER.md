# Modelo Entidade-Relacionamento

Modelo lógico correspondente ao schema funcional atual dos bancos Oracle e MySQL. Os tipos físicos
variam entre os motores, mas os nomes e os vínculos principais são equivalentes. O modelo é
acadêmico e deve ser confrontado com o MER oficial da disciplina.

## Diagrama

```mermaid
erDiagram
    USUARIOS {
        int id PK
        string nome
        string login UK
        string senha_hash
        string perfil
        boolean ativo
    }

    PACIENTES {
        int id PK
        string nome
        date data_nascimento
        string documento UK
        string telefone
        uuid chave_cadastro UK
        datetime criado_em
    }

    ATENDIMENTOS {
        int id PK
        int paciente_id FK
        int recepcionista_id FK
        string situacao
        uuid chave_abertura UK
        datetime aberto_em
    }

    PRIORIDADES_LEGAIS {
        int id PK
        int atendimento_id FK_UK
        string declaracao
        date data_doacao_sangue
        int registrado_por FK
        datetime registrado_em
    }

    CATEGORIAS_PRIORIDADE_LEGAL {
        int prioridade_id PK_FK
        string categoria PK
    }

    HISTORICO_PRIORIDADES_LEGAIS {
        int id PK
        int prioridade_id FK
        string declaracao
        string categorias_json
        date data_doacao_sangue
        int registrado_por FK
        datetime registrado_em
    }

    TRIAGENS {
        int id PK
        int atendimento_id FK_UK
        int enfermeiro_id FK
        string queixa
        string pressao
        decimal temperatura
        int frequencia
        int saturacao
        string classificacao
        datetime criado_em
    }

    CONSULTAS {
        int id PK
        int atendimento_id FK
        int medico_id FK
        text registro_consulta
        datetime criado_em
    }

    MEDICACOES {
        int id PK
        int atendimento_id FK
        int profissional_id FK
        string medicacao
        string dose
        string via
        text observacoes
        datetime criado_em
    }

    PACIENTES ||--o{ ATENDIMENTOS : possui
    USUARIOS o|--o{ ATENDIMENTOS : registra
    ATENDIMENTOS ||--o| PRIORIDADES_LEGAIS : declara
    USUARIOS ||--o{ PRIORIDADES_LEGAIS : registra
    PRIORIDADES_LEGAIS ||--o{ CATEGORIAS_PRIORIDADE_LEGAL : inclui
    PRIORIDADES_LEGAIS ||--o{ HISTORICO_PRIORIDADES_LEGAIS : audita
    USUARIOS ||--o{ HISTORICO_PRIORIDADES_LEGAIS : registra
    ATENDIMENTOS ||--o| TRIAGENS : recebe
    USUARIOS ||--o{ TRIAGENS : realiza
    ATENDIMENTOS ||--o{ CONSULTAS : recebe
    USUARIOS ||--o{ CONSULTAS : registra
    ATENDIMENTOS ||--o{ MEDICACOES : possui
    USUARIOS ||--o{ MEDICACOES : registra
```

## Entidades e regras

- **USUARIOS:** guarda nome, login único, hash de senha, perfil (`recepcao`, `enfermagem` ou
  `medico`) e estado ativo. O backend aplica as permissões.
- **PACIENTES:** guarda nome, data de nascimento, CPF obrigatório e único, telefone opcional,
  chave de tentativa de cadastro e data de criação.
- **ATENDIMENTOS:** referencia paciente e, quando informado, usuário da recepção. A chave de
  abertura é única. As situações suportadas são `aguardando_triagem`, `aguardando_medico`,
  `em_atendimento` e `finalizado`. O schema impede mais de um atendimento não finalizado por
  paciente.
- **PRIORIDADES_LEGAIS:** guarda a resposta obrigatória da recepção (`sim`, `nao` ou
  `nao_informado`) para cada atendimento, o usuário responsável pelo registro, a data/hora e, para
  doadores de sangue, a data da doação. As categorias ficam em tabela relacionada para permitir
  múltiplas seleções. A faixa etária é recalculada pelo backend a partir da data de nascimento do
  paciente, sem confiar no valor enviado pela interface.
- **HISTORICO_PRIORIDADES_LEGAIS:** preserva um snapshot inicial da declaração, categorias, data da
  doação, profissional e horário. O endpoint atual registra a abertura; um fluxo de correção poderá
  acrescentar snapshots posteriores.
- **TRIAGENS:** referencia atendimento e profissional de enfermagem; guarda queixa, pressão,
  temperatura, frequência, saturação, classificação e data/hora. Há no máximo uma triagem por
  atendimento. A classificação é informada pela enfermagem.
- **CONSULTAS:** referencia atendimento e médico; armazena texto em `registro_consulta` e data/hora.
  Um atendimento pode ter várias consultas. Paciente e triagem são verificados pelo backend por
  meio do atendimento, sem duplicação dessas chaves na tabela.
- **MEDICACOES:** referencia atendimento e profissional; armazena medicamento, dose, via,
  observações e data/hora. Um atendimento pode ter vários registros. No schema MySQL, observações
  não nulas usam texto vazio quando omitidas; Oracle permite valor nulo.

## Cardinalidades

| Relação                           | Cardinalidade | Regra                                                                                                   |
| --------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| Pacientes — atendimentos          | 1:N           | Cada atendimento pertence a um paciente; pode haver vários ao longo do tempo.                           |
| Usuários — atendimentos           | 1:N opcional  | O usuário de recepção pode não estar informado; cada atendimento tem no máximo um.                      |
| Atendimentos — prioridades legais | 1:0..1        | Cada atendimento novo recebe uma declaração de prioridade; atendimentos antigos podem não ter registro. |
| Prioridades — categorias legais   | 1:N           | A declaração pode incluir várias categorias; `Não` e `Não sabe/não informou` não têm categorias.        |
| Prioridades — histórico           | 1:N           | O primeiro snapshot é criado na abertura; alterações futuras podem acrescentar novos registros.         |
| Atendimentos — triagens           | 1:0..1        | Um atendimento recebe no máximo uma triagem.                                                            |
| Usuários — triagens               | 1:N           | Cada triagem identifica um profissional de enfermagem.                                                  |
| Atendimentos — consultas          | 1:N           | Pode haver vários registros de consulta.                                                                |
| Usuários — consultas              | 1:N           | Cada consulta identifica o médico autenticado.                                                          |
| Atendimentos — medicações         | 1:N           | Pode haver vários registros de medicação.                                                               |
| Usuários — medicações             | 1:N           | Cada medicação identifica o profissional autenticado.                                                   |

O resumo é montado a partir das entidades existentes; não há tabela própria para resumos. As
medicações e o encerramento são recursos implementados, mas o perfil oficialmente autorizado para
essas operações ainda precisa ser confirmado nos requisitos do grupo.

Na fila médica, a gravidade clínica continua sendo o critério principal. Dentro de Amarelo, Verde e
Azul, beneficiários legais ficam antes de doadores, e doadores antes de pacientes sem prioridade.
Pessoas com 80 anos ou mais ficam à frente das de 60 a 79 anos; categorias sem precedência entre si
usam chegada e ID do atendimento como desempate determinístico. Prioridade legal não altera a ordem
de Vermelho e Laranja.
