const express = require("express");
const app = express();
// Parse JSON bodies
app.use(express.json());
// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3000;

//importar rutas
const modosRoutes = require("./routes/modosRoutes.js");
const efectosRoutes = require("./routes/efectosRoutes.js");
const causasRoutes = require("./routes/causasRoutes.js");
const generalRoutes = require("./routes/generalRoutes.js");

//rutas base
app.use("/api/modos", modosRoutes);
app.use("/api/efectos", efectosRoutes);
app.use("/api/causas", causasRoutes);
app.use("/api/general", generalRoutes);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto: ${PORT}`);
});
