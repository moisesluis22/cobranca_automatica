// app.js - Frontend completo do sistema de cobranças + agendamentos

const apiBase = ""; // usa o mesmo domínio do server.js

// --------------------------------------------------------------------
//  FUNÇÃO GLOBAL PARA FAZER GET
// --------------------------------------------------------------------
async function apiGet(path) {
  const res = await fetch(apiBase + path);
  return res.json();
}

// --------------------------------------------------------------------
//  FUNÇÃO GLOBAL PARA FAZER POST
// --------------------------------------------------------------------
async function apiPost(path, body) {
  const res = await fetch(apiBase + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

// --------------------------------------------------------------------
//  FUNÇÃO GLOBAL PARA FAZER PUT
// --------------------------------------------------------------------
async function apiPut(path, body) {
  const res = await fetch(apiBase + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

// ===============================================================
// ≡ 1. CONTROLE DOS MENUS COLAPSÁVEIS
// ===============================================================

// Seleciona todos os botões do menu lateral
const navButtons = document.querySelectorAll(".nav-btn");
// Seleciona todas as seções de conteúdo
const sections = document.querySelectorAll(".section-block");

// Função para mostrar uma seção e esconder as outras
function showSection(sectionId) {
  sections.forEach((sec) => sec.classList.add("hidden"));
  navButtons.forEach((btn) => btn.classList.remove("active"));

  document.getElementById(`section-${sectionId}`).classList.remove("hidden");
  document.querySelector(`[data-section='${sectionId}']`).classList.add("active");
}

// Adiciona evento aos botões do menu
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.dataset.section;
    showSection(section);
  });
});

// Deixa dashboard como inicial
showSection("dashboard");

// ===============================================================
// ≡ 2. STATUS DO SISTEMA (API + WHATSAPP)
// ===============================================================

async function atualizarStatus() {
  try {
    const st = await apiGet("/status");

    const dot = document.getElementById("whatsapp-status-dot");
    const text = document.getElementById("whatsapp-status-text");

    if (st.whatsappReady) {
      dot.classList.remove("bg-red-500");
      dot.classList.add("bg-green-500");
      text.textContent = "WhatsApp conectado";
    } else {
      dot.classList.remove("bg-green-500");
      dot.classList.add("bg-red-500");
      text.textContent = "Escaneie o QR Code no terminal";
    }

    // Detalhado
    document.getElementById("status-api-text").textContent = st.api === "ok" ? "OK" : "Erro";
    document.getElementById("status-whatsapp-text").textContent = st.whatsappReady ? "Conectado" : "Desconectado";

  } catch {
    console.warn("Não foi possível atualizar o status...");
  }
}

setInterval(atualizarStatus, 3000);
atualizarStatus();

// ===============================================================
// ≡ 3. CLIENTES
// ===============================================================

const listaClientes = document.getElementById("lista-clientes");
const formCliente = document.getElementById("form-cliente");
const selectClienteAssinatura = document.querySelector("#form-assinatura select[name='cliente_id']");
const selectClienteAgendamento = document.querySelector("#form-agendamento select[name='cliente_id']");

async function carregarClientes() {
  const data = await apiGet("/api/clientes");
  listaClientes.innerHTML = "";
  selectClienteAssinatura.innerHTML = '<option value="">Selecione um cliente</option>';
  selectClienteAgendamento.innerHTML = '<option value="">Selecione um cliente</option>';

  data.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = `${c.id} • ${c.nome} • ${c.whatsapp}`;
    listaClientes.appendChild(li);

    const opt1 = document.createElement("option");
    opt1.value = c.id;
    opt1.textContent = `${c.nome} (${c.whatsapp})`;
    selectClienteAssinatura.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = c.id;
    opt2.textContent = `${c.nome} (${c.whatsapp})`;
    selectClienteAgendamento.appendChild(opt2);
  });

  document.getElementById("card-total-clientes").textContent = data.length;
}

formCliente.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(formCliente);
  const body = {
    nome: fd.get("nome"),
    whatsapp: fd.get("whatsapp"),
    email: fd.get("email")
  };

  await apiPost("/api/clientes", body);
  formCliente.reset();
  carregarClientes();
});

// ===============================================================
// ≡ 4. PRODUTOS
// ===============================================================

const formProduto = document.getElementById("form-produto");
const listaProdutos = document.getElementById("lista-produtos");

async function carregarProdutos() {
  const data = await apiGet("/api/produtos");
  listaProdutos.innerHTML = "";

  data.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = `${p.id} • ${p.nome} • R$ ${p.valor}`;
    listaProdutos.appendChild(li);
  });
}

formProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(formProduto);
  const body = {
    nome: fd.get("nome"),
    valor: parseFloat(fd.get("valor"))
  };

  await apiPost("/api/produtos", body);
  formProduto.reset();
  carregarProdutos();
});

// ===============================================================
// ≡ 5. MENSAGEM PADRÃO
// ===============================================================

const formMensagem = document.getElementById("form-mensagem");

async function carregarMensagem() {
  const msg = await apiGet("/api/mensagem");

  if (msg) {
    formMensagem.descricao.value = msg.descricao;
    formMensagem.texto.value = msg.texto;
  }
}

formMensagem.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(formMensagem);
  const body = {
    descricao: fd.get("descricao"),
    texto: fd.get("texto")
  };

  await apiPost("/api/mensagem", body);
  alert("Mensagem padrão salva!");
});

// ===============================================================
// ≡ 6. ASSINATURAS
// ===============================================================

const listaAssinaturas = document.getElementById("lista-assinaturas");
const formAssinatura = document.getElementById("form-assinatura");

