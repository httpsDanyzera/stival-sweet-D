const WHATSAPP_NUMERO = "5562995294481"; // Número que receberá o relatório no WhatsApp.
const PRODUTOS = ["tradicional", "ninho", "cafe"]; // Lista técnica dos doces vendidos.
const NOMES = { tradicional: "Tradicional", ninho: "Ninho", cafe: "Café" }; // Nome bonito dos doces.
let formaPagamento = "pix"; // Forma de pagamento inicial da venda rápida.
let supabaseClient = null; // Guarda a conexão com o Supabase quando configurado.
let historico = []; // Guarda os dias salvos carregados do navegador ou Supabase.
let estado = carregarEstadoLocal() || criarEstadoVazio(); // Carrega o dia atual ou cria um novo.

function el(id) { return document.getElementById(id); } // Atalho para buscar elemento pelo ID.
function hoje() { return new Date().toISOString().slice(0, 10); } // Retorna a data de hoje no formato do campo date.
function idNovo() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()); } // Gera um ID único.
function numero(valor) { return Number(String(valor || "").replace(/\./g, "").replace(",", ".")) || 0; } // Converte Real brasileiro para número.
function inteiro(valor) { return Math.max(0, parseInt(valor || "0", 10) || 0); } // Converte texto para inteiro positivo.
function dinheiro(valor) { return (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); } // Formata número em Real.
function campoMoeda(id) { return numero(el(id).value); } // Lê um campo de dinheiro.
function salvarEstadoLocal() { localStorage.setItem("stival_dia_atual", JSON.stringify(estado)); } // Salva o dia atual no navegador.
function carregarEstadoLocal() { return JSON.parse(localStorage.getItem("stival_dia_atual") || "null"); } // Carrega o dia atual do navegador.
function salvarHistoricoLocal() { localStorage.setItem("stival_historico", JSON.stringify(historico)); } // Salva histórico no navegador.
function carregarHistoricoLocal() { return JSON.parse(localStorage.getItem("stival_historico") || "[]"); } // Carrega histórico do navegador.

function criarEstadoVazio() { // Cria um dia novo para venda.
  return { // Retorna o objeto principal do dia.
    id: idNovo(), // ID único do dia.
    data: hoje(), // Data inicial do dia.
    observacao: "", // Observação do preparo.
    observacaoFinal: "", // Observação do fechamento.
    trocoInicial: 0, // Dinheiro levado para troco.
    custos: 0, // Custos do dia.
    dinheiroFinal: 0, // Dinheiro físico contado no final.
    status: "aberto", // Status do dia.
    produtos: { // Dados dos doces preparados.
      tradicional: { feito: 0, preco: 0 }, // Dados do tradicional.
      ninho: { feito: 0, preco: 0 }, // Dados do Ninho.
      cafe: { feito: 0, preco: 0 } // Dados do café.
    }, // Fecha produtos.
    vendas: [] // Lista de lançamentos feitos durante a venda.
  }; // Fecha objeto do dia.
} // Fecha criação do estado.

function supabaseConfigurado() { // Verifica se o Supabase foi configurado.
  return window.SUPABASE_URL && !window.SUPABASE_URL.includes("COLE_AQUI") && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("COLE_AQUI"); // Confere placeholders.
} // Fecha verificação.

function iniciarSupabase() { // Inicia conexão com Supabase quando possível.
  if (!supabaseConfigurado() || !window.supabase) { el("statusBanco").textContent = "Modo teste: salvando no navegador até configurar o Supabase."; return; } // Usa modo local se não configurado.
  supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY); // Cria cliente Supabase.
  el("statusBanco").textContent = "Banco online Supabase conectado."; // Mostra status conectado.
} // Fecha início do Supabase.

async function salvarNoSupabase() { // Salva o dia atual no Supabase.
  if (!supabaseClient) return; // Sai se não houver Supabase.
  const registro = { id: estado.id, data_venda: estado.data, estado: estado }; // Monta registro do banco.
  const { error } = await supabaseClient.from("dias_venda").upsert(registro); // Insere ou atualiza no Supabase.
  if (error) console.error("Erro Supabase:", error.message); // Mostra erro técnico no console.
} // Fecha salvamento online.

