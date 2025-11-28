// server.js — Sistema de Cobrança + WhatsApp + Agendamentos
// TOTALMENTE PRONTO PARA RODAR NO RAILWAY

const express = require("express");
const cors = require("cors");
const path = require("path");
const nodeCron = require("node-cron");
const db = require("./db");

// WHATSAPP
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");

// Variáveis globais
let whatsappReady = false;
let ultimoQRBase64 = null;

// CLIENT WHATSAPP CONFIG (COMPATÍVEL COM RAILWAY)
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./.wwebjs_auth"
  }),
  puppeteer: {
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-features=TranslateUI",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-extensions",
      "--disable-infobars",
      "--no-first-run",
      "--no-default-browser-check"
    ]
  }
});

// QR GERADO
client.on("qr", async (qr) => {
  console.log("📱 QR code recebido — Convertendo...");

  ultimoQRBase64 = await QRCode.toDataURL(qr, {
    margin: 2,
    width: 400
  });

  // Exibe também no terminal
  qrcodeTerminal.generate(qr, { small: true });
});

// QUANDO CONECTA
client.on("ready", () => {
  whatsappReady = true;
  ultimoQRBase64 = null;
  console.log("✅ WhatsApp conectado com sucesso!");
});

client.on("auth_failure", (e) => {
  console.log("❌ Falha de autenticação:", e);
});

client.initialize();

