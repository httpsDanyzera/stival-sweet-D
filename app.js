let vendas = [];
let diasSalvosLocais = JSON.parse(localStorage.getItem("stivalSweetDias") || "[]");

function el(id) {
    return document.getElementById(id);
}

function parseValor(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return 0;
    if (texto.includes(",")) return Number(texto.replace(/\./g, "").replace(",", ".")) || 0;
    return Number(texto) || 0;
}

function valorCampo(id) {
    return parseValor(el(id)?.value || "0");
}

function moeda(valor) {
    return (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function abrirAba(nome) {
    document.querySelectorAll(".aba-conteudo").forEach(secao => secao.classList.remove("ativo"));
    document.querySelectorAll(".botao-aba").forEach(botao => botao.classList.remove("ativo"));
    const secao = el("aba-" + nome);
    const botao = document.querySelector(`[data-aba="${nome}"]`);
    if (secao) secao.classList.add("ativo");
    if (botao) botao.classList.add("ativo");
    atualizarTudo();
}

function pegarProdutos() {
    return Array.from(document.querySelectorAll(".produto")).map(linha => {
        const produto = linha.dataset.produto;
        const feita = Number(linha.querySelector(".qtd-feita").value || 0);
        const valorUnitario = parseValor(linha.querySelector(".valor-unitario").value);

        const vendidaUnitario = vendas
            .filter(venda => venda.tipo === "doce" && venda.produto === produto)
            .reduce((soma, venda) => soma + Number(venda.quantidade || 0), 0);

        const vendidaCombo = vendas
            .filter(venda => venda.tipo === "combo")
            .reduce((soma, venda) => soma + Number(venda.sabores?.[produto] || 0), 0);

        const vendida = vendidaUnitario + vendidaCombo;

        const totalUnitario = vendas
            .filter(venda => venda.tipo === "doce" && venda.produto === produto)
            .reduce((soma, venda) => soma + Number(venda.valorTotal || 0), 0);

        const totalCombo = vendas
            .filter(venda => venda.tipo === "combo")
            .reduce((soma, venda) => {
                const qtdDoSabor = Number(venda.sabores?.[produto] || 0);
                const totalUnidades = Object.values(venda.sabores || {}).reduce((a, b) => a + Number(b || 0), 0);

                if (totalUnidades <= 0) return soma;

                return soma + (Number(venda.valorTotal || 0) / totalUnidades) * qtdDoSabor;
            }, 0);

        const sobrou = Math.max(feita - vendida, 0);
        const total = totalUnitario + totalCombo;

        return { produto, feita, valorUnitario, vendida, sobrou, total };
    });
}

function calcularResumo() {
    const produtos = pegarProdutos();
    const totalBruto = produtos.reduce((soma, produto) => soma + produto.total, 0);
    const totalComissao = vendas
        .filter(venda => venda.tipo === "comissao")
        .reduce((soma, venda) => soma + Number(venda.valorTotal || 0), 0);
    const custoProducao = valorCampo("custoProducao");
    const custoTransporte = valorCampo("custoTransporte");
    const custosTotais = custoProducao + custoTransporte;
    const totalLiquido = totalBruto - custosTotais;
    const totalRecebido = totalBruto + totalComissao;
    const pix = vendas.filter(venda => venda.pagamento === "Pix").reduce((soma, venda) => soma + Number(venda.valorTotal || 0), 0);
    const dinheiro = vendas.filter(venda => venda.pagamento === "Dinheiro").reduce((soma, venda) => soma + Number(venda.valorTotal || 0), 0);
    const cartao = vendas.filter(venda => venda.pagamento === "Cartão").reduce((soma, venda) => soma + Number(venda.valorTotal || 0), 0);
    const trocoInicial = valorCampo("trocoInicial");
    const dinheiroFinal = valorCampo("dinheiroFinal");
    const dinheiroEsperado = trocoInicial + dinheiro;
    const diferencaCaixa = dinheiroFinal ? dinheiroFinal - dinheiroEsperado : 0;
    return { produtos, totalBruto, totalComissao, custoProducao, custoTransporte, custosTotais, totalLiquido, totalRecebido, pix, dinheiro, cartao, trocoInicial, dinheiroFinal, dinheiroEsperado, diferencaCaixa };
}

function atualizarTexto(id, texto) {
    const elemento = el(id);
    if (elemento) elemento.textContent = texto;
}

function atualizarControleDoces() {
    const area = el("controleDoces");
    const produtos = pegarProdutos();
    if (!area) return;
    area.innerHTML = produtos.map(produto => `
        <article>
            <h4>${produto.produto}</h4>
            <p>Fez: <strong>${produto.feita}</strong></p>
            <p>Vendeu: <strong>${produto.vendida}</strong></p>
            <p>Sobrou: <strong>${produto.sobrou}</strong></p>
            <p>Total: <strong>${moeda(produto.total)}</strong></p>
        </article>
    `).join("");
}

function atualizarResumoTela() {
    const resumo = calcularResumo();
    atualizarTexto("cardBrutoVenda", moeda(resumo.totalBruto));
    atualizarTexto("cardLiquidoVenda", moeda(resumo.totalLiquido));
    atualizarTexto("cardComissaoVenda", moeda(resumo.totalComissao));
    atualizarTexto("cardRecebidoVenda", moeda(resumo.totalRecebido));
    atualizarTexto("cardPixVenda", moeda(resumo.pix));
    atualizarTexto("cardDinheiroVenda", moeda(resumo.dinheiro));
    atualizarTexto("cardCartaoVenda", moeda(resumo.cartao));
    atualizarTexto("resumoBruto", moeda(resumo.totalBruto));
    atualizarTexto("resumoLiquido", moeda(resumo.totalLiquido));
    atualizarTexto("resumoComissao", moeda(resumo.totalComissao));
    atualizarTexto("resumoCustoProducao", moeda(resumo.custoProducao));
    atualizarTexto("resumoTransporte", moeda(resumo.custoTransporte));
    atualizarTexto("resumoCustos", moeda(resumo.custosTotais));
    atualizarTexto("resumoRecebido", moeda(resumo.totalRecebido));
    atualizarTexto("resumoCaixaAtual", moeda(resumo.dinheiroFinal));
    atualizarTexto("resumoDiferencaCaixa", moeda(resumo.diferencaCaixa));

    const caixaCard = document.querySelector(".destaque-caixa");
    const textoCaixa = el("textoCaixa");
    if (caixaCard) caixaCard.classList.remove("faltou", "sobrou");

    if (!resumo.dinheiroFinal) {
        if (textoCaixa) textoCaixa.textContent = "Informe o dinheiro final.";
    } else if (resumo.diferencaCaixa > 0) {
        if (caixaCard) caixaCard.classList.add("sobrou");
        if (textoCaixa) textoCaixa.textContent = "Sobrou dinheiro no caixa.";
    } else if (resumo.diferencaCaixa < 0) {
        if (caixaCard) caixaCard.classList.add("faltou");
        if (textoCaixa) textoCaixa.textContent = "Faltou dinheiro no caixa.";
    } else if (textoCaixa) {
        textoCaixa.textContent = "Caixa conferido.";
    }
}

function atualizarCampoComissao() {
    const item = el("itemVenda")?.value;
    const campoQuantidade = el("campoQuantidade");
    const campoComissao = el("campoValorComissao");
    const areaCombo = el("areaCombo");

    if (!campoQuantidade || !campoComissao) return;

    if (item === "Comissão") {
        campoQuantidade.classList.add("oculto");
        campoComissao.classList.remove("oculto");
        if (areaCombo) areaCombo.classList.add("oculto");
        return;
    }

    if (item === "Combo 3 unidades") {
        campoQuantidade.classList.remove("oculto");
        campoComissao.classList.add("oculto");
        if (areaCombo) areaCombo.classList.remove("oculto");
        return;
    }

    campoQuantidade.classList.remove("oculto");
    campoComissao.classList.add("oculto");
    if (areaCombo) areaCombo.classList.add("oculto");
}

function adicionarVenda() {
    const item = el("itemVenda").value;
    const pagamento = el("pagamentoVenda").value;

    if (item === "Comissão") {
        const valor = valorCampo("valorComissao");

        if (valor <= 0) {
            alert("Informe o valor da comissão.");
            return;
        }

        vendas.push({
            tipo: "comissao",
            produto: "Comissão",
            quantidade: 1,
            valorUnitario: valor,
            valorTotal: valor,
            pagamento
        });

        el("valorComissao").value = "";
        atualizarTudo();
        return;
    }

    if (item === "Combo 3 unidades") {
        const quantidadeCombo = Number(el("quantidadeVenda").value || 0);
        const qtdTradicional = Number(el("comboTradicional").value || 0);
        const qtdNinho = Number(el("comboNinho").value || 0);
        const qtdCafe = Number(el("comboCafe").value || 0);
        const valorCombo = valorCampo("valorCombo");

        const totalSabores = qtdTradicional + qtdNinho + qtdCafe;

        if (quantidadeCombo <= 0) {
            alert("Informe a quantidade de combos vendidos.");
            return;
        }

        if (totalSabores !== 3) {
            alert("O combo precisa ter exatamente 3 brigadeiros.");
            return;
        }

        if (valorCombo <= 0) {
            alert("Informe o valor do combo.");
            return;
        }

        const produtos = pegarProdutos();

        const tradicional = produtos.find(p => p.produto === "Tradicional");
        const ninho = produtos.find(p => p.produto === "Ninho");
        const cafe = produtos.find(p => p.produto === "Café");

        const baixaTradicional = qtdTradicional * quantidadeCombo;
        const baixaNinho = qtdNinho * quantidadeCombo;
        const baixaCafe = qtdCafe * quantidadeCombo;

        if (tradicional.sobrou < baixaTradicional) {
            alert("Não tem Tradicional suficiente. Sobra atual: " + tradicional.sobrou + ".");
            return;
        }

        if (ninho.sobrou < baixaNinho) {
            alert("Não tem Ninho suficiente. Sobra atual: " + ninho.sobrou + ".");
            return;
        }

        if (cafe.sobrou < baixaCafe) {
            alert("Não tem Café suficiente. Sobra atual: " + cafe.sobrou + ".");
            return;
        }

        vendas.push({
            tipo: "combo",
            produto: "Combo 3 unidades",
            quantidade: quantidadeCombo,
            valorUnitario: valorCombo,
            valorTotal: valorCombo * quantidadeCombo,
            pagamento,
            sabores: {
                Tradicional: baixaTradicional,
                Ninho: baixaNinho,
                Café: baixaCafe
            }
        });

        el("quantidadeVenda").value = 1;
        atualizarTudo();
        return;
    }

    const produto = pegarProdutos().find(p => p.produto === item);
    const quantidade = Number(el("quantidadeVenda").value || 0);

    if (!produto) {
        alert("Produto não encontrado.");
        return;
    }

    if (quantidade <= 0) {
        alert("Informe a quantidade vendida.");
        return;
    }

    if (produto.valorUnitario <= 0) {
        alert("Informe o valor unitário do produto na aba Preparo.");
        abrirAba("preparo");
        return;
    }

    if (quantidade > produto.sobrou) {
        alert("Não tem quantidade suficiente de " + item + ". Sobra atual: " + produto.sobrou + ".");
        return;
    }

    vendas.push({
        tipo: "doce",
        produto: item,
        quantidade,
        valorUnitario: produto.valorUnitario,
        valorTotal: quantidade * produto.valorUnitario,
        pagamento
    });

    el("quantidadeVenda").value = 1;
    atualizarTudo();
}

function atualizarListaVendas() {
    const lista = el("listaVendas");

    if (!lista) return;

    if (!vendas.length) {
        lista.textContent = "Nenhuma venda lançada ainda.";
        return;
    }

    lista.innerHTML = vendas.map((venda, indice) => {
        let detalhe = "";

        if (venda.tipo === "combo") {
            detalhe = ` | Trad: ${venda.sabores.Tradicional}, Ninho: ${venda.sabores.Ninho}, Café: ${venda.sabores.Café}`;
        }

        return `<div><strong>${indice + 1}.</strong> ${venda.produto} | Qtd: ${venda.quantidade}${detalhe} | ${venda.pagamento} | ${moeda(venda.valorTotal)} <button type="button" onclick="removerVenda(${indice})">Remover</button></div>`;
    }).join("");
}

function removerVenda(indice) {
    vendas.splice(indice, 1);
    atualizarTudo();
}

function montarDia() {
    const resumo = calcularResumo();
    return {
        data_venda: el("dataVenda").value || new Date().toISOString().slice(0, 10),
        preparo: {
            produtos: resumo.produtos,
            trocoInicial: resumo.trocoInicial,
            custoProducao: resumo.custoProducao,
            custoTransporte: resumo.custoTransporte
        },
        lancamentos: vendas,
        resumo
    };
}

function supabaseConfigurado() {
    return typeof SUPABASE_URL !== "undefined" && typeof SUPABASE_ANON_KEY !== "undefined" && SUPABASE_URL.includes("supabase.co") && !SUPABASE_ANON_KEY.includes("COLE_AQUI");
}

async function salvarDia() {
    const dia = montarDia();
    if (!vendas.length) {
        alert("Lance pelo menos uma venda antes de salvar o dia.");
        abrirAba("venda");
        return;
    }

    if (supabaseConfigurado() && window.supabase) {
        const cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error } = await cliente.from("dias_venda").insert([dia]);
        if (error) {
            alert("Erro ao salvar no Supabase: " + error.message);
            return;
        }
        alert("Dia salvo no Supabase.");
        carregarHistorico();
        return;
    }

    diasSalvosLocais.push({ ...dia, id: Date.now() });
    localStorage.setItem("stivalSweetDias", JSON.stringify(diasSalvosLocais));
    alert("Dia salvo no navegador. Configure o Supabase para salvar online.");
    carregarHistorico();
}

async function carregarHistorico() {
    const lista = el("listaHistorico");
    if (!lista) return;

    if (supabaseConfigurado() && window.supabase) {
        const cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data, error } = await cliente.from("dias_venda").select("*").order("data_venda", { ascending: false });
        if (error) {
            lista.textContent = "Erro ao carregar Supabase: " + error.message;
            return;
        }
        renderizarHistorico(data || []);
        return;
    }

    renderizarHistorico(diasSalvosLocais.slice().reverse());
}

