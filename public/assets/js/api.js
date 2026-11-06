// Compartilha a sessão atual e envia operações de escrita com o token CSRF da sessão.
window.pi2Api = {
  formatCpf(valor) {
    const digitos = valor.replace(/\D/g, '').slice(0, 11);
    return digitos
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
  },

  maskCpfInput(campo) {
    campo.addEventListener('input', () => {
      const digitosAntesDoCursor = campo.value
        .slice(0, campo.selectionStart)
        .replace(/\D/g, '').length;
      campo.value = this.formatCpf(campo.value);
      let posicao = 0;
      let digitosContados = 0;
      while (posicao < campo.value.length && digitosContados < digitosAntesDoCursor) {
        if (/\d/.test(campo.value[posicao])) {
          digitosContados += 1;
        }
        posicao += 1;
      }
      campo.setSelectionRange(posicao, posicao);
    });
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
