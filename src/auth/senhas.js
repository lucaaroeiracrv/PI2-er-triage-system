// a senha não é salva em texto no banco.
// scrypt usa um salt aleatório para derivar um hash. A verificação compara os bytes.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
// Adapta uma API com callback para o uso de async e await.
import { promisify } from 'node:util';
// Converte scrypt para uma função aguardável, sem bloquear o fluxo com derivação síncrona.
const derivar = promisify(scrypt);
// Deriva um hash com salt aleatório para não guardar a senha digitada no banco.
export async function gerarHash(senha) {
  // Valor aleatório que faz duas senhas iguais produzirem hashes armazenados diferentes.
  const salt = randomBytes(16).toString('hex');
  // Resultado derivado da senha; este valor substitui o armazenamento da senha em texto.
  const hash = await derivar(senha, salt, 64);
  // Serializa algoritmo, salt e hash juntos para permitir a conferência sem guardar a senha.
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
// Recalcula o hash no mesmo salt e compara bytes sem uma comparação textual comum.
export async function conferirSenha(senha, registro) {
  // Rejeita um hash com estrutura inesperada em vez de tentar interpretar dados incompletos.
  if (typeof registro !== 'string') {
    // A igualdade usa os bytes derivados e não revela qual parte do hash seria diferente.
    return false;
  }
  // Separa o formato armazenado e rejeita partes extras antes de calcular a senha.
  const [tipo, salt, valor, extra] = registro.split('$');
  // Rejeita um hash com estrutura inesperada em vez de tentar interpretar dados incompletos.
  if (
    tipo !== 'scrypt' ||
    extra ||
    !/^[a-f0-9]{32}$/.test(salt || '') ||
    !/^[a-f0-9]{128}$/.test(valor || '')
  ) {
    // A igualdade usa os bytes derivados e não revela qual parte do hash seria diferente.
    return false;
  }
  // Hash recalculado com o salt armazenado para verificar a tentativa de login.
  const calculado = await derivar(senha, salt, 64);
  // A igualdade usa os bytes derivados e não revela qual parte do hash seria diferente.
  return timingSafeEqual(calculado, Buffer.from(valor, 'hex'));
}