async function carregarHistoricoSupabase() { // Carrega histórico do Supabase.
  if (!supabaseClient) { historico = carregarHistoricoLocal(); atualizarHistorico(); return; } // Usa histórico local se não houver banco.
  const { data, error } = await supabaseClient.from("dias_venda").select("id,data_venda,estado").order("data_venda", { ascending: false }); // Busca dias salvos.
  if (error) { console.error(error.message); historico = carregarHistoricoLocal(); atualizarHistorico(); return; } // Usa local se der erro.
  historico = (data || []).map(linha => linha.estado); // Transforma linhas em estados do sistema.
  const diaRemoto = historico.find(dia => dia.data === hoje()); // Procura o dia de hoje no banco.
  const existeLocal = Boolean(localStorage.getItem("stival_dia_atual")); // Verifica se existe dia local.
  if (diaRemoto && !existeLocal) estado = diaRemoto; // Usa dia remoto se não houver local.
  preencherTela(); // Preenche a tela depois de carregar remoto.
  atualizarTudo(); // Atualiza cálculos depois do remoto.
} // Fecha carregamento online.

function formatarMoedaAoSair(campo) { // Formata campo de dinheiro ao sair dele.
  const valor = numero(campo.value); // Converte valor digitado.
  campo.value = valor ? valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""; // Mostra no padrão brasileiro ou vazio.
} // Fecha formatação.

function preencherTela() { // Preenche campos com dados do estado atual.
  el("dataVenda").value = estado.data || hoje(); // Preenche data.
  el("observacao").value = estado.observacao || ""; // Preenche observação.
  el("feitoTradicional").value = estado.produtos.tradicional.feito || ""; // Preenche quantidade tradicional.
  el("feitoNinho").value = estado.produtos.ninho.feito || ""; // Preenche quantidade Ninho.
  el("feitoCafe").value = estado.produtos.cafe.feito || ""; // Preenche quantidade café.
  el("precoTradicional").value = estado.produtos.tradicional.preco ? estado.produtos.tradicional.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""; // Preenche preço tradicional.
  el("precoNinho").value = estado.produtos.ninho.preco ? estado.produtos.ninho.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""; // Preenche preço Ninho.
  el("precoCafe").value = estado.produtos.cafe.preco ? estado.produtos.cafe.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""; // Preenche preço café.
  el("trocoInicial").value = estado.trocoInicial ? estado.trocoInicial.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""; // Preenche troco inicial.
  el("custosDia").value = estado.custos ? estado.custos.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""; // Preenche custos.
  el("dinheiroFinal").value = estado.dinheiroFinal ? estado.dinheiroFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""; // Preenche dinheiro final.
  el("obsFechamento").value = estado.observacaoFinal || ""; // Preenche observação final.
} // Fecha preenchimento.

function lerPreparoDaTela() { // Lê os campos da aba preparo.
  estado.data = el("dataVenda").value || hoje(); // Lê data.
  estado.observacao = el("observacao").value.trim(); // Lê observação.
  estado.produtos.tradicional.feito = inteiro(el("feitoTradicional").value); // Lê quantidade tradicional.
  estado.produtos.ninho.feito = inteiro(el("feitoNinho").value); // Lê quantidade Ninho.
  estado.produtos.cafe.feito = inteiro(el("feitoCafe").value); // Lê quantidade café.
  estado.produtos.tradicional.preco = campoMoeda("precoTradicional"); // Lê preço tradicional.
  estado.produtos.ninho.preco = campoMoeda("precoNinho"); // Lê preço Ninho.
  estado.produtos.cafe.preco = campoMoeda("precoCafe"); // Lê preço café.
  estado.trocoInicial = campoMoeda("trocoInicial"); // Lê troco inicial.
  estado.custos = campoMoeda("custosDia"); // Lê custos.
  salvarEstadoLocal(); // Salva no navegador.
} // Fecha leitura do preparo.

function mudarAba(nome) { // Troca de aba na tela.
  document.querySelectorAll(".aba").forEach(botao => botao.classList.toggle("ativa", botao.dataset.aba === nome)); // Marca botão ativo.
  document.querySelectorAll(".painel").forEach(painel => painel.classList.toggle("visivel", painel.id === nome)); // Mostra painel escolhido.
} // Fecha troca de aba.

function salvarPreparo() { // Salva preparo antes de vender.
  lerPreparoDaTela(); // Atualiza estado com dados da tela.
  preencherSelectItens(); // Atualiza lista de itens vendáveis.
  atualizarTudo(); // Atualiza cálculos.
  salvarNoSupabase(); // Salva online se configurado.
  mudarAba("venda"); // Vai para venda rápida.
} // Fecha salvar preparo.

