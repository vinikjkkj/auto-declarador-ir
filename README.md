# <div align="center">Auto Declarador de Imposto de Renda 2025</div>

#### <div align="center">Automação para declarar **rendimentos** com base em um CSV, usado para o IR2025</div>

## Motivação
O governo não detecta recebimentos por PIX na "Pré-Preenchida", então criei um script que declara cada transação automaticamente, rodando em um navegador e com interação inicial (login/navegação) manual para evitar ser pego por CAPTCHAs

## Como funciona
- Ele lê um CSV contendo os seguintes dados: `data,conta?,nome,valor`, extrai esses dados de um extrato do meu banco e converti em CSV.

- Em seguida você será redirecionado para a página do **Meu Imposto de Renda**, caso não esteja logado irá ser redirecionado para o login.

- Você deve ir até a aba **Rendimentos** que o script começará instantaneamente.

- Cada registro demora cerca de 30 segundos para ser efetuado (por prevenção de detecção), 1000 registros demorará cerca de 8h20 para concluir.

- Se o script parar, ele guarda a posição do ultimo registro feito, para evitar duplicatas em caso de reexecução.

Modifique as strings como quiser para adaptar ao seu registro.