const express = require("express");
const router = express.Router();
const causasController = require("../controllers/causasController.js");

router.get("/", causasController.getCausas);
// Causas críticas (NPR >= 200)
router.get("/criticas", causasController.getCausasCriticas);
// Obtener solo ids relacionados para una causa (id_efecto, id_modo, id_equipo)
router.get("/ids/:id", causasController.getIdsByCausa);
// Crear una causa asociada a un efecto: id_efecto en la ruta
router.post("/:id", causasController.postIngresarCausa);

router
  .route("/:id")
  .get(causasController.getCausaByID)
  .put(causasController.putActualizarCausa)
  .delete(causasController.deleteEliminarCausa);

module.exports = router;
