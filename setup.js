const db = require("./db");

db.exec(`
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'ativo'
);

CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  valor REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS assinaturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  nome_plano TEXT NOT NULL,
  valor_total REAL NOT NULL,
  data_proxima_cobranca TEXT NOT NULL,
  recorrencia TEXT NOT NULL,
  status TEXT DEFAULT 'ativa',
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS assinatura_produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assinatura_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE TABLE IF NOT EXISTS mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao TEXT NOT NULL,
  texto TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS envios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  assinatura_id INTEGER NOT NULL,
  data_envio TEXT NOT NULL,
  mensagem_enviada TEXT NOT NULL,
  status TEXT NOT NULL,
  erro TEXT,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id)
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  assinatura_id INTEGER,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL,
  dia_semana INTEGER,
  dia_mes INTEGER,
  data_unica TEXT,
  horario TEXT NOT NULL,
  ativo INTEGER DEFAULT 1,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id)
);
`);

const msgCount = db.prepare("SELECT COUNT(*) AS total FROM mensagens").get().total;

if (msgCount === 0) {
  db.prepare(`
    INSERT INTO mensagens (descricao, texto)
    VALUES ('Padrão cobrança', 
      'Olá {nome}! Tudo bem?\\n\\n'
      || 'Passando para lembrar que sua assinatura {plano} vence hoje.\\n\\n'
      || 'Valor: R$ {valor}\\nVencimento: {vencimento}\\n\\n'
      || 'Qualquer dúvida estou por aqui 😊'
    )
  `).run();
}

console.log("📦 Banco criado com sucesso!");
