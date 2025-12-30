const db = require("../database/db.js");
const crypto = require("crypto");

class LoguinController {
  constructor() {}

  postLoguear(req, res) {
    try {
      // soportar clientes que envían body como texto (Content-Type: text/plain)
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (e) {
          console.log("postLoguear: body no es JSON válido");
          return res
            .status(400)
            .json({ success: false, message: "Body no es JSON válido" });
        }
      }

      if (!body || Object.keys(body).length === 0) {
        console.log("postLoguear: body vacío o no enviado después del parseo");
        return res.status(400).json({
          success: false,
          message: "Body vacío o no enviado",
        });
      }

      const { usuario, password } = body;

      // Validaciones básicas
      if (!usuario || !password) {
        return res.status(400).json({
          success: false,
          message: "Se requieren usuario y password",
        });
      }

      // Hash de password con SHA256
      const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      // Buscar el usuario por nombre de usuario
      db.query(
        "SELECT id, usuario, password FROM usuarios WHERE usuario = ?",
        [usuario],
        (err, rows) => {
          if (err) {
            console.error("Error al consultar usuario:", err);
            return res.status(500).json({
              success: false,
              message: "Error al consultar usuario",
            });
          }

          if (!rows || rows.length === 0) {
            // Usuario no existe
            return res.status(401).json({
              success: false,
              message: "Usuario no encontrado",
            });
          }

          const user = rows[0];
          // Comparar password hasheado
          if (user.password !== hashedPassword) {
            return res.status(401).json({
              success: false,
              message: "Password incorrecto",
            });
          }

          // Usuario y password válidos
          const token = crypto.randomBytes(16).toString("hex");

          return res.json({
            success: true,
            message: "Login correcto",
            token,
            id: user.id,
            usuario: user.usuario,
          });
        }
      );
    } catch (error) {
      console.error("Error en getLoguear:", error);
      return res.status(500).json({
        success: false,
        message: "Error al procesar login",
      });
    }
  }

  postCrearUsuario(req, res) {
    try {
      // Normalizar body: si express ya lo parseó o si está como string
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (e) {
          console.log("postCrearUsuario: body no es JSON válido (string)");
          return res.status(400).json({ error: "Body no es JSON válido" });
        }
      }

      // si express no parseó body, intentar con req.rawBody (capturado por verify en index.js)
      if ((!body || Object.keys(body).length === 0) && req.rawBody) {
        try {
          body = JSON.parse(req.rawBody);
          console.log("postCrearUsuario: parsed body from rawBody");
        } catch (e) {
          console.log("postCrearUsuario: rawBody no es JSON válido");
          return res.status(400).json({ error: "Body no es JSON válido" });
        }
      }

      if (!body || Object.keys(body).length === 0) {
        console.log(
          "postCrearUsuario: body vacío o no enviado después del parseo"
        );
        return res.status(400).json({ error: "Body vacío o no enviado" });
      }

      const { usuario, password } = body;

      // Validaciones básicas
      if (!usuario || !password) {
        return res
          .status(400)
          .json({ error: "Se requieren usuario y password" });
      }

      if (typeof usuario !== "string" || usuario.trim().length === 0) {
        return res
          .status(400)
          .json({ error: "Usuario debe ser una cadena no vacía" });
      }

      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({
          error: "Password debe tener al menos 6 caracteres",
        });
      }

      // Hash de password con SHA256
      const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      // Verificar que el usuario no exista
      db.query(
        "SELECT id FROM usuarios WHERE usuario = ?",
        [usuario],
        (err, rows) => {
          if (err) {
            console.error("Error al verificar usuario:", err);
            return res
              .status(500)
              .json({ error: "Error al verificar usuario" });
          }

          if (rows && rows.length > 0) {
            return res.status(409).json({ error: "El usuario ya existe" });
          }

          // Insertar nuevo usuario
          db.query(
            "INSERT INTO usuarios (usuario, password) VALUES (?, ?)",
            [usuario, hashedPassword],
            (err, result) => {
              if (err) {
                console.error("Error al crear usuario:", err);
                return res
                  .status(500)
                  .json({ error: "Error al crear usuario" });
              }

              return res.status(201).json({
                message: "Usuario creado exitosamente",
                id: result.insertId,
                usuario,
              });
            }
          );
        }
      );
    } catch (error) {
      console.error("Error en postCrearUsuario:", error);
      return res.status(500).json({ error: "Error al crear usuario" });
    }
  }
}

module.exports = new LoguinController();