function renderizarHistorico(dias) {
    const lista = el("listaHistorico");
    if (!dias.length) {
        lista.textContent = "Nenhum dia salvo ainda.";
        return;
    }
    lista.textContent = dias.map(dia => {
        const resumo = dia.resumo || {};
        return [
            "Data: " + (dia.data_venda || "-"),
            "Total bruto: " + moeda(resumo.totalBruto),
            "Total líquido: " + moeda(resumo.totalLiquido),
            "Comissão: " + moeda(resumo.totalComissao),
            "Custos totais: " + moeda(resumo.custosTotais),
            "Caixa: " + moeda(resumo.diferencaCaixa),
            "-------------------------"
        ].join("\n");
    }).join("\n");
}

function relatorioTexto() {
    const dia = montarDia();
    const resumo = dia.resumo;
    const linhas = [];
    linhas.push("STIVAL SWEET - RELATÓRIO DO DIA");
    linhas.push("Data: " + dia.data_venda);
    linhas.push("");
    linhas.push("PRODUTOS:");
    resumo.produtos.forEach(produto => {
        linhas.push(`${produto.produto}: feita ${produto.feita}, vendeu ${produto.vendida}, sobrou ${produto.sobrou}, total ${moeda(produto.total)}`);
    });
    linhas.push("");
    linhas.push("LANÇAMENTOS:");
    vendas.forEach(venda => linhas.push(`${venda.produto} | Qtd: ${venda.quantidade} | ${venda.pagamento} | ${moeda(venda.valorTotal)}`));
    linhas.push("");
    linhas.push("Total bruto doces: " + moeda(resumo.totalBruto));
    linhas.push("Total líquido doces: " + moeda(resumo.totalLiquido));
    linhas.push("Comissão separada: " + moeda(resumo.totalComissao));
    linhas.push("Custo produção: " + moeda(resumo.custoProducao));
    linhas.push("Transporte/Uber da venda: " + moeda(resumo.custoTransporte));
    linhas.push("Custos totais: " + moeda(resumo.custosTotais));
    linhas.push("Total recebido: " + moeda(resumo.totalRecebido));
    linhas.push("Pix: " + moeda(resumo.pix));
    linhas.push("Dinheiro: " + moeda(resumo.dinheiro));
    linhas.push("Cartão: " + moeda(resumo.cartao));
    linhas.push("Dinheiro esperado: " + moeda(resumo.dinheiroEsperado));
    linhas.push("Dinheiro final: " + moeda(resumo.dinheiroFinal));
    linhas.push("Falta/Sobra caixa: " + moeda(resumo.diferencaCaixa));
    return linhas.join("\n");
}