function preencherSelectItens() { // Preenche o select com doces e comissão.
  el("itemVenda").innerHTML = `<option value="tradicional">Doce - Tradicional</option><option value="ninho">Doce - Ninho</option><option value="cafe">Doce - Café</option><option value="comissao">Comissão</option>`; // Define opções.
} // Fecha select.

function selecionarForma(botao) { // Seleciona forma de pagamento.
  formaPagamento = botao.dataset.forma; // Guarda a forma escolhida.
  document.querySelectorAll(".pagamento").forEach(item => item.classList.remove("ativo")); // Remove ativo dos botões.
  botao.classList.add("ativo"); // Marca botão clicado.
} // Fecha seleção de pagamento.

function ajustarCamposVenda() { // Mostra campos certos para doce ou comissão.
  const item = el("itemVenda").value; // Lê item escolhido.
  const comissao = item === "comissao"; // Verifica se é comissão.
  el("campoQuantidade").classList.toggle("oculto", comissao); // Esconde quantidade para comissão.
  el("campoValorComissao").classList.toggle("oculto", !comissao); // Mostra valor manual para comissão.
} // Fecha ajuste de campos.

function totalVendidoProduto(produto) { // Soma quantidade vendida de um doce.
  return estado.vendas.filter(venda => venda.tipo === "produto" && venda.produto === produto).reduce((soma, venda) => soma + venda.quantidade, 0); // Retorna quantidade vendida.
} // Fecha soma de quantidade.

function totalValorProduto(produto) { // Soma valor vendido de um doce.
  return estado.vendas.filter(venda => venda.tipo === "produto" && venda.produto === produto).reduce((soma, venda) => soma + venda.total, 0); // Retorna valor vendido.
} // Fecha soma do produto.

function totalTipo(tipo) { // Soma totais por tipo de lançamento.
  return estado.vendas.filter(venda => venda.tipo === tipo).reduce((soma, venda) => soma + venda.total, 0); // Retorna total do tipo.
} // Fecha soma por tipo.

function totalForma(forma) { // Soma totais por forma de pagamento.
  return estado.vendas.filter(venda => venda.forma === forma).reduce((soma, venda) => soma + venda.total, 0); // Retorna total da forma.
} // Fecha soma por forma.

function calcularTotais() { // Calcula todos os totais importantes.
  const faturamento = totalTipo("produto"); // Total vendido em doces.
  const comissoes = totalTipo("comissao"); // Total recebido em comissões.
  const pix = totalForma("pix"); // Total recebido em Pix.
  const dinheiro = totalForma("dinheiro"); // Total recebido em dinheiro, incluindo comissão em dinheiro.
  const cartao = totalForma("cartao"); // Total recebido em cartão.
  const lucro = faturamento - estado.custos; // Lucro somente dos doces, sem comissão.
  const caixaEsperado = estado.trocoInicial + dinheiro; // Caixa esperado no fim.
  const diferencaCaixa = estado.dinheiroFinal ? estado.dinheiroFinal - caixaEsperado : 0; // Diferença do caixa.
  return { faturamento, comissoes, pix, dinheiro, cartao, lucro, caixaEsperado, diferencaCaixa }; // Retorna totais.
} // Fecha cálculo.

function registrarVenda() { // Registra doce ou comissão na lista de vendas.
  lerPreparoDaTela(); // Atualiza preços e quantidades antes de vender.
  const item = el("itemVenda").value; // Lê item selecionado.
  if (item === "comissao") { registrarComissao(); return; } // Registra comissão se for o caso.
  const quantidade = inteiro(el("quantidadeVenda").value) || 1; // Lê quantidade vendida.
  const vendido = totalVendidoProduto(item); // Lê quanto já vendeu do item.
  const sobrou = estado.produtos[item].feito - vendido; // Calcula sobra atual.
  if (quantidade > sobrou) { alert("Não tem quantidade suficiente em estoque."); return; } // Impede vender mais do que fez.
  const total = quantidade * estado.produtos[item].preco; // Calcula valor total.
  estado.vendas.push({ id: idNovo(), tipo: "produto", produto: item, nome: NOMES[item], quantidade, valorUnitario: estado.produtos[item].preco, total, forma: formaPagamento, hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }); // Adiciona venda.
  el("quantidadeVenda").value = 1; // Volta quantidade para 1.
  salvarEstadoLocal(); // Salva no navegador.
  salvarNoSupabase(); // Salva online se configurado.
  atualizarTudo(); // Atualiza a tela.
} // Fecha registro de venda.

