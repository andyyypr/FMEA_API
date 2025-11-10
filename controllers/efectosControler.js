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
    // Ahora el id del modo se recibe en la ruta: POST /api/efectos/:id
    const { id } = req.params;
    const { descripcion } = req.body || {};

    if (!id)
      return res
        .status(400)
        .json({ error: "Se requiere id del modo en la ruta" });
    if (!descripcion)
      return res
        .status(400)
        .json({ error: "Falta campo 'descripcion' en el body" });

    const idModoNum = Number(id);
    if (!Number.isInteger(idModoNum) || idModoNum <= 0) {
      return res.status(400).json({ error: "id de modo inválido" });
    }

    try {
      // Comprobar que el modo existe
      db.query(
        "SELECT id_modo FROM modo_falla WHERE id_modo = ?",
        [idModoNum],
        (errCheck, rows) => {
          if (errCheck) {
            console.error("Error al comprobar modo:", errCheck);
            return res.status(500).json({ error: "Error al comprobar modo" });
          }
          if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "Modo no encontrado" });
          }

          // Insertar el efecto asociado al modo
          db.query(
            "INSERT INTO efecto_falla (id_modo, descripcion) VALUES (?, ?)",
            [idModoNum, descripcion],
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
        }
      );
    } catch (error) {
      console.error("Error al insertar el efecto:", error);
      res.status(500).json({ error: "Error al insertar el efecto" });
    }
  }
  putActualizarEfecto(req, res) {
    const { id } = req.params;
    const { descripcion } = req.body || {};

    if (!descripcion) {
      return res
        .status(400)
        .json({ error: "Falta campo 'descripcion' en el body" });
    }

    try {
      db.query(
        "UPDATE efecto_falla SET descripcion = ? WHERE id_efecto = ?",
        [descripcion, id],
        (err, result) => {
          if (err) {
            console.error("Error al actualizar el efecto:", err);
            return res
              .status(500)
              .json({ error: "Error al actualizar el efecto" });
          }
          // Opcional: comprobar affectedRows para 404
          if (result && result.affectedRows === 0) {
            return res.status(404).json({ error: "Efecto no encontrado" });
          }
          res.json({
            message: "Efecto actualizado correctamente",
            id,
            descripcion,
          });
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