function enviarWhatsapp() {
    const numero = "5562995294481";
    const link = "https://wa.me/" + numero + "?text=" + encodeURIComponent(relatorioTexto());
    window.open(link, "_blank");
}

function imprimirPdf() {
    window.print();
}

function salvarPreparo() {
    localStorage.setItem("stivalSweetPreparo", JSON.stringify(montarDia().preparo));
    atualizarTudo();
    abrirAba("venda");
}

function limparDia() {
    if (!confirm("Deseja limpar o dia atual?")) return;
    vendas = [];
    document.querySelectorAll("input").forEach(input => {
        if (input.type !== "date") input.value = "";
    });
    el("quantidadeVenda").value = 1;
    el("dataVenda").value = new Date().toISOString().slice(0, 10);
    atualizarTudo();
    abrirAba("preparo");
}

function atualizarTudo() {
    atualizarCampoComissao();
    atualizarControleDoces();
    atualizarResumoTela();
    atualizarListaVendas();
}

function iniciar() {
    el("dataVenda").value = new Date().toISOString().slice(0, 10);
    document.querySelectorAll(".botao-aba").forEach(botao => botao.addEventListener("click", () => abrirAba(botao.dataset.aba)));
    el("btnSalvarPreparo").addEventListener("click", salvarPreparo);
    el("btnAdicionarVenda").addEventListener("click", adicionarVenda);
    el("btnSalvarDia").addEventListener("click", salvarDia);
    el("btnWhatsapp").addEventListener("click", enviarWhatsapp);
    el("btnPdf").addEventListener("click", imprimirPdf);
    el("btnLimparDia").addEventListener("click", limparDia);
    el("btnCarregarHistorico").addEventListener("click", carregarHistorico);
    el("itemVenda").addEventListener("change", atualizarTudo);
    document.querySelectorAll("input, select").forEach(campo => {
        campo.addEventListener("input", atualizarTudo);
        campo.addEventListener("change", atualizarTudo);
    });
    atualizarTudo();
    carregarHistorico();
}

document.addEventListener("DOMContentLoaded", iniciar);