function registrarComissao() { // Registra comissão junto aos lançamentos.
  const valor = campoMoeda("valorComissao"); // Lê valor da comissão.
  if (valor <= 0) { alert("Informe o valor da comissão."); return; } // Impede valor vazio.
  estado.vendas.push({ id: idNovo(), tipo: "comissao", produto: "comissao", nome: "Comissão", quantidade: 1, valorUnitario: valor, total: valor, forma: formaPagamento, hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }); // Adiciona comissão.
  el("valorComissao").value = ""; // Limpa campo de comissão.
  salvarEstadoLocal(); // Salva no navegador.
  salvarNoSupabase(); // Salva online se configurado.
  atualizarTudo(); // Atualiza a tela.
} // Fecha registro de comissão.

function removerLancamento(id) { // Remove lançamento feito errado.
  estado.vendas = estado.vendas.filter(venda => venda.id !== id); // Remove pelo ID.
  salvarEstadoLocal(); // Salva alteração local.
  salvarNoSupabase(); // Salva alteração online.
  atualizarTudo(); // Atualiza a tela.
} // Fecha remoção.

function atualizarEstoque() { // Atualiza cards de estoque dos doces.
  el("estoqueResumo").innerHTML = PRODUTOS.map(produto => { // Monta um card por produto.
    const feito = estado.produtos[produto].feito; // Lê quantidade feita.
    const vendido = totalVendidoProduto(produto); // Lê quantidade vendida.
    const sobrou = feito - vendido; // Calcula sobra.
    return `<article><span>${NOMES[produto]}</span><strong>${sobrou} sobrando</strong><small>Feito: ${feito} • Vendido: ${vendido} • Total: ${dinheiro(totalValorProduto(produto))}</small></article>`; // Retorna HTML do card.
  }).join(""); // Junta cards.
} // Fecha estoque.

function atualizarLancamentos() { // Atualiza a lista de lançamentos.
  if (!estado.vendas.length) { el("listaLancamentos").innerHTML = "<p>Nenhum lançamento ainda.</p>"; return; } // Mostra vazio.
  el("listaLancamentos").innerHTML = estado.vendas.slice().reverse().map(venda => `<div class="item"><div><strong>${venda.tipo === "comissao" ? "Comissão" : venda.quantidade + "x " + venda.nome}</strong><br><small>${venda.hora} • ${venda.forma.toUpperCase()} • ${dinheiro(venda.total)}</small></div><button type="button" onclick="removerLancamento('${venda.id}')">Remover</button></div>`).join(""); // Monta lançamentos.
} // Fecha lista.

function atualizarFinanceiro() { // Atualiza todos os cards financeiros.
  estado.dinheiroFinal = campoMoeda("dinheiroFinal"); // Lê dinheiro final.
  estado.observacaoFinal = el("obsFechamento").value.trim(); // Lê observação final.
  salvarEstadoLocal(); // Salva os dados finais no navegador.
  const t = calcularTotais(); // Calcula totais.
  el("totalDoces").textContent = dinheiro(t.faturamento); // Mostra faturamento dos doces.
  el("totalComissoes").textContent = dinheiro(t.comissoes); // Mostra comissões.
  el("totalPix").textContent = dinheiro(t.pix); // Mostra Pix.
  el("totalDinheiro").textContent = dinheiro(t.dinheiro); // Mostra dinheiro.
  el("totalCartao").textContent = dinheiro(t.cartao); // Mostra cartão.
  el("fechFaturamento").textContent = dinheiro(t.faturamento); // Mostra faturamento no fechamento.
  el("fechComissoes").textContent = dinheiro(t.comissoes); // Mostra comissão no fechamento.
  el("fechCustos").textContent = dinheiro(estado.custos); // Mostra custos no fechamento.
  el("fechLucro").textContent = dinheiro(t.lucro); // Mostra lucro no fechamento.
  el("fechCaixa").textContent = dinheiro(estado.dinheiroFinal); // Mostra caixa contado.
  el("fechDiferenca").textContent = textoDiferencaCaixa(t); // Mostra diferença do caixa.
} // Fecha atualização financeira.

