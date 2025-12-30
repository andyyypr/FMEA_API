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

  // Obtener todos los modos de falla asociados a un equipo con efectos y causas anidados
  getModosByEquipo(req, res) {
    const { id } = req.params; // id del equipo
    if (!id) return res.status(400).json({ error: "Se requiere id de equipo" });

    const query = `
      SELECT
        m.id_modo, m.nombre AS modo_nombre, m.descripcion AS modo_descripcion, m.gravedad, m.responsables, m.acciones_correctivas,
        e.id_efecto, e.descripcion AS efecto_descripcion,
        c.id_causa, c.descripcion AS causa_descripcion, c.ocurrencia, c.deteccion, c.npr
      FROM modo_falla m
      LEFT JOIN efecto_falla e ON e.id_modo = m.id_modo
      LEFT JOIN causa_falla c ON c.id_efecto = e.id_efecto
      WHERE m.id_equipo = ?
      ORDER BY m.id_modo, e.id_efecto, c.id_causa
    `;

    try {
      db.query(query, [id], (err, results) => {
        if (err) {
          console.error("Error al obtener modos detallados por equipo:", err);
          return res
            .status(500)
            .json({ error: "Error al obtener modos detallados por equipo" });
        }

        if (!results || results.length === 0) return res.json([]);

        const modosMap = new Map();

        results.forEach((row) => {
          if (!modosMap.has(row.id_modo)) {
            modosMap.set(row.id_modo, {
              id_modo: row.id_modo,
              nombre: row.modo_nombre,
              descripcion: row.modo_descripcion,
              gravedad: row.gravedad,
              responsables: row.responsables,
              acciones_correctivas: row.acciones_correctivas,
              efectos: [],
            });
          }

          const modo = modosMap.get(row.id_modo);

          if (row.id_efecto != null) {
            let efecto = modo.efectos.find(
              (e) => e.id_efecto === row.id_efecto
            );
            if (!efecto) {
              efecto = {
                id_efecto: row.id_efecto,
                descripcion: row.efecto_descripcion,
                causas: [],
              };
              modo.efectos.push(efecto);
            }

            if (row.id_causa != null) {
              efecto.causas.push({
                id_causa: row.id_causa,
                descripcion: row.causa_descripcion,
                ocurrencia: row.ocurrencia,
                deteccion: row.deteccion,
                npr: row.npr,
              });
            }
          }
        });

        const modos = Array.from(modosMap.values());
        return res.json(modos);
      });
    } catch (err) {
      console.error("Error inesperado en getModosByEquipo:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  getIteracionDesfavorable(req, res) {
    // 1) Encontrar el modo con el mayor NPR promedio (considerando causas)
    const querySql = `
      SELECT
        m.id_modo, m.nombre AS modo_nombre, m.descripcion AS modo_descripcion, m.gravedad, m.responsables,
        ROUND(AVG(c.npr)) AS npr_promedio
      FROM modo_falla m
      LEFT JOIN efecto_falla e ON e.id_modo = m.id_modo
      LEFT JOIN causa_falla c ON c.id_efecto = e.id_efecto
      GROUP BY m.id_modo, m.nombre, m.descripcion, m.gravedad, m.responsables
      ORDER BY npr_promedio DESC
      LIMIT 1
    `;

    db.query(querySql, (err, modoRows) => {
      if (err) {
        console.error("Error al buscar modo desfavorable:", err);
        return res
          .status(500)
          .json({ error: "Error al buscar modo desfavorable" });
      }

      if (!modoRows || modoRows.length === 0) {
        return res.status(404).json({ error: "No se encontraron modos" });
      }

      const modo = modoRows[0];
      const id_modo = modo.id_modo;

      // 2) Obtener efectos y causas del modo
      const queryDetalle = `
        SELECT
          e.id_efecto, e.descripcion AS efecto_descripcion,
          c.id_causa, c.descripcion AS causa_descripcion, c.ocurrencia, c.deteccion, c.npr, c.fecha_ejecucion
        FROM efecto_falla e
        LEFT JOIN causa_falla c ON c.id_efecto = e.id_efecto
        WHERE e.id_modo = ?
        ORDER BY e.id_efecto, c.id_causa
      `;

      db.query(queryDetalle, [id_modo], (err2, detalleRows) => {
        if (err2) {
          console.error("Error al obtener detalles del modo:", err2);
          return res
            .status(500)
            .json({ error: "Error al obtener detalles del modo" });
        }

        // Construir la estructura: modo -> efectos[] -> causas[]
        const efectosMap = new Map();

        (detalleRows || []).forEach((row) => {
          if (row.id_efecto == null) return;

          if (!efectosMap.has(row.id_efecto)) {
            efectosMap.set(row.id_efecto, {
              id_efecto: row.id_efecto,
              descripcion: row.efecto_descripcion,
              causas: [],
            });
          }

          const efecto = efectosMap.get(row.id_efecto);

          if (row.id_causa != null) {
            efecto.causas.push({
              id_causa: row.id_causa,
              descripcion: row.causa_descripcion,
              ocurrencia: row.ocurrencia,
              deteccion: row.deteccion,
              npr: row.npr,
              fecha_ejecucion: row.fecha_ejecucion,
            });
          }
        });

        const efectos = Array.from(efectosMap.values());

        return res.json({
          modo: {
            id_modo: modo.id_modo,
            nombre: modo.modo_nombre,
            descripcion: modo.modo_descripcion,
            gravedad: modo.gravedad,
            responsables: modo.responsables,
            npr_promedio: modo.npr_promedio,
          },
          efectos,
        });
      });
    });
  }
  postIngresarModo(req, res) {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "Body vacío o no enviado" });
      }

      const {
        nombre,
        descripcion,
        gravedad,
        responsables,
        acciones_correctivas,
      } = req.body;

      const { id } = req.params; // id del equipo enviado en la ruta

      if (!id) {
        return res
          .status(400)
          .json({ error: "Se requiere id de equipo en la ruta" });
      }

      const missing = [];
      if (nombre === undefined) missing.push("nombre");
      if (descripcion === undefined) missing.push("descripcion");
      if (gravedad === undefined) missing.push("gravedad");
      if (responsables === undefined) missing.push("responsables");
      if (acciones_correctivas === undefined)
        missing.push("acciones_correctivas");

      if (missing.length > 0) {
        return res
          .status(400)
          .json({ error: "Faltan campos requeridos", missing });
      }

      const idEquipoNum = Number(id);
      const gravedadNum = Number(gravedad);

      if (!Number.isInteger(idEquipoNum) || idEquipoNum <= 0) {
        return res
          .status(400)
          .json({ error: "id_equipo debe ser un entero válido" });
      }

      if (isNaN(gravedadNum)) {
        return res.status(400).json({ error: "gravedad debe ser numérico" });
      }

      // Verificar que el equipo exista antes de insertar
      db.query(
        `SELECT id_equipo FROM equipo WHERE id_equipo = ?`,
        [idEquipoNum],
        (err, rows) => {
          if (err) {
            return res.status(500).send(err);
          }

          if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "Equipo no encontrado" });
          }

          db.query(
            `INSERT INTO modo_falla (id_equipo, nombre, descripcion, gravedad, responsables,acciones_correctivas) VALUES (?, ?, ?, ?, ?,?)`,
            [
              idEquipoNum,
              nombre,
              descripcion,
              gravedadNum,
              responsables,
              acciones_correctivas,
            ],
            (err2, result) => {
              if (err2) {
                return res.status(400).send(err2);
              }
              return res.status(201).json({
                id: result.insertId,
                id_equipo: idEquipoNum,
                nombre,
                descripcion,
                gravedad: gravedadNum,
                responsables,
                acciones_correctivas,
              });
            }
          );
        }
      );
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
  putActualizarModo(req, res) {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Body vacío o no enviado" });
    }

    const { id } = req.params;
    if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ error: "id de modo inválido en la ruta" });
    }

    const {
      nombre,
      descripcion,
      gravedad,
      responsables,
      acciones_correctivas,
    } = req.body;

    const fields = [];
    const params = [];

    if (nombre !== undefined) {
      fields.push("nombre = ?");
      params.push(nombre);
    }
    if (descripcion !== undefined) {
      fields.push("descripcion = ?");
      params.push(descripcion);
    }
    if (gravedad !== undefined) {
      const gravedadNum = Number(gravedad);
      if (Number.isNaN(gravedadNum)) {
        return res.status(400).json({ error: "gravedad debe ser numérico" });
      }
      fields.push("gravedad = ?");
      params.push(gravedadNum);
    }
    if (responsables !== undefined) {
      fields.push("responsables = ?");
      params.push(responsables);
    }
    if (acciones_correctivas !== undefined) {
      fields.push("acciones_correctivas = ?");
      params.push(acciones_correctivas);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    params.push(id);
    const sql = `UPDATE modo_falla SET ${fields.join(", ")} WHERE id_modo = ?`;

    try {
      db.query(sql, params, (err, result) => {
        if (err) {
          console.error("Error al actualizar modo:", err);
          return res.status(500).json({ error: "Error al actualizar modo" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Modo no encontrado" });
        }

        // Devolver fila actualizada
        db.query(
          `SELECT * FROM modo_falla WHERE id_modo = ?`,
          [id],
          (err2, rows) => {
            if (err2) {
              console.error("Error al obtener modo actualizado:", err2);
              return res
                .status(500)
                .json({ error: "Error al obtener modo actualizado" });
            }
            return res
              .status(200)
              .json({ message: "Modo actualizado", modo: rows[0] });
          }
        );
      });
    } catch (err) {
      console.error("Excepción al actualizar modo:", err);
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
          return res.status(400).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Modo no encontrado" });
        }

        return res
          .status(200)
          .json({ message: "Modo eliminado correctamente" });
      }
    );
  }
}

module.exports = new ModosController();
