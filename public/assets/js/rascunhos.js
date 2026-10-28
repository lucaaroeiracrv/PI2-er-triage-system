// O iframe carrega a tela original com o modo rascunho, preservando uma única fonte.
const quadro = document.querySelector('#rascunho');
// Aplica o mesmo comportamento aos controles relacionados sem copiar o código para cada elemento.
document.querySelectorAll('[data-tela]').forEach((botao) => {
  // Aplica o mesmo comportamento aos controles relacionados sem copiar o código para cada elemento.
  botao.addEventListener('click', () => {
    // Troca somente a tela carregada no quadro; o formulário permanece no arquivo compartilhado original.
    quadro.src = `${botao.dataset.tela}.html?modo=rascunho`;
    // Aplica o mesmo comportamento aos controles relacionados sem copiar o código para cada elemento.
    document
      .querySelectorAll('[data-tela]')
      .forEach((item) => item.setAttribute('aria-pressed', String(item === botao)));
  });
});
// Liga a ação do usuário a este controle; o restante da regra só roda quando o evento acontece.
quadro.addEventListener('load', () => {
  try {
    // Ajusta a altura para mostrar o conteúdo do rascunho sem cortar campos ou botões.
    quadro.style.height = `${quadro.contentDocument.documentElement.scrollHeight + 24}px`;
  } catch {
    // Navegadores podem isolar arquivos file://; a altura do CSS mantém a navegação.
    quadro.style.height = '1200px';
  }
});
