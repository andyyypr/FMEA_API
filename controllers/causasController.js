const db = require("../database/db.js");

class CausasController {
  constructor() {}

  getCausas(req, res) {
    db.query("SELECT * FROM causa_falla", (err, results) => {
      if (err) {
        console.error("Error al obtener las causas:", err);
        return res.status(500).json({ error: "Error al obtener las causas" });
      }
      res.json(results);
    });
  }
  getCausaByID(req, res) {}
  getCausasAsociadaEfecto(req, res) {}
  postIngresarCausa(req, res) {}
  putActualizarCausa(req, res) {}
  deleteEliminarCausa(req, res) {}
  getNprByCausa(req, res) {
    //Obtener el NPR calculado de una causa
  }
}
