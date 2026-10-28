// A mesma tela pode ser consultada como desenho colorido ou rascunho em cinza.
const parametros = new URLSearchParams(window.location.search);
// O parâmetro de rascunho aplica o tema em cinza à mesma página, sem copiar seu formulário.
if (parametros.get('modo') === 'rascunho') {
  // Seleciona o modo de apresentação do desenho sem criar outra cópia da tela.
  document.body.classList.add('wireframe');
}
// Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
document.querySelectorAll('[data-prototipo]').forEach((form) => {
  // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
  form.addEventListener('submit', (evento) => {
    // Evita o envio padrão da página para que a rotina JavaScript controle o resultado do formulário.
    evento.preventDefault();
    // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
    document.querySelector('[role=status]').textContent =
      'Este é um desenho de tela. Nenhum dado foi salvo. Use o painel de teste para testar o backend.';
  });
});
// Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
document.querySelectorAll('[data-acao]').forEach((botao) => {
  // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
  botao.addEventListener('click', () => {
    // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
    document.querySelector('[role=status]').textContent = botao.dataset.acao;
  });
});
