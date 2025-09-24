// ==============================
// 📌 Importação de módulos
// ==============================
const express = require("express");
const fileupload = require("express-fileupload");
const { engine } = require("express-handlebars");
const mysql = require("mysql2");
const fs = require("fs");

// ==============================
// 📌 Configuração inicial
// ==============================
const app = express();

// Middleware para processar formulários (req.body)
app.use(express.urlencoded({ extended: true }));

// Middleware para upload de arquivos
app.use(fileupload());

// Arquivos estáticos
app.use("/bootstrap", express.static("./node_modules/bootstrap/dist"));
app.use("/css", express.static("./css"));
app.use("/imagens", express.static("./imagens"));

// ==============================
// 📌 Configuração do Handlebars
// ==============================
app.engine(
  "handlebars",
  engine({
    defaultLayout: "main", // Layout padrão
    partialsDir: __dirname + "/views/partials", // Partials
    helpers: {
      eq: (a, b) => a === b, // Helper para comparação
    },
  })
);

app.set("view engine", "handlebars");
app.set("views", "./views");

// ==============================
// 📌 Conexão com MySQL (Pool)
// ==============================
const conexao = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "projetonodejs",
});

conexao.getConnection((erro) => {
  if (erro) {
    console.error("❌ Erro ao conectar com banco:", erro.message);
    return;
  }
  console.log("✅ Conexão com banco de dados estabelecida");
});

// ==============================
// 📌 Rotas
// ==============================

// Página principal
app.get("/", (req, res) => {
  const situacao = req.query.situacao;
  const sql = "SELECT * FROM produto";

  conexao.query(sql, (erro, resultado) => {
    if (erro) {
      console.error("❌ Erro ao buscar produtos:", erro);
      return res.send("Erro ao carregar produtos.");
    }

    res.render("formulario", {
      produto: resultado,
      situacao,
      mensagemSucesso: "Produto cadastrado com sucesso!",
      mensagemErro: "Campos obrigatórios não preenchidos ou valor inválido.",
    });
  });
});

// Cadastro de produto
app.post("/cadastrar", (req, res) => {
  const { nome, valor } = req.body;
  let imagem = req.files?.imagem?.name || "";

  // Validação
  if (!nome || !valor || isNaN(valor) || !imagem) {
    return res.redirect("/?situacao=erro");
  }

  const sql = `INSERT INTO produto(nome, valor, imagem) VALUES (?, ?, ?)`;

  conexao.query(sql, [nome, valor, imagem], (erro) => {
    if (erro) {
      console.error("❌ Erro ao cadastrar produto:", erro);
      return res.redirect("/?situacao=erro");
    }

    req.files.imagem.mv(__dirname + "/imagens/" + imagem, (err) => {
      if (err) {
        console.error("❌ Erro ao mover imagem:", err);
        return res.redirect("/?situacao=erro");
      }

      res.redirect("/?situacao=ok");
    });
  });
});

// Remover produto
app.get("/remover/:idProduto&:imagem", (req, res) => {
  const { idProduto, imagem } = req.params;

  conexao.query(
    `DELETE FROM produto WHERE idProduto = ?`,
    [idProduto],
    (erro) => {
      if (erro) {
        console.error("❌ Erro ao remover produto:", erro);
        return res.redirect("/");
      }

      fs.unlink(__dirname + "/imagens/" + imagem, (erroImg) => {
        if (erroImg) {
          console.warn("⚠️ Erro ao apagar imagem:", erroImg.message);
        }
      });

      res.redirect("/");
    }
  );
});

// Formulário de edição
app.get("/formularioEditar/:id", (req, res) => {
  const id = req.params.id;

  conexao.query(
    `SELECT * FROM produto WHERE idProduto = ?`,
    [id],
    (erro, resultado) => {
      if (erro || resultado.length === 0) {
        return res.send("Produto não encontrado.");
      }

      res.render("formularioEditar", { produto: resultado[0] });
    }
  );
});

// Alterar produto
app.post("/alterar", (req, res) => {
  const { nome, valor, codigo, nomeImagem } = req.body;
  let imagem = nomeImagem;

  if (!nome || !valor || isNaN(valor)) {
    return res.redirect(`/formularioEditar/${codigo}?situacao=erro`);
  }

  // Atualizar imagem se nova foi enviada
  if (req.files?.imagem) {
    imagem = req.files.imagem.name;
    req.files.imagem.mv(__dirname + "/imagens/" + imagem, (err) => {
      if (err) {
        console.error("❌ Erro ao mover imagem:", err);
        return res.redirect(`/formularioEditar/${codigo}?situacao=erro`);
      }
    });
  }

  const sql = `UPDATE produto SET nome = ?, valor = ?, imagem = ? WHERE idProduto = ?`;

  conexao.query(sql, [nome, valor, imagem, codigo], (erro) => {
    if (erro) {
      console.error("❌ Erro ao atualizar produto:", erro);
      return res.redirect(`/formularioEditar/${codigo}?situacao=erro`);
    }

    res.redirect("/?situacao=ok");
  });
});

// ==============================
// 📌 Inicializar servidor
// ==============================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
