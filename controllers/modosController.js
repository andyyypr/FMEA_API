const db = require("../database/db.js");

class ModosController {
  constructor() {}

  getModos(req, res) {
    try {
      db.query(`SELECT * FROM modo_falla`, (err, rows) => {
        if (err) {
          res.status(400).send(err);
        }
        res.status(200).json(rows);
      });
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  getModoById(req, res) {
    const { id } = req.params;
    try {
      db.query(
        `SELECT * FROM modo_falla WHERE id_modo = ?`,
        [id],
        (err, rows) => {
          if (err) {
            res.status(400).send(err);
          }
          res.status(200).json(rows);
        }
      );
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
  postIngresarModo(req, res) {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "Body vacío o no enviado" });
      }

      const { nombre, descripcion, gravedad } = req.body;

      if (
        nombre === undefined ||
        descripcion === undefined ||
        gravedad === undefined
      ) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
      }

      db.query(
        `INSERT INTO modo_falla (nombre, descripcion, gravedad) VALUES (?, ?, ?)`,
        [nombre, descripcion, gravedad],
        (err, result) => {
          if (err) {
            return res.status(400).send(err);
          }
          res.status(201).json({ id: result.insertId, ...req.body });
        }
      );
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
  putActualizarModo(req, res) {
    const { id } = req.params;
    const { nombre, descripcion, gravedad } = req.body;

    try {
      db.query(
        `UPDATE modo_falla SET nombre = ?, descripcion = ?, gravedad = ? WHERE id_modo = ?`,
        [nombre, descripcion, gravedad, id],
        (err, result) => {
          if (err) {
            res.status(400).send(err);
          }
          res.status(200).json({ id, ...req.body });
        }
      );
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
  deleteEliminarModo(req, res) {
    const { id } = req.params;
    db.query(
      `DELETE FROM modo_falla WHERE id_modo = ?`,
      [id],
      (err, result) => {
        if (err) {
          res.status(400).send(err);
        }
        res.json({ message: "Modo eliminado correctamente" });
        res.status(204).send();
      }
    );
  }
}

module.exports = new ModosController();
