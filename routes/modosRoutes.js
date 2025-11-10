const express = require("express");
const router = express.Router();
const modosController = require("../controllers/modosController.js");

router.get("/", modosController.getModos);
router.get("/equipo/:id", modosController.getModosByEquipo);
// Crear un modo asociado a un equipo: el id del equipo se pasa en la ruta
router.post("/:id", modosController.postIngresarModo);

router
  .route("/:id")
  .get(modosController.getModoById)
  .put(modosController.putActualizarModo)
  .delete(modosController.deleteEliminarModo);

module.exports = router;
