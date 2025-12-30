const db = require("../database/db.js");
const util = require("util");

// Promisify query/transaction methods for easier async/await
const dbQuery = util.promisify(db.query).bind(db);
const dbBegin = util.promisify(db.beginTransaction).bind(db);
const dbCommit = util.promisify(db.commit).bind(db);
const dbRollback = util.promisify(db.rollback).bind(db);

class GeneralController {
  constructor() {}

  getAll(req, res) {
    // Consulta para traer todo con JOINs
    const query = `
      SELECT
        eq.id_equipo, eq.nombre AS equipo_nombre, eq.descripcion AS equipo_descripcion,
        m.id_modo, m.nombre AS modo_nombre, m.descripcion AS modo_descripcion, m.gravedad,
        e.id_efecto, e.descripcion AS efecto_descripcion,
        c.id_causa, c.descripcion AS causa_descripcion, c.ocurrencia, c.deteccion, c.npr
      FROM equipo eq
      LEFT JOIN modo_falla m ON m.id_equipo = eq.id_equipo
      LEFT JOIN efecto_falla e ON e.id_modo = m.id_modo
      LEFT JOIN causa_falla c ON c.id_efecto = e.id_efecto
      ORDER BY eq.id_equipo, m.id_modo, e.id_efecto, c.id_causa
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Error al obtener los datos:", err);
        return res.status(500).json({ error: "Error al obtener los datos" });
      }

      // Transformar el resultado plano en estructura anidada: equipos -> modos -> efectos -> causas
      const data = [];
      const equiposMap = new Map();

      if (!results || results.length === 0) {
        return res.json([]);
      }

      results.forEach((row) => {
        // Equipo
        if (!equiposMap.has(row.id_equipo)) {
          equiposMap.set(row.id_equipo, {
            id_equipo: row.id_equipo,
            nombre: row.equipo_nombre,
            descripcion: row.equipo_descripcion,
            modos: [],
          });
        }

        const equipo = equiposMap.get(row.id_equipo);

        // Modo dentro del equipo
        if (row.id_modo != null) {
          let modo = equipo.modos.find((m) => m.id_modo === row.id_modo);
          if (!modo) {
            modo = {
              id_modo: row.id_modo,
              nombre: row.modo_nombre,
              descripcion: row.modo_descripcion,
              gravedad: row.gravedad,
              efectos: [],
            };
            equipo.modos.push(modo);
          }

          // Efecto dentro del modo
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

            // Causa dentro del efecto
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
        }
      });

      data.push(...equiposMap.values());
      res.json(data);
    });
  }
  getInfoModo(req, res) {
    // Ahora getInfoModo devuelve la información completa de UN EQUIPO
    // Parámetro: id = id_equipo
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Se requiere id de equipo" });
    }

    // 1) Comprobar existencia del equipo y traer su nombre/descripcion
    db.query(
      `SELECT id_equipo, nombre AS equipo_nombre, descripcion AS equipo_descripcion FROM equipo WHERE id_equipo = ?`,
      [id],
      (errEq, eqRows) => {
        if (errEq) {
          console.error("Error al consultar equipo:", errEq);
          return res.status(500).json({ error: "Error al consultar equipo" });
        }
        if (!eqRows || eqRows.length === 0) {
          return res.status(404).json({ error: "Equipo no encontrado" });
        }

        const equipoInfo = eqRows[0];

        // 2) Traer modos -> efectos -> causas del equipo
        const query = `
          SELECT
            m.id_modo, m.nombre AS modo_nombre, m.descripcion AS modo_descripcion, m.gravedad, m.fecha_creacion, m.responsables, m.acciones_correctivas,
            e.id_efecto, e.descripcion AS efecto_descripcion,
            c.id_causa, c.descripcion AS causa_descripcion, c.ocurrencia, c.deteccion, c.npr, c.fecha_ejecucion
          FROM modo_falla m
          LEFT JOIN efecto_falla e ON e.id_modo = m.id_modo
          LEFT JOIN causa_falla c ON c.id_efecto = e.id_efecto
          WHERE m.id_equipo = ?
          ORDER BY m.id_modo, e.id_efecto, c.id_causa
        `;

        db.query(query, [id], (err, results) => {
          if (err) {
            console.error("Error al obtener info del equipo:", err);
            return res
              .status(500)
              .json({ error: "Error al obtener info del equipo" });
          }

          // Construir la estructura: equipo -> modos[] -> efectos[] -> causas[]
          const modosMap = new Map();

          (results || []).forEach((row) => {
            if (row.id_modo == null) return; // sin modos

            if (!modosMap.has(row.id_modo)) {
              modosMap.set(row.id_modo, {
                id_modo: row.id_modo,
                nombre: row.modo_nombre,
                descripcion: row.modo_descripcion,
                gravedad: row.gravedad,
                fecha_creacion: row.fecha_creacion,
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
                  fecha_ejecucion: row.fecha_ejecucion,
                });
              }
            }
          });

          const modos = Array.from(modosMap.values());

          return res.json({
            id_equipo: equipoInfo.id_equipo,
            nombre: equipoInfo.equipo_nombre,
            descripcion: equipoInfo.equipo_descripcion,
            modos,
          });
        });
      }
    );
  }
  // Devuelve por cada equipo: cantidad de modos, efectos, causas y suma de npr
  getEquiposAnalisis(req, res) {
    const query = `
      SELECT
        eq.id_equipo,
        eq.nombre AS equipo_nombre,
        eq.descripcion AS equipo_descripcion,
        COUNT(DISTINCT m.id_modo) AS modos_count,
        COUNT(DISTINCT e.id_efecto) AS efectos_count,
        COUNT(DISTINCT c.id_causa) AS causas_count,
        COALESCE(SUM(c.npr), 0) AS npr_total,
  ROUND(COALESCE(AVG(c.npr), 0)) AS npr_promedio,
  SUM(CASE WHEN c.npr >= 200 THEN 1 ELSE 0 END) AS num_causasCrit,
  DATE_FORMAT(MAX(c.fecha_ejecucion), '%Y-%m-%d %H:%i:%s') AS fecha_actualizacion,
        CASE
          WHEN COALESCE(AVG(c.npr), 0) >= 200 THEN 'critico'
          WHEN COALESCE(AVG(c.npr), 0) > 100 AND COALESCE(AVG(c.npr), 0) < 200 THEN 'moderado'
          ELSE 'optimo'
        END AS equipo_estado
      FROM equipo eq
      LEFT JOIN modo_falla m ON m.id_equipo = eq.id_equipo
      LEFT JOIN efecto_falla e ON e.id_modo = m.id_modo
      LEFT JOIN causa_falla c ON c.id_efecto = e.id_efecto
      GROUP BY eq.id_equipo, eq.nombre, eq.descripcion
      ORDER BY eq.id_equipo
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Error al obtener analisis por equipo:", err);
        return res
          .status(500)
          .json({ error: "Error al obtener analisis por equipo" });
      }