// EXPRESS SERVER
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// HELPERS
function formatNumber(number) {
  const dig = number.replace(/\D/g, "");
  return (dig.startsWith("55") ? dig : "55" + dig) + "@c.us";
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function diferencaDias(dataFutura, hoje) {
  const d1 = new Date(dataFutura);
  const d2 = new Date(hoje);
  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
}

function calcularProximaData(dataInicial, recorrencia) {
  const dt = new Date(dataInicial + "T00:00");
  if (recorrencia === "mensal") dt.setMonth(dt.getMonth() + 1);
  if (recorrencia === "semanal") dt.setDate(dt.getDate() + 7);
  if (recorrencia === "anual") dt.setFullYear(dt.getFullYear() + 1);
  return dt.toISOString().slice(0, 10);
}

function renderTemplate(texto, vars) {
  return texto
    .replace(/\{nome\}/g, vars.nome)
    .replace(/\{plano\}/g, vars.plano)
    .replace(/\{valor\}/g, vars.valor)
    .replace(/\{vencimento\}/g, vars.vencimento)
    .replace(/\{dias\}/g, vars.dias);
}

// =========================
// API STATUS / QR CODE
// =========================

// ROTA PARA O PANEL PEGAR O QR
app.get("/api/qr", (req, res) => {
  if (!ultimoQRBase64) return res.json({ status: "no_qr" });
  res.json({ status: "ok", qr: ultimoQRBase64 });
});

// STATUS DO SISTEMA
app.get("/status", (req, res) => {
  res.json({
    api: "ok",
    whatsapp: whatsappReady
  });
});

// =========================
// CLIENTES
// =========================
app.get("/api/clientes", (req, res) => {
  res.json(db.prepare("SELECT * FROM clientes ORDER BY id DESC").all());
});

app.post("/api/clientes", (req, res) => {
  const { nome, whatsapp, email } = req.body;

  if (!nome || !whatsapp)
    return res.status(400).json({ error: "Nome e WhatsApp obrigatórios" });

  const r = db.prepare(`
    INSERT INTO clientes (nome, whatsapp, email, status)
    VALUES (?, ?, ?, 'ativo')
  `).run(nome, whatsapp, email);

  res.json({ id: r.lastInsertRowid });
});

// =========================
// PRODUTOS
// =========================
app.get("/api/produtos", (req, res) => {
  res.json(db.prepare("SELECT * FROM produtos ORDER BY nome").all());
});

app.post("/api/produtos", (req, res) => {
  const { nome, valor } = req.body;

  const r = db.prepare(`
    INSERT INTO produtos (nome, valor)
    VALUES (?, ?)
  `).run(nome, valor);

  res.json({ id: r.lastInsertRowid });
});

// =========================
// MENSAGEM PADRÃO
// =========================
app.get("/api/mensagem", (req, res) => {
  res.json(db.prepare("SELECT * FROM mensagens ORDER BY id DESC LIMIT 1").get());
});

app.post("/api/mensagem", (req, res) => {
  const { descricao, texto } = req.body;

  db.prepare("DELETE FROM mensagens").run();

  const r = db.prepare(`
    INSERT INTO mensagens (descricao, texto)
    VALUES (?, ?)
  `).run(descricao, texto);

  res.json({ id: r.lastInsertRowid });
});

// =========================
// ASSINATURAS
// =========================
app.get("/api/assinaturas", (req, res) => {
  res.json(
    db
      .prepare(
        `
    SELECT a.*, c.nome AS cliente_nome, c.whatsapp
    FROM assinaturas a
    JOIN clientes c ON c.id = a.cliente_id
  `
      )
      .all()
  );
});

app.post("/api/assinaturas", (req, res) => {
  const {
    cliente_id,
    nome_plano,
    valor_total,
    data_proxima_cobranca,
    recorrencia
  } = req.body;

  const r = db.prepare(`
    INSERT INTO assinaturas
    (cliente_id, nome_plano, valor_total, data_proxima_cobranca, recorrencia, status)
    VALUES (?, ?, ?, ?, ?, 'ativa')
  `).run(
    cliente_id,
    nome_plano,
    valor_total,
    data_proxima_cobranca,
    recorrencia
  );

  res.json({ id: r.lastInsertRowid });
});

// =========================
// AGENDAMENTOS
// =========================
app.get("/api/agendamentos", (req, res) => {
  res.json(
    db
      .prepare(
        `
    SELECT a.*, c.nome AS cliente_nome, c.whatsapp
    FROM agendamentos a
    JOIN clientes c ON c.id = a.cliente_id
    WHERE a.ativo = 1
  `
      )
      .all()
  );
});

app.post("/api/agendamentos", (req, res) => {
  const {
    cliente_id,
    assinatura_id,
    mensagem,
    tipo,
    dia_semana,
    dia_mes,
    data_unica,
    horario
  } = req.body;

  const r = db.prepare(`
    INSERT INTO agendamentos
    (cliente_id, assinatura_id, mensagem, tipo, dia_semana, dia_mes, data_unica, horario, ativo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    cliente_id,
    assinatura_id,
    mensagem,
    tipo,
    dia_semana,
    dia_mes,
    data_unica,
    horario
  );

  res.json({ id: r.lastInsertRowid });
});

// =========================
// HISTÓRICO
// =========================
app.get("/api/envios", (req, res) => {
  res.json(
    db.prepare(
      `
    SELECT e.*, c.nome AS cliente_nome, a.nome_plano
    FROM envios e
    JOIN clientes c ON c.id = e.cliente_id
    JOIN assinaturas a ON a.id = e.assinatura_id
    ORDER BY e.data_envio DESC
  `
    ).all()
  );
});

// =========================
// ROTINA — COBRANÇAS AUTOMÁTICAS
// =========================
nodeCron.schedule("0 9 * * *", async () => {
  if (!whatsappReady) return;

  const hoje = formatDate(new Date());
  const msg = db
    .prepare("SELECT texto FROM mensagens ORDER BY id DESC LIMIT 1")
    .get();

  const modelo =
    msg?.texto ||
    "Olá {nome}, sua assinatura {plano} vence em {dias} dias. Valor: R$ {valor}. Vencimento: {vencimento}.";

  const assinaturas = db.prepare(`
    SELECT a.*, c.nome AS cliente_nome, c.whatsapp
    FROM assinaturas a
    JOIN clientes c ON c.id = a.cliente_id
    WHERE a.status = 'ativa'
  `).all();

  for (const a of assinaturas) {
    const faltam = diferencaDias(a.data_proxima_cobranca, hoje);

    if (![3, 2, 1, 0].includes(faltam)) continue;

    const mensagemFinal = renderTemplate(modelo, {
      nome: a.cliente_nome,
      plano: a.nome_plano,
      valor: a.valor_total.toFixed(2).replace(".", ","),
      vencimento: a.data_proxima_cobranca.split("-").reverse().join("/"),
      dias: faltam
    });

    try {
      await client.sendMessage(formatNumber(a.whatsapp), mensagemFinal);

      db.prepare(`
        INSERT INTO envios (cliente_id, assinatura_id, data_envio, mensagem_enviada, status)
        VALUES (?, ?, datetime('now'), ?, 'sucesso')
      `).run(a.cliente_id, a.id, mensagemFinal);

      console.log(`📨 Enviado para ${a.cliente_nome} — faltam ${faltam} dias`);

      if (faltam === 0) {
        const nova = calcularProximaData(
          a.data_proxima_cobranca,
          a.recorrencia
        );
        db.prepare(
          "UPDATE assinaturas SET data_proxima_cobranca = ? WHERE id = ?"
        ).run(nova, a.id);
      }
    } catch (err) {
      console.error("Erro ao enviar:", err.message);
    }
  }
});

// =========================
// AGENDAMENTOS (a cada minuto)
// =========================
nodeCron.schedule("* * * * *", async () => {
  if (!whatsappReady) return;

  const agora = new Date();
  const hora = agora.toTimeString().slice(0, 5);
  const hoje = formatDate(agora);
  const diaSemana = agora.getDay();
  const diaMes = agora.getDate();

  const items = db.prepare(`
    SELECT a.*, c.nome AS cliente_nome, c.whatsapp
    FROM agendamentos a
    JOIN clientes c ON c.id = a.cliente_id
    WHERE a.ativo = 1
  `).all();

  for (const ag of items) {
    if (ag.horario !== hora) continue;

    let executar = false;

    if (ag.tipo === "unico" && ag.data_unica === hoje) executar = true;
    if (ag.tipo === "diario") executar = true;
    if (ag.tipo === "semanal" && ag.dia_semana == diaSemana) executar = true;
    if (ag.tipo === "mensal" && ag.dia_mes == diaMes) executar = true;

    if (!executar) continue;

    const mensagem = ag.mensagem
      .replace("{nome}", ag.cliente_nome)
      .replace("{hoje}", hoje.split("-").reverse().join("/"));

    try {
      await client.sendMessage(formatNumber(ag.whatsapp), mensagem);

      console.log(`⏰ Agendamento enviado para ${ag.cliente_nome}`);

      if (ag.tipo === "unico") {
        db.prepare("UPDATE agendamentos SET ativo = 0 WHERE id = ?").run(ag.id);
      }
    } catch (err) {
      console.error("Erro ao enviar:", err.message);
    }
  }
});

// START
app.listen(PORT, () =>
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
);
