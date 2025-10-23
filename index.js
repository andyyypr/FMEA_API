const express = require("express");
app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

//importar rutas
const modosRoutes = require("./routes/modosRoutes.js");
const efectosRoutes = require("./routes/efectosRoutes.js");

//rutas base
app.use("/api/modos", modosRoutes);
app.use("/api/efectos", efectosRoutes);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto: ${PORT}`);
});
