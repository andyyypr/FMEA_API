const db = require("../database/db.js");

class GeneralController {
  constructor() {}

  getAll(req, res) {
    // Consulta para traer todo con JOINs
    const query = `
      SELECT 
        m.id_modo, m.nombre AS modo_nombre, m.descripcion AS modo_descripcion, m.gravedad,
        e.id_efecto, e.descripcion AS efecto_descripcion,
        c.id_causa, c.descripcion AS causa_descripcion, c.ocurrencia, c.deteccion, c.npr
      FROM modo_falla m
      LEFT JOIN efecto_falla e ON e.id_modo = m.id_modo
      LEFT JOIN causa_falla c ON c.id_efecto = e.id_efecto
      ORDER BY m.id_modo, e.id_efecto, c.id_causa
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Error al obtener los datos:", err);
        return res.status(500).json({ error: "Error al obtener los datos" });
      }

      // Transformar el resultado plano en estructura anidada
      const data = [];
      const modosMap = new Map();

      if (!results || results.length === 0) {
        return res.json([]);
      }

      results.forEach((row) => {
        if (!modosMap.has(row.id_modo)) {
          modosMap.set(row.id_modo, {
            id_modo: row.id_modo,
            nombre: row.modo_nombre,
            descripcion: row.modo_descripcion,
            gravedad: row.gravedad,
            efectos: [],
          });
        }

        const modo = modosMap.get(row.id_modo);

        // Si existe efecto (comparación explícita contra null para no fallar si id === 0)
        if (row.id_efecto != null) {
          let efecto = modo.efectos.find((e) => e.id_efecto === row.id_efecto);
          if (!efecto) {
            efecto = {
              id_efecto: row.id_efecto,
              descripcion: row.efecto_descripcion,
              causas: [],
            };
            modo.efectos.push(efecto);
          }

          // Si existe causa
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

      data.push(...modosMap.values());
      res.json(data);
    });
  }
  getInfoModo(req, res) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Se requiere id de modo" });
    }

    const query = `
      SELECT 
        m.id_modo, m.nombre AS modo_nombre, m.descripcion AS modo_descripcion, m.gravedad,
        e.id_efecto, e.descripcion AS efecto_descripcion,
        c.id_causa, c.descripcion AS causa_descripcion, c.ocurrencia, c.deteccion, c.npr
      FROM modo_falla m
      LEFT JOIN efecto_falla e ON e.id_modo = m.id_modo
      LEFT JOIN causa_falla c ON c.id_efecto = e.id_efecto
      WHERE m.id_modo = ?
      ORDER BY e.id_efecto, c.id_causa
    `;

    db.query(query, [id], (err, results) => {
      if (err) {
        console.error("Error al obtener info del modo:", err);
        return res
          .status(500)
          .json({ error: "Error al obtener info del modo" });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({ error: "Modo no encontrado" });
      }

      // Construir objeto del modo
      const first = results[0];
      const modo = {
        id_modo: first.id_modo,
        nombre: first.modo_nombre,
        descripcion: first.modo_descripcion,
        gravedad: first.gravedad,
        efectos: [],
      };

      results.forEach((row) => {
        if (row.id_efecto != null) {
          let efecto = modo.efectos.find((e) => e.id_efecto === row.id_efecto);
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

      return res.json(modo);
    });
  }
}

module.exports = new GeneralController();