function textoDiferencaCaixa(t) { // Cria o texto da conferência de caixa.
  if (!estado.dinheiroFinal) return `Esperado: ${dinheiro(t.caixaEsperado)}. Informe o dinheiro final.`; // Pede dinheiro final.
  if (Math.abs(t.diferencaCaixa) < 0.01) return `Caixa conferido. Esperado: ${dinheiro(t.caixaEsperado)}.`; // Caixa certo.
  if (t.diferencaCaixa > 0) return `Sobrou ${dinheiro(t.diferencaCaixa)}. Esperado: ${dinheiro(t.caixaEsperado)}.`; // Sobrou dinheiro.
  return `Faltou ${dinheiro(Math.abs(t.diferencaCaixa))}. Esperado: ${dinheiro(t.caixaEsperado)}.`; // Faltou dinheiro.
} // Fecha texto de caixa.

function atualizarHistorico() { // Atualiza aba do histórico.
  const lista = historico.length ? historico : carregarHistoricoLocal(); // Usa histórico carregado ou local.
  if (!lista.length) { el("melhorDia").textContent = "Nenhum dia salvo ainda."; el("listaHistorico").innerHTML = ""; return; } // Mostra vazio.
  const melhor = lista.slice().sort((a, b) => calcularTotaisEstado(b).faturamento - calcularTotaisEstado(a).faturamento)[0]; // Encontra melhor dia.
  el("melhorDia").textContent = `Melhor dia: ${melhor.data} com ${dinheiro(calcularTotaisEstado(melhor).faturamento)} em doces vendidos.`; // Mostra melhor dia.
  el("listaHistorico").innerHTML = lista.map(dia => { const t = calcularTotaisEstado(dia); return `<div class="item"><div><strong>${dia.data}</strong><br><small>Doces: ${dinheiro(t.faturamento)} • Comissão: ${dinheiro(t.comissoes)} • Lucro: ${dinheiro(t.lucro)}</small></div></div>`; }).join(""); // Monta lista.
} // Fecha histórico.

function calcularTotaisEstado(dia) { // Calcula totais de qualquer dia salvo.
  const vendas = dia.vendas || []; // Lê vendas do dia.
  const faturamento = vendas.filter(v => v.tipo === "produto").reduce((s, v) => s + v.total, 0); // Soma doces.
  const comissoes = vendas.filter(v => v.tipo === "comissao").reduce((s, v) => s + v.total, 0); // Soma comissões.
  const lucro = faturamento - (dia.custos || 0); // Calcula lucro.
  return { faturamento, comissoes, lucro }; // Retorna totais.
} // Fecha totais do estado.

function atualizarTudo() { // Atualiza toda a tela.
  atualizarEstoque(); // Atualiza estoque.
  atualizarLancamentos(); // Atualiza lançamentos.
  atualizarFinanceiro(); // Atualiza financeiro.
  atualizarHistorico(); // Atualiza histórico.
} // Fecha atualização geral.

async function salvarDia() { // Salva o fechamento do dia.
  lerPreparoDaTela(); // Atualiza preparo.
  estado.dinheiroFinal = campoMoeda("dinheiroFinal"); // Atualiza dinheiro final.
  estado.observacaoFinal = el("obsFechamento").value.trim(); // Atualiza observação final.
  estado.status = "fechado"; // Marca o dia como fechado.
  const local = carregarHistoricoLocal().filter(dia => dia.id !== estado.id); // Remove versão antiga local.
  local.unshift(estado); // Adiciona versão atual local.
  historico = local; // Atualiza histórico em memória.
  salvarHistoricoLocal(); // Salva histórico local.
  salvarEstadoLocal(); // Salva estado local.
  await salvarNoSupabase(); // Salva no Supabase se configurado.
  await carregarHistoricoSupabase(); // Recarrega histórico online se possível.
  alert("Dia salvo com sucesso."); // Confirma salvamento.
  atualizarTudo(); // Atualiza tela.
} // Fecha salvar dia.

