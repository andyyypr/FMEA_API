const db = require("../database/db.js");

class EfectosController {
  constructor() {}

  getEfectos(req, res) {
    db.query("SELECT * FROM efecto_falla", (err, results) => {
      if (err) {
        console.error("Error al obtener los efectos:", err);
        return res.status(500).json({ error: "Error al obtener los efectos" });
      }
      res.json(results);
    });
  }
  getEfectoByID(req, res) {
    const { id } = req.params;
    db.query(
      "SELECT * FROM efecto_falla Where id_efecto = ?",
      [id],
      (err, results) => {
        if (err) {
          console.error("Error al obtener el efecto:", err);
          return res.status(500).json({ error: "Error al obtener el efecto" });
        }
        res.json(results);
      }
    );
  }
  postIngresarEfecto(req, res) {
    const { id_modo, descripcion } = req.body;
    try {
      db.query(
        "INSERT INTO efecto_falla (id_modo, descripcion) VALUES (?, ?)",
        [id_modo, descripcion],
        (err, result) => {
          if (err) {
            console.error("Error al insertar el efecto:", err);
            return res
              .status(500)
              .json({ error: "Error al insertar el efecto" });
          }
          res.status(201).json({
            message: "Efecto insertado correctamente",
            id: result.insertId,
          });
        }
      );
    } catch (error) {
      console.error("Error al insertar el efecto:", error);
      res.status(500).json({ error: "Error al insertar el efecto" });
    }
  }
  putActualizarEfecto(req, res) {
    const { id } = req.params;
    const { id_modo, descripcion } = req.body;

    try {
      db.query(
        "UPDATE efecto_falla SET id_modo = ?, descripcion = ? WHERE id_efecto = ?",
        [id_modo, descripcion, id],
        (err, result) => {
          if (err) {
            console.error("Error al actualizar el efecto:", err);
            return res
              .status(500)
              .json({ error: "Error al actualizar el efecto" });
          }
          res.json({ message: "Efecto actualizado correctamente" });
        }
      );
    } catch (error) {
      console.error("Error al actualizar el efecto:", error);
      res.status(500).json({ error: "Error al actualizar el efecto" });
    }
  }
  deleteEliminarEfecto(req, res) {
    const { id } = req.params;
    try {
      db.query(
        "DELETE FROM efecto_falla WHERE id_efecto = ?",
        [id],
        (err, result) => {
          if (err) {
            console.error("Error al eliminar el efecto:", err);
            return res
              .status(500)
              .json({ error: "Error al eliminar el efecto" });
          }
          res.json({ message: "Efecto eliminado correctamente" });
        }
      );
    } catch (error) {
      console.error("Error al eliminar el efecto:", error);
      res.status(500).json({ error: "Error al eliminar el efecto" });
    }
  }
}

module.exports = new EfectosController();
