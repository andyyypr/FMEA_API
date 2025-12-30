const express = require("express");
const app = express();

// JSON parser: aceptar content-types que contengan "json" y capturar rawBody
app.use(
  express.json({
    type: (req) => {
      const ct = (req.headers["content-type"] || "").toLowerCase();
      return ct.indexOf("json") !== -1;
    },
    verify: (req, res, buf) => {
      try {
        req.rawBody = buf.toString();
      } catch (e) {
        req.rawBody = undefined;
      }
    },
  })
);
// Parse text bodies (algunos clientes envían JSON con Content-Type: text/plain)
app.use(express.text({ type: "text/*" }));
// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3000;

//importar rutas
const modosRoutes = require("./routes/modosRoutes.js");
const efectosRoutes = require("./routes/efectosRoutes.js");
const causasRoutes = require("./routes/causasRoutes.js");
const generalRoutes = require("./routes/generalRoutes.js");
const loguinRoutes = require("./routes/loguinRoutes.js");
const iteracionesRoutes = require("./routes/iteracionesRoutes.js");

//rutas base
app.use("/api/modos", modosRoutes);
app.use("/api/efectos", efectosRoutes);
app.use("/api/causas", causasRoutes);
app.use("/api/general", generalRoutes);
app.use("/api/loguin", loguinRoutes);
app.use("/api/iteraciones", iteracionesRoutes);

// Logging middleware: registra información básica de cada petición
app.use((req, res, next) => {
  try {
    console.log("---- Incoming Request ----");
    console.log(`${req.method} ${req.originalUrl}`);
    console.log("Content-Type:", req.headers["content-type"]);
    // Mostrar headers relevantes (evitar volcar todo en producción)
    console.log("Headers:", {
      host: req.headers.host,
      accept: req.headers.accept,
      "user-agent": req.headers["user-agent"],
      "content-type": req.headers["content-type"],
    });
    // El body puede ser objeto (json) o string (text/plain)
    console.log("Raw body type:", typeof req.body);
    console.log("Raw body:", req.body);
  } catch (e) {
    console.error("Error logging request:", e);
  }
  next();
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto: ${PORT}`);
});
