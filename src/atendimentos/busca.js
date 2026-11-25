// src\atendimentos\busca.js
import { ErroHttp } from '../http/respostas.js';
import { consultar } from '../config/banco.js';
import { validarCpf } from '../pacientes/cadastro.js';

function validarNumeroAtendimento(valor) {
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) {
    throw new ErroHttp(400, 'Informe um número de atendimento válido.');
  }
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new ErroHttp(400, 'Informe um número de atendimento válido.');
  }
  return numero;
}

function normalizarCpf(valor) {
  if (typeof valor !== 'string') {
    throw new ErroHttp(400, 'Informe o CPF do paciente.');
  }
  const documento = valor.trim().replace(/[.-]/g, '');
  if (!validarCpf(documento)) {
    throw new ErroHttp(400, 'Informe um CPF válido com 11 números.');
  }
  return documento;
}

export async function buscarAtendimento(banco, numeroInformado, cpfInformado) {
  const atendimentoId = validarNumeroAtendimento(numeroInformado);
  const documento = normalizarCpf(cpfInformado);
  const atendimentos = await consultar(
    banco,
    `SELECT a.id AS "atendimento_id",
            a.paciente_id AS "paciente_id",
            p.nome AS "paciente_nome",
            a.situacao AS "situacao",
            a.aberto_em AS "aberto_em"
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
      WHERE a.id = :atendimento_id
        AND p.documento = :documento`,
    { atendimento_id: atendimentoId, documento },
  );
  if (!atendimentos.length) {
    throw new ErroHttp(404, 'Atendimento não encontrado para o número e CPF informados.');
  }
  return atendimentos[0];
}
