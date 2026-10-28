// Testes de regras de entrada: executam sem precisar de um MySQL.
import test from 'node:test';
// Compara valores e erros de forma estrita para que uma conversão automática não esconda uma falha.
import assert from 'node:assert/strict';
// Usa os recursos criptográficos do Node para gerar identificadores e conferir senhas sem guardar texto puro.
import { randomUUID } from 'node:crypto';
// Compartilha a regra de cadastro e seu identificador de tentativa com as operações relacionadas.
import { validarPaciente } from '../src/pacientes/cadastro.js';
// Gera um paciente fictício com uma chave nova para que os testes não compartilhem tentativas.
const exemplo = () => ({
  // Texto de apresentação; não é usado para conceder permissões.
  nome: ' Paciente Exemplo ',
  // Data ISO já conferida no calendário; o banco a armazena em uma coluna DATE.
  data_nascimento: '2000-02-29',
  // Valor opcional normalizado ou NULL; a unicidade só é aplicada quando há documento.
  documento: ' teste-900 ',
  // Contato opcional guardado como texto, sem perder sinais e zeros iniciais.
  telefone: '(11) 90000-0000',
  // Identifica a tentativa e não o paciente; uma edição posterior recebe outra chave.
  chave_cadastro: randomUUID(),
});
// Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
test('normaliza nome e documento, mantendo os campos válidos', () => {
  // Resultado da operação ou da conferência; o chamador decide a resposta a partir dele.
  const resultado = validarPaciente(exemplo());
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(resultado.nome, 'Paciente Exemplo');
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(resultado.documento, 'TESTE-900');
});
// Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
test('campos opcionais vazios se tornam NULL', () => {
  // Resultado da operação ou da conferência; o chamador decide a resposta a partir dele.
  const resultado = validarPaciente({
    ...exemplo(),
    // Valor opcional normalizado ou NULL; a unicidade só é aplicada quando há documento.
    documento: ' ',
    // Contato opcional guardado como texto, sem perder sinais e zeros iniciais.
    telefone: '',
  });
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(resultado.documento, null);
  // Confere o resultado esperado deste cenário, incluindo seu tipo para não esconder diferenças de valor.
  assert.equal(resultado.telefone, null);
});
// Reutiliza a mesma conferência em diferentes entradas inválidas, identificando cada cenário pelo nome.
for (const [nome, ajuste] of [
  [
    'nome vazio',
    {
      // Texto de apresentação; não é usado para conceder permissões.
      nome: ' ',
    },
  ],
  [
    'nome longo',
    {
      // Texto de apresentação; não é usado para conceder permissões.
      nome: 'a'.repeat(121),
    },
  ],
  [
    'data que não existe',
    {
      // Data ISO já conferida no calendário; o banco a armazena em uma coluna DATE.
      data_nascimento: '2001-02-29',
    },
  ],
  [
    'data incompleta',
    {
      // Data ISO já conferida no calendário; o banco a armazena em uma coluna DATE.
      data_nascimento: '2000-1-1',
    },
  ],
  [
    'data no futuro',
    {
      // Data ISO já conferida no calendário; o banco a armazena em uma coluna DATE.
      data_nascimento: '2999-01-01',
    },
  ],
  [
    'data anterior ao limite da proposta',
    {
      // Data ISO já conferida no calendário; o banco a armazena em uma coluna DATE.
      data_nascimento: '1899-12-31',
    },
  ],
  [
    'telefone curto',
    {
      // Contato opcional guardado como texto, sem perder sinais e zeros iniciais.
      telefone: '123',
    },
  ],
  [
    'telefone inválido',
    {
      // Contato opcional guardado como texto, sem perder sinais e zeros iniciais.
      telefone: 'abcdefgh',
    },
  ],
  [
    'documento com marcação',
    {
      // Valor opcional normalizado ou NULL; a unicidade só é aplicada quando há documento.
      documento: '<script>',
    },
  ],
  [
    'documento com tipo inválido',
    {
      // Valor opcional normalizado ou NULL; a unicidade só é aplicada quando há documento.
      documento: 123,
    },
  ],
  [
    'chave ausente',
    {
      // Identifica a tentativa e não o paciente; uma edição posterior recebe outra chave.
      chave_cadastro: undefined,
    },
  ],
  [
    'chave inválida',
    {
      // Identifica a tentativa e não o paciente; uma edição posterior recebe outra chave.
      chave_cadastro: '123',
    },
  ],
]) {
  // Confere que o caso inválido é recusado com a regra esperada, e não aceito silenciosamente.
  test(`rejeita ${nome}`, () => {
    // Confere que o caso inválido é recusado com a regra esperada, e não aceito silenciosamente.
    assert.throws(
      () =>
        validarPaciente({
          ...exemplo(),
          ...ajuste,
        }),
      (erro) => erro.status === 400,
    );
  });
}
