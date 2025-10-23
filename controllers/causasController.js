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
  getCausaByID(req, res) {
    const { id } = req.params;
    db.query(
      "SELECT * FROM causa_falla WHERE id_causa = ?",
      [id],
      (err, results) => {
        if (err) {
          console.error("Error al obtener la causa:", err);
          return res.status(500).json({ error: "Error al obtener la causa" });
        }
        res.json(results);
      }
    );
  }
  getCausasAsociadaEfecto(req, res) {}
  postIngresarCausa(req, res) {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "Body vacío o no enviado" });
      }

      const { id_efecto, descripcion, ocurrencia, deteccion } = req.body;

      // Validaciones básicas
      if (
        id_efecto === undefined ||
        descripcion === undefined ||
        ocurrencia === undefined ||
        deteccion === undefined
      ) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
      }

      const ocurr = Number(ocurrencia);
      const detect = Number(deteccion);
      if (Number.isNaN(ocurr) || Number.isNaN(detect)) {
        return res
          .status(400)
          .json({ error: "ocurrencia y deteccion deben ser números" });
      }

      //Obtener la gravedad y el id_modo desde el efecto (LEFT JOIN para diferenciar si falta el modo)
      console.log("Buscando efecto para id_efecto=", id_efecto);
      db.query(
        `
      SELECT e.id_modo, m.gravedad
      FROM efecto_falla e
      LEFT JOIN modo_falla m ON e.id_modo = m.id_modo
      WHERE e.id_efecto = ?`,
        [id_efecto],
        (err, results) => {
          if (err) {
            console.error("Error al obtener la gravedad:", err);
            return res
              .status(500)
              .json({ error: "Error al obtener la gravedad" });
          }

          if (results.length === 0) {
            console.warn(
              `No se encontró registro en 'efecto_falla' para id_efecto=${id_efecto}`
            );
            return res
              .status(404)
              .json({ error: "No se encontró el efecto asociado" });
          }

          const row = results[0];
          const idModo = row.id_modo;
          const gravedad = row.gravedad;

          if (idModo == null) {
            console.warn(
              `El efecto id_efecto=${id_efecto} no tiene id_modo asociado`
            );
            return res
              .status(404)
              .json({ error: "El efecto no tiene modo asociado" });
          }

          if (gravedad == null) {
            console.warn(
              `No se encontró modo_falla para id_modo=${idModo} (o gravedad es NULL)`
            );
            return res
              .status(404)
              .json({ error: "No se encontró el modo asociado o su gravedad" });
          }

          const gravedadNum = Number(gravedad);
          if (Number.isNaN(gravedadNum)) {
            console.error(
              `Gravedad no numérica para id_modo=${idModo}:`,
              gravedad
            );
            return res.status(500).json({ error: "Gravedad no es numérica" });
          }
          const npr = gravedadNum * ocurr * detect; // calcular NPR

          console.log(
            "Gravedad:",
            gravedadNum,
            "NPR:",
            npr,
            "id_modo:",
            idModo
          );

          // Insertar la causa con el NPR calculado
          db.query(
            `
          INSERT INTO causa_falla (id_efecto, descripcion, ocurrencia, deteccion, npr)
          VALUES (?, ?, ?, ?, ?)`,
            [id_efecto, descripcion, ocurrencia, deteccion, npr],
            (err, result) => {
              if (err) {
                console.error("Error al ingresar la causa:", err);
                return res
                  .status(500)
                  .json({ error: "Error al ingresar la causa" });
              }

              res.status(201).json({
                message: "Causa ingresada exitosamente",
                id: result.insertId,
                npr,
              });
            }
          );
        }
      );
    } catch (error) {
      console.error("Error al ingresar la causa:", error);
      res.status(500).json({ error: "Error al ingresar la causa" });
    }
  }

  putActualizarCausa(req, res) {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "Body vacío o no enviado" });
      }

      const { id } = req.params;

      const { descripcion, ocurrencia, deteccion } = req.body;

      if (
        descripcion === undefined &&
        ocurrencia === undefined &&
        deteccion === undefined
      ) {
        return res
          .status(400)
          .json({ error: "Al menos un campo a actualizar debe ser enviado" });
      }

      // Obtener la causa actual para conocer su id_efecto
      db.query(
        "SELECT id_efecto FROM causa_falla WHERE id_causa = ?",
        [id],
        (err, rows) => {
          if (err) {
            console.error("Error al obtener la causa:", err);
            return res.status(500).json({ error: "Error al obtener la causa" });
          }

          if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "Causa no encontrada" });
          }

          const id_efecto = rows[0].id_efecto;

          // Convertir valores numéricos si vienen
          const ocurr =
            ocurrencia !== undefined ? Number(ocurrencia) : undefined;
          const detect =
            deteccion !== undefined ? Number(deteccion) : undefined;
          if (
            (ocurr !== undefined && Number.isNaN(ocurr)) ||
            (detect !== undefined && Number.isNaN(detect))
          ) {
            return res
              .status(400)
              .json({ error: "ocurrencia y deteccion deben ser números" });
          }

          // Si se modifica ocurrencia o deteccion (o ninguno), recalculamos npr usando la gravedad actual del modo asociado al efecto
          db.query(
            `SELECT e.id_modo, m.gravedad FROM efecto_falla e LEFT JOIN modo_falla m ON e.id_modo = m.id_modo WHERE e.id_efecto = ?`,
            [id_efecto],
            (err, results) => {
              if (err) {
                console.error(
                  "Error al obtener gravedad para recalculo de NPR:",
                  err
                );
                return res
                  .status(500)
                  .json({ error: "Error al obtener gravedad" });
              }

              if (!results || results.length === 0) {
                return res
                  .status(404)
                  .json({ error: "Efecto asociado no encontrado" });
              }

              const row = results[0];
              const gravedad = row.gravedad;
              if (gravedad == null) {
                return res.status(404).json({
                  error: "No se encontró el modo asociado o su gravedad",
                });
              }

              const gravedadNum = Number(gravedad);
              if (Number.isNaN(gravedadNum)) {
                return res
                  .status(500)
                  .json({ error: "Gravedad no es numérica" });
              }

              // Necesitamos los valores finales para calcular npr: si no vienen en body, usar los actuales de la causa
              db.query(
                "SELECT ocurrencia, deteccion FROM causa_falla WHERE id_causa = ?",
                [id],
                (err, curRows) => {
                  if (err) {
                    console.error("Error al leer causa actual:", err);
                    return res
                      .status(500)
                      .json({ error: "Error al leer causa actual" });
                  }

                  const cur = curRows[0] || {};
                  const finalOcurr =
                    ocurr !== undefined ? ocurr : Number(cur.ocurrencia);
                  const finalDetect =
                    detect !== undefined ? detect : Number(cur.deteccion);

                  if (Number.isNaN(finalOcurr) || Number.isNaN(finalDetect)) {
                    return res.status(400).json({
                      error: "Valores de ocurrencia/deteccion inválidos",
                    });
                  }

                  const npr = gravedadNum * finalOcurr * finalDetect;

                  // Construir query UPDATE dinámico según campos presentes
                  const fields = [];
                  const params = [];
                  if (descripcion !== undefined) {
                    fields.push("descripcion = ?");
                    params.push(descripcion);
                  }
                  if (ocurrencia !== undefined) {
                    fields.push("ocurrencia = ?");
                    params.push(finalOcurr);
                  }
                  if (deteccion !== undefined) {
                    fields.push("deteccion = ?");
                    params.push(finalDetect);
                  }
                  // Siempre actualizar npr
                  fields.push("npr = ?");
                  params.push(npr);

                  params.push(id); // WHERE id_causa = ?

                  const sql = `UPDATE causa_falla SET ${fields.join(
                    ", "
                  )} WHERE id_causa = ?`;
                  db.query(sql, params, (err, result) => {
                    if (err) {
                      console.error("Error al actualizar la causa:", err);
                      return res
                        .status(500)
                        .json({ error: "Error al actualizar la causa" });
                    }

                    // Devolver la causa actualizada
                    db.query(
                      "SELECT * FROM causa_falla WHERE id_causa = ?",
                      [id],
                      (err, updatedRows) => {
                        if (err) {
                          console.error(
                            "Error al obtener causa actualizada:",
                            err
                          );
                          return res.status(500).json({
                            error: "Error al obtener causa actualizada",
                          });
                        }
                        res.json({
                          message: "Causa actualizada",
                          causa: updatedRows[0],
                        });
                      }
                    );
                  });
                }
              );
            }
          );
        }
      );
    } catch (error) {
      console.error("Error al actualizar la causa:", error);
      res.status(500).json({ error: "Error al actualizar la causa" });
    }
  }

  deleteEliminarCausa(req, res) {
    const { id } = req.params;
    try {
      db.query(
        `DELETE FROM causa_falla WHERE id_causa = ?`,
        [id],
        (err, result) => {
          if (err) {
            return res.status(400).send(err);
          }
          res.json({ message: "Causa eliminada correctamente" });
          return res.status(204).send();
        }
      );
    } catch (error) {
      console.error("Error al eliminar la causa:", error);
      res.status(500).json({ error: "Error al eliminar la causa" });
    }
  }
}

module.exports = new CausasController();
