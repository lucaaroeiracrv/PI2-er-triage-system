// Compartilha a sessão atual e envia operações de escrita com o token CSRF da sessão.
window.pi2Api = {
  formatTelefone(valor) {
    if (valor.startsWith('+')) return valor;

    const digitos = valor.replace(/\D/g, '');
    if (digitos.length > 11) return valor;
    if (digitos.length <= 2) return digitos ? `(${digitos}` : '';

    const ddd = digitos.slice(0, 2);
    const numero = digitos.slice(2);
    if (numero.length <= 4) return `(${ddd}) ${numero}`;
    if (digitos.length <= 10) {
      return `(${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
    }
    return `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
  },

  formatCpf(valor) {
    const digitos = valor.replace(/\D/g, '').slice(0, 11);
    return digitos
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
  },

  validarCpf(valor) {
    const digitos = String(valor).replace(/\D/g, '');
    if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;

    for (const inicio of [9, 10]) {
      let soma = 0;
      for (let indice = 0; indice < inicio; indice += 1) {
        soma += Number(digitos[indice]) * (inicio + 1 - indice);
      }
      const resto = (soma * 10) % 11;
      const digito = resto === 10 ? 0 : resto;
      if (digito !== Number(digitos[inicio])) return false;
    }
    return true;
  },

  formatPressao(valor) {
    const entrada = valor.replace(/[^\d/]/g, '');
    if (entrada.includes('/')) {
      const [sistolica, ...partesDiastolica] = entrada.split('/');
      return `${sistolica.slice(0, 3)}/${partesDiastolica.join('').slice(0, 3)}`;
    }

    const digitos = entrada.slice(0, 6);
    if (digitos.length <= 3) return digitos;
    return `${digitos.slice(0, 3)}/${digitos.slice(3)}`;
  },

  maskInput(campo, formatar) {
    campo.addEventListener('input', () => {
      const valorAnterior = campo.value;
      const valorFormatado = formatar(valorAnterior);
      if (valorFormatado === valorAnterior) return;

      const digitosAntesDoCursor = campo.value
        .slice(0, campo.selectionStart)
        .replace(/\D/g, '').length;
      const separadorAntesDoCursor = campo.value.slice(0, campo.selectionStart).includes('/');
      campo.value = valorFormatado;
      let posicao = 0;
      let digitosContados = 0;
      while (posicao < campo.value.length && digitosContados < digitosAntesDoCursor) {
        if (/\d/.test(campo.value[posicao])) {
          digitosContados += 1;
        }
        posicao += 1;
      }
      if (separadorAntesDoCursor && campo.value[posicao] === '/') {
        posicao += 1;
      }
      campo.setSelectionRange(posicao, posicao);
    });
  },

  maskCpfInput(campo) {
    this.maskInput(campo, (valor) => this.formatCpf(valor));
  },

  maskTelefoneInput(campo) {
    this.maskInput(campo, (valor) => this.formatTelefone(valor));
  },

  maskPressaoInput(campo) {
    this.maskInput(campo, (valor) => this.formatPressao(valor));
  },

  async postJson(url, dados) {
    const sessaoResposta = await fetch('/api/sessao', {
      credentials: 'same-origin',
    });
    const sessao = await sessaoResposta.json();
    if (!sessaoResposta.ok) {
      throw new Error(sessao.erro || 'Entre no sistema para continuar.');
    }
    if (!sessao.csrf) {
      throw new Error('Sessão sem token de segurança. Saia e entre novamente.');
    }

    const resposta = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessao.csrf,
      },
      body: JSON.stringify(dados),
    });
    const conteudo = await resposta.json();
    if (!resposta.ok) {
      throw new Error(conteudo.erro || `Falha na solicitação: ${resposta.status}`);
    }
    return conteudo;
  },
};
