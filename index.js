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

// Habilitar upload de arquivos
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
      // Helper para comparar valores
      eq: (a, b) => a === b,
    },
  })
);

app.set("view engine", "handlebars");
app.set("views", "./views");

// ==============================
// 📌 Conexão com MySQL
// ==============================
const conexao = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "projetonodejs",
});

conexao.connect((erro) => {
  if (erro) throw erro;
  console.log("✅ Conexão com banco de dados estabelecida");
});

// ==============================
// 📌 Rotas
// ==============================

// Rota principal → lista produtos
app.get("/", (req, res) => {
  const situacao = req.query.situacao;
  const sql = "SELECT * FROM produto";

  conexao.query(sql, (erro, resultado) => {
    if (erro) throw erro;

    res.render("formulario", {
      produto: resultado,
      situacao,
      mensagemSucesso: "Produto cadastrado com sucesso!",
      mensagemErro: "Campos obrigatórios não preenchidos ou valor inválido.",
    });
  });
});

// Rota de Cadastro (POST)
app.post("/cadastrar", (req, res) => {
  const { nome, valor } = req.body;
  let imagem = req.files?.imagem?.name || "";

  // Validação
  if (!nome || !valor || isNaN(valor) || !imagem) {
    return res.redirect("/?situacao=erro");
  }

  const sql = `INSERT INTO produto(nome, valor, imagem) VALUES ('${nome}', '${valor}', '${imagem}')`;

  conexao.query(sql, (erro) => {
    if (erro) return res.redirect("/?situacao=erro");

    req.files.imagem.mv(__dirname + "/imagens/" + imagem);
    res.redirect("/?situacao=ok");
  });
});

// Remover produto (GET)
app.get("/remover/:idProduto&:imagem", (req, res) => {
  const { idProduto, imagem } = req.params;

  conexao.query(
    `DELETE FROM produto WHERE idProduto = ${idProduto}`,
    (erro) => {
      if (erro) throw erro;

      fs.unlink(__dirname + "/imagens/" + imagem, (erroImg) => {
        if (erroImg) console.log("Erro ao apagar imagem:", erroImg.message);
      });

      res.redirect("/");
    }
  );
});

// Formulário de edição (GET)
app.get("/formularioEditar/:id", (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM produto WHERE idProduto = ${id}`;

  conexao.query(sql, (erro, resultado) => {
    if (erro || resultado.length === 0) {
      return res.send("Produto não encontrado.");
    }
    res.render("formularioEditar", { produto: resultado[0] });
  });
});

// Alterar produto (POST)
app.post("/alterar", (req, res) => {
  const { nome, valor, codigo, nomeImagem } = req.body;
  let imagem = nomeImagem;

  if (!nome || !valor || isNaN(valor)) {
    return res.redirect(`/editarFormulario/${codigo}?situacao=erro`);
  }

  if (req.files?.imagem) {
    imagem = req.files.imagem.name;
    req.files.imagem.mv(__dirname + "/imagens/" + imagem, (err) => {
      if (err) {
        console.log(err);
        return res.redirect(`/editarFormulario/${codigo}?situacao=erro`);
      }
    });
  }

  const sql = `UPDATE produto SET nome='${nome}', valor=${valor}, imagem='${imagem}' WHERE idProduto=${codigo}`;

  conexao.query(sql, (erro) => {
    if (erro) {
      console.log("Erro ao atualizar:", erro);
      return res.redirect(`/editarFormulario/${codigo}?situacao=erro`);
    }
    res.redirect("/?situacao=ok");
  });
});

// ==============================
// 📌 Servidor
// ==============================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