function textoRelatorio() { // Monta texto do relatório.
  const t = calcularTotais(); // Calcula totais.
  const linhas = ["STIVAL SWEET - RELATÓRIO", `Data: ${estado.data}`, "", `Faturamento doces: ${dinheiro(t.faturamento)}`, `Comissões: ${dinheiro(t.comissoes)}`, `Custos: ${dinheiro(estado.custos)}`, `Lucro doces: ${dinheiro(t.lucro)}`, "", `Pix: ${dinheiro(t.pix)}`, `Dinheiro: ${dinheiro(t.dinheiro)}`, `Cartão: ${dinheiro(t.cartao)}`, `Troco inicial: ${dinheiro(estado.trocoInicial)}`, `Caixa esperado: ${dinheiro(t.caixaEsperado)}`, `Caixa contado: ${dinheiro(estado.dinheiroFinal)}`, textoDiferencaCaixa(t), "", "Produtos:"]; // Linhas iniciais.
  PRODUTOS.forEach(p => linhas.push(`${NOMES[p]}: feito ${estado.produtos[p].feito}, vendido ${totalVendidoProduto(p)}, sobrou ${estado.produtos[p].feito - totalVendidoProduto(p)}, total ${dinheiro(totalValorProduto(p))}`)); // Adiciona produtos.
  if (estado.observacao) linhas.push("", `Observação: ${estado.observacao}`); // Adiciona observação inicial.
  if (estado.observacaoFinal) linhas.push(`Fechamento: ${estado.observacaoFinal}`); // Adiciona observação final.
  return linhas.join("\n"); // Retorna relatório.
} // Fecha relatório.

function enviarWhatsapp() { // Abre WhatsApp com relatório pronto.
  window.open("https://wa.me/" + WHATSAPP_NUMERO + "?text=" + encodeURIComponent(textoRelatorio()), "_blank"); // Abre WhatsApp.
} // Fecha WhatsApp.

function gerarPdf() { // Abre impressão para salvar em PDF.
  const w = window.open("", "_blank"); // Abre nova janela.
  w.document.write(`<title>Relatório Stival Sweet</title><pre style="font-family:Arial;white-space:pre-wrap;font-size:15px;line-height:1.5">${textoRelatorio()}</pre><script>window.print()<\/script>`); // Escreve relatório e imprime.
  w.document.close(); // Fecha escrita.
} // Fecha PDF.

function novoDia() { // Começa um novo dia.
  if (!confirm("Deseja limpar a venda atual e começar um novo dia?")) return; // Confirma ação.
  localStorage.removeItem("stival_dia_atual"); // Remove dia atual.
  estado = criarEstadoVazio(); // Cria novo estado.
  preencherTela(); // Preenche tela limpa.
  atualizarTudo(); // Atualiza cálculos.
  mudarAba("preparo"); // Volta ao preparo.
} // Fecha novo dia.

function configurarEventos() { // Liga eventos do sistema.
  document.querySelectorAll(".aba").forEach(botao => botao.addEventListener("click", () => mudarAba(botao.dataset.aba))); // Liga abas.
  document.querySelectorAll(".pagamento").forEach(botao => botao.addEventListener("click", () => selecionarForma(botao))); // Liga formas de pagamento.
  document.querySelectorAll(".moeda").forEach(campo => campo.addEventListener("blur", () => formatarMoedaAoSair(campo))); // Formata moedas ao sair.
  el("salvarPreparo").addEventListener("click", salvarPreparo); // Liga botão de preparo.
  el("itemVenda").addEventListener("change", ajustarCamposVenda); // Liga troca de item.
  el("registrarVenda").addEventListener("click", registrarVenda); // Liga registro de venda.
  el("dinheiroFinal").addEventListener("input", atualizarFinanceiro); // Atualiza caixa ao digitar.
  el("obsFechamento").addEventListener("input", atualizarFinanceiro); // Atualiza observação ao digitar.
  el("salvarDia").addEventListener("click", salvarDia); // Liga salvar dia.
  el("enviarWhatsapp").addEventListener("click", enviarWhatsapp); // Liga WhatsApp.
  el("gerarPdf").addEventListener("click", gerarPdf); // Liga PDF.
  el("novoDia").addEventListener("click", novoDia); // Liga novo dia.
} // Fecha eventos.

function iniciar() { // Inicia o sistema.
  iniciarSupabase(); // Inicia banco se configurado.
  preencherSelectItens(); // Preenche doces e comissão.
  preencherTela(); // Preenche campos salvos.
  configurarEventos(); // Liga eventos.
  ajustarCamposVenda(); // Ajusta campos da venda rápida.
  historico = carregarHistoricoLocal(); // Carrega histórico local inicial.
  atualizarTudo(); // Atualiza tela.
  carregarHistoricoSupabase(); // Tenta carregar histórico online.
} // Fecha início.

document.addEventListener("DOMContentLoaded", iniciar); // Executa o sistema quando a página carregar.