      // Devolver resultados tal cual (array de objetos con keys: id_equipo, equipo_nombre, modos_count, efectos_count, causas_count, npr_total)
      res.json(results);
    });
  }

  // Resumen general: counts de equipos, modos, efectos, causas y causas con NPR >= 200
  getResumenGeneral(req, res) {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM equipo) AS equipos_count,
        (SELECT COUNT(*) FROM modo_falla) AS modos_count,
        (SELECT COUNT(*) FROM efecto_falla) AS efectos_count,
        (SELECT COUNT(*) FROM causa_falla) AS causas_count,
          (SELECT COUNT(*) FROM causa_falla WHERE npr >= 200) AS num_causasCrit
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error al obtener resumen general:", err);
        return res
          .status(500)
          .json({ error: "Error al obtener resumen general" });
      }

      // results es un array con un objeto
      res.json(
        results[0] || {
          equipos_count: 0,
          modos_count: 0,
          efectos_count: 0,
          causas_count: 0,
          num_causasCrit: 0,
        }
      );
    });
  }

  // Inserta un equipo con sus modos, efectos y causas en una transacción
  async putInsertEquipoCompleto(req, res) {
    try {
      if (!req.body)
        return res.status(400).json({ error: "Body vacío o no enviado" });

      const { nombre, descripcion, modos } = req.body;
      if (!nombre)
        return res.status(400).json({ error: "Se requiere nombre de equipo" });

      // modos es opcional pero, si existe, debe ser array
      if (modos !== undefined && !Array.isArray(modos)) {
        return res.status(400).json({ error: "modos debe ser un arreglo" });
      }

      await dbBegin();

      // 1) Insertar equipo
      const equipoResult = await dbQuery(
        "INSERT INTO equipo (nombre, descripcion) VALUES (?, ?)",
        [nombre, descripcion]
      );
      const id_equipo = equipoResult.insertId;

      const modosInsertados = [];

      if (Array.isArray(modos)) {
        for (const modo of modos) {
          const {
            nombre: modoNombre,
            descripcion: modoDesc,
            gravedad,
            responsables,
            efectos,
          } = modo;
          const modoRes = await dbQuery(
            "INSERT INTO modo_falla (id_equipo, nombre, descripcion, gravedad, responsables) VALUES (?, ?, ?, ?, ?)",
            [id_equipo, modoNombre, modoDesc, gravedad, responsables]
          );
          const id_modo = modoRes.insertId;

          const efectosInsertados = [];

          if (Array.isArray(efectos)) {
            for (const efecto of efectos) {
              const { descripcion: efectoDesc, causas } = efecto;
              const efectoRes = await dbQuery(
                "INSERT INTO efecto_falla (id_modo, descripcion) VALUES (?, ?)",
                [id_modo, efectoDesc]
              );
              const id_efecto = efectoRes.insertId;

              const causasInsertadas = [];

              if (Array.isArray(causas)) {
                for (const causa of causas) {
                  const {
                    descripcion: causaDesc,
                    ocurrencia,
                    deteccion,
                    fecha_ejecucion,
                  } = causa;
                  const ocurr = Number(ocurrencia) || 0;
                  const detect = Number(deteccion) || 0;
                  const gravedadNum = Number(gravedad) || 0;
                  const npr = gravedadNum * ocurr * detect;

                  const fecha = fecha_ejecucion
                    ? new Date(fecha_ejecucion)
                    : new Date();

                  const causaRes = await dbQuery(
                    "INSERT INTO causa_falla (id_efecto, descripcion, ocurrencia, deteccion, npr, fecha_ejecucion) VALUES (?, ?, ?, ?, ?, ?)",
                    [id_efecto, causaDesc, ocurr, detect, npr, fecha]
                  );
                  causasInsertadas.push({
                    id_causa: causaRes.insertId,
                    descripcion: causaDesc,
                    ocurrencia: ocurr,
                    deteccion: detect,
                    npr,
                  });
                }
              }

              efectosInsertados.push({
                id_efecto,
                descripcion: efectoDesc,
                causas: causasInsertadas,
              });
            }
          }

          modosInsertados.push({
            id_modo,
            nombre: modoNombre,
            descripcion: modoDesc,
            gravedad,
            responsables,
            efectos: efectosInsertados,
          });
        }
      }

      await dbCommit();

      return res
        .status(201)
        .json({ id_equipo, nombre, descripcion, modos: modosInsertados });
    } catch (err) {
      console.error("Error al insertar equipo completo:", err);
      try {
        await dbRollback();
      } catch (rbErr) {
        console.error("Rollback error:", rbErr);
      }
      return res
        .status(500)
        .json({ error: "Error al insertar equipo completo" });
    }
  }

  // Crear un equipo simple (nombre, descripcion)
  async postCrearEquipo(req, res) {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "Body vacío o no enviado" });
      }
      const { nombre, descripcion } = req.body;
      if (!nombre)
        return res.status(400).json({ error: "Se requiere nombre de equipo" });

      const result = await dbQuery(
        "INSERT INTO equipo (nombre, descripcion) VALUES (?, ?)",
        [nombre, descripcion]
      );
      return res
        .status(201)
        .json({ id_equipo: result.insertId, nombre, descripcion });
    } catch (err) {
      console.error("Error al crear equipo:", err);
      return res.status(500).json({ error: "Error al crear equipo" });
    }
  }

  // Actualizar nombre y/o descripcion de un equipo
  async putActualizarEquipo(req, res) {
    try {
      const { id } = req.params;
      if (!id)
        return res.status(400).json({ error: "Se requiere id de equipo" });
      if (!req.body || Object.keys(req.body).length === 0)
        return res.status(400).json({ error: "Body vacío o no enviado" });

      const { nombre, descripcion } = req.body;
      if (nombre === undefined && descripcion === undefined) {
        return res
          .status(400)
          .json({ error: "Se requiere nombre o descripcion para actualizar" });
      }

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

      params.push(id);
      const sql = `UPDATE equipo SET ${fields.join(", ")} WHERE id_equipo = ?`;
      const result = await dbQuery(sql, params);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Equipo no encontrado" });
      }

      // Devolver la fila actualizada
      const rows = await dbQuery("SELECT * FROM equipo WHERE id_equipo = ?", [
        id,
      ]);
      return res.json({ message: "Equipo actualizado", equipo: rows[0] });
    } catch (err) {
      console.error("Error al actualizar equipo:", err);
      return res.status(500).json({ error: "Error al actualizar equipo" });
    }
  }

  // Eliminar un equipo (asume que la BD maneja DELETE CASCADE para tablas relacionadas)
  async deleteEliminarEquipo(req, res) {
    try {
      const { id } = req.params;
      if (!id)
        return res.status(400).json({ error: "Se requiere id de equipo" });

      const result = await dbQuery("DELETE FROM equipo WHERE id_equipo = ?", [
        id,
      ]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Equipo no encontrado" });
      }

      return res.json({
        message: "Equipo eliminado",
        deletedRows: result.affectedRows,
      });
    } catch (err) {
      console.error("Error al eliminar equipo:", err);
      return res.status(500).json({ error: "Error al eliminar equipo" });
    }
  }

  // Devuelve todos los modos con su NPR promedio
  getModosNprPromedio(req, res) {
    const sql = `
      SELECT
        m.id_modo,
        m.nombre AS modo_nombre,
        m.descripcion AS modo_descripcion,
        m.gravedad,
        m.id_equipo,
        eq.nombre AS equipo_nombre,
        ROUND(COALESCE(AVG(c.npr), 0)) AS npr_promedio,
        COUNT(c.id_causa) AS causas_count
      FROM modo_falla m
      LEFT JOIN efecto_falla e ON e.id_modo = m.id_modo
      LEFT JOIN causa_falla c ON c.id_efecto = e.id_efecto
      LEFT JOIN equipo eq ON eq.id_equipo = m.id_equipo
      GROUP BY m.id_modo, m.nombre, m.descripcion, m.gravedad, m.id_equipo, eq.nombre
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error al obtener modos con NPR promedio:", err);
        return res.status(500).json({ error: "Error al obtener modos" });
      }

      // Normalizar nombres de campos en la respuesta si se desea
      const mapped = (results || []).map((r) => ({
        id_modo: r.id_modo,
        nombre: r.modo_nombre,
        descripcion: r.modo_descripcion,
        gravedad: r.gravedad,
        id_equipo: r.id_equipo,
        equipo_nombre: r.equipo_nombre,
        npr_promedio: Number(r.npr_promedio) || 0,
        causas_count: Number(r.causas_count) || 0,
      }));

      return res.json(mapped);
    });
  }

  // Devuelve estadísticas generales: npr_promedio, total de causas, causas críticas (npr > 200), y causa con npr máximo
  // También inserta/actualiza el npr_promedio en el historial diario
  getTablaEstadisticas(req, res) {
    const sql = `
      SELECT
        ROUND(COALESCE(AVG(npr), 0)) AS npr_promedio,
        COUNT(*) AS total_causas,
        SUM(CASE WHEN npr > 200 THEN 1 ELSE 0 END) AS causas_criticas,
        MAX(npr) AS npr_maximo
      FROM causa_falla
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error al obtener estadísticas:", err);
        return res.status(500).json({ error: "Error al obtener estadísticas" });
      }

      const stats = results[0] || {};
      const nprPromedioActual = Number(stats.npr_promedio) || 0;

      // Insertar/actualizar en historial_npr
      const sqlHistorial = `
        INSERT INTO historial_npr (fecha, npr_promedio)
        VALUES (CURDATE(), ?)
        ON DUPLICATE KEY UPDATE npr_promedio = VALUES(npr_promedio)
      `;

      db.query(sqlHistorial, [nprPromedioActual], (errHistorial) => {
        if (errHistorial) {
          console.error("Error al insertar en historial_npr:", errHistorial);
          // Continuar sin fallar si el historial falla
        }
      });

      // Ahora obtener la causa con NPR máximo
      if (stats.npr_maximo === null) {
        // Si no hay causas, devolver estadísticas con null
        return res.json({
          npr_promedio: nprPromedioActual,
          total_causas: Number(stats.total_causas) || 0,
          causas_criticas: Number(stats.causas_criticas) || 0,
          causa_max_npr: null,
        });
      }

      // Obtener la causa con npr_maximo
      const sqlCausaMax = `
        SELECT
          c.id_causa,
          c.descripcion,
          c.ocurrencia,
          c.deteccion,
          c.npr,
          c.fecha_ejecucion,
          e.id_efecto,
          e.descripcion AS efecto_descripcion,
          m.id_modo,
          m.nombre AS modo_nombre,
          eq.id_equipo,
          eq.nombre AS equipo_nombre
        FROM causa_falla c
        LEFT JOIN efecto_falla e ON c.id_efecto = e.id_efecto
        LEFT JOIN modo_falla m ON e.id_modo = m.id_modo
        LEFT JOIN equipo eq ON m.id_equipo = eq.id_equipo
        WHERE c.npr = ?
        LIMIT 1
      `;

      db.query(sqlCausaMax, [stats.npr_maximo], (err, causas) => {
        if (err) {
          console.error("Error al obtener causa con NPR máximo:", err);
          return res
            .status(500)
            .json({ error: "Error al obtener causa con NPR máximo" });
        }

        const causaMax = causas && causas.length > 0 ? causas[0] : null;

        return res.json({
          npr_promedio: nprPromedioActual,
          total_causas: Number(stats.total_causas) || 0,
          causas_criticas: Number(stats.causas_criticas) || 0,
          causa_max_npr: causaMax
            ? {
                id_causa: causaMax.id_causa,
                descripcion: causaMax.descripcion,
                ocurrencia: causaMax.ocurrencia,
                deteccion: causaMax.deteccion,
                npr: causaMax.npr,
                fecha_ejecucion: causaMax.fecha_ejecucion,
                id_efecto: causaMax.id_efecto,
                efecto_descripcion: causaMax.efecto_descripcion,
                id_modo: causaMax.id_modo,
                modo_nombre: causaMax.modo_nombre,
                id_equipo: causaMax.id_equipo,
                equipo_nombre: causaMax.equipo_nombre,
              }
            : null,
        });
      });
    });
  }

  // Devuelve el historial de npr_promedio por fecha
  getHistorialNpr(req, res) {
    const sql = `
      SELECT 
        DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
        ROUND(npr_promedio, 2) AS npr_promedio
      FROM historial_npr
      ORDER BY fecha ASC
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error al obtener historial de NPR:", err);
        return res
          .status(500)
          .json({ error: "Error al obtener historial de NPR" });
      }

      const historial = (results || []).map((r) => ({
        fecha: r.fecha,
        npr_promedio: Number(r.npr_promedio),
      }));

      return res.json({ historial });
    });
  }
}

module.exports = new GeneralController();
