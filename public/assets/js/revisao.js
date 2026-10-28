// A decisão é preenchida pelo grupo; não existe aprovação automática.
const revisao = document.querySelector('#revisao-grupo');
// Rejeita um hash com estrutura inesperada em vez de tentar interpretar dados incompletos.
if (revisao) {
  // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
  revisao.addEventListener('submit', (evento) => {
    // Evita o envio padrão da página para que a rotina JavaScript controle o resultado do formulário.
    evento.preventDefault();
    // Campos preenchidos pelos integrantes antes de montar o arquivo de avaliação.
    const valores = Object.fromEntries(new FormData(revisao));
    // Avaliação exportada com decisão e itens marcados; não presume aprovação do grupo.
    const registro = {
      versao_desenhos: '01',
      ...valores,
      conferencia: {},
    };
    // Aplica o mesmo comportamento aos controles relacionados sem copiar o código para cada elemento.
    revisao.querySelectorAll('input[type=checkbox]').forEach((item) => {
      registro.conferencia[item.name] = item.checked;
      // Remove o campo duplicado da exportação; cada conferência fica no grupo de valores booleanos.
      delete registro[item.name];
    });
    // Conteúdo de um arquivo local ou nome de script SQL previsto para a preparação.
    const arquivo = new Blob([JSON.stringify(registro, null, 2)], {
      type: 'application/json',
    });
    // URL temporária do arquivo exportado; deve ser liberada após iniciar o download.
    const endereco = URL.createObjectURL(arquivo);
    // Elemento temporário que inicia o download da avaliação sem enviar dados para um servidor.
    const link = document.createElement('a');
    // Prepara e inicia o download local da avaliação preenchida pelo grupo.
    link.href = endereco;
    // Prepara e inicia o download local da avaliação preenchida pelo grupo.
    link.download = 'PI2_revisao_do_grupo.json';
    // Prepara e inicia o download local da avaliação preenchida pelo grupo.
    link.click();
    // Libera a URL temporária depois de iniciar o download da avaliação.
    setTimeout(() => URL.revokeObjectURL(endereco), 1000);
    // Exibe o conteúdo como texto para que dados digitados não se tornem marcação HTML executável.
    document.querySelector('[role=status]').textContent =
      'A avaliação foi exportada. Guarde o arquivo com os ajustes combinados pelo grupo.';
  });
}