async function carregarAssinaturas() {
  const data = await apiGet("/api/assinaturas");
  listaAssinaturas.innerHTML = "";

  data.forEach((a) => {
    const li = document.createElement("li");
    li.textContent =
      `${a.id} • ${a.cliente_nome} — Plano: ${a.nome_plano} — R$ ${a.valor_total} — Próxima: ${a.data_proxima_cobranca} (${a.recorrencia})`;
    listaAssinaturas.appendChild(li);
  });

  document.getElementById("card-total-assinaturas").textContent = data.length;

  // DASHBOARD – próximas cobranças
  const dashList = document.getElementById("dashboard-proximas-cobrancas");
  dashList.innerHTML = "";

  const sorted = [...data].sort((a, b) =>
    a.data_proxima_cobranca.localeCompare(b.data_proxima_cobranca)
  );

  sorted.slice(0, 10).forEach((a) => {
    const li = document.createElement("li");
    li.textContent = `${a.cliente_nome} — ${a.nome_plano} — ${a.data_proxima_cobranca}`;
    dashList.appendChild(li);
  });
}

formAssinatura.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(formAssinatura);
  const body = {
    cliente_id: Number(fd.get("cliente_id")),
    nome_plano: fd.get("nome_plano"),
    valor_total: parseFloat(fd.get("valor_total")),
    data_proxima_cobranca: fd.get("data_proxima_cobranca"),
    recorrencia: fd.get("recorrencia"),
    produtos_ids: []
  };

  await apiPost("/api/assinaturas", body);
  formAssinatura.reset();
  carregarAssinaturas();
});

// Testar cobrança na hora
document.getElementById("btn-cobranca-agora").addEventListener("click", async () => {
  await apiPost("/api/cobrancas/run", {});
  alert("Cobranças executadas! Veja o WhatsApp e o histórico.");
});

// ===============================================================
// ≡ 7. AGENDAMENTOS
// ===============================================================

const formAgendamento = document.getElementById("form-agendamento");
const listaAgendamentos = document.getElementById("lista-agendamentos");

async function carregarAgendamentos() {
  const data = await apiGet("/api/agendamentos");
  listaAgendamentos.innerHTML = "";

  data.forEach((ag) => {
    const li = document.createElement("li");
    li.textContent =
      `${ag.id} • ${ag.cliente_nome} — ${ag.tipo} — ${ag.horario}`;
    listaAgendamentos.appendChild(li);
  });
}

// Exibir campos conforme tipo selecionado
formAgendamento.tipo.addEventListener("change", () => {
  const tipo = formAgendamento.tipo.value;

  formAgendamento.data_unica.classList.add("hidden");
  formAgendamento.dia_semana.classList.add("hidden");
  formAgendamento.dia_mes.classList.add("hidden");

  if (tipo === "unico") formAgendamento.data_unica.classList.remove("hidden");
  if (tipo === "semanal") formAgendamento.dia_semana.classList.remove("hidden");
  if (tipo === "mensal") formAgendamento.dia_mes.classList.remove("hidden");
});

formAgendamento.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(formAgendamento);
  const body = {
    cliente_id: Number(fd.get("cliente_id")),
    assinatura_id: null,
    mensagem: fd.get("mensagem"),
    tipo: fd.get("tipo"),
    horario: fd.get("horario"),
    data_unica: fd.get("data_unica") || null,
    dia_semana: fd.get("dia_semana") || null,
    dia_mes: fd.get("dia_mes") || null
  };

  await apiPost("/api/agendamentos", body);
  formAgendamento.reset();
  carregarAgendamentos();
});

// ===============================================================
// ≡ 8. HISTÓRICO
// ===============================================================

const listaEnvios = document.getElementById("lista-envios");

async function carregarEnvios() {
  const data = await apiGet("/api/envios");
  listaEnvios.innerHTML = "";

  data.forEach((e) => {
    const li = document.createElement("li");
    li.textContent =
      `[${e.data_envio}] • ${e.cliente_nome} — Plano: ${e.nome_plano} — ${e.status}`;
    listaEnvios.appendChild(li);
  });

  // Atualiza dashboard
  const hoje = new Date().toISOString().split("T")[0];
  const totalHoje = data.filter((e) => e.data_envio.startsWith(hoje)).length;
  document.getElementById("card-envios-hoje").textContent = totalHoje;

  const dashEnvios = document.getElementById("dashboard-ultimos-envios");
  dashEnvios.innerHTML = "";
  data.slice(0, 10).forEach((e) => {
    const li = document.createElement("li");
    li.textContent =
      `${e.data_envio} — ${e.cliente_nome} — ${e.status}`;
    dashEnvios.appendChild(li);
  });
}

document.getElementById("btn-recarregar-envios").addEventListener("click", carregarEnvios);

// ===============================================================
// ≡ 9. INICIALIZAÇÃO GERAL
// ===============================================================

async function init() {
  carregarClientes();
  carregarProdutos();
  carregarMensagem();
  carregarAssinaturas();
  carregarAgendamentos();
  carregarEnvios();
}

init();
async function verificarQR() {
  try {
    const res = await fetch("/api/qr");
    const data = await res.json();

    const qrArea = document.getElementById("qr-area");
    const qrImg = document.getElementById("qr-image");

    if (data.status === "ok") {
      qrArea.classList.remove("hidden");
      qrImg.src = data.qr;
    }
  } catch (e) {
    console.log("Erro ao buscar QR:", e);
  }
}

// chama junto com os outros setInterval / init
setInterval(verificarQR, 5000);
verificarQR();

