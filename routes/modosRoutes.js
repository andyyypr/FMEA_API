const express = require("express");
const router = express.Router();
const modosController = require("../controllers/modosController.js");

router.get("/", modosController.getModos);
router.post("/", modosController.postIngresarModo);

router
  .route("/:id")
  .get(modosController.getModoById)
  .put(modosController.putActualizarModo)
  .delete(modosController.deleteEliminarModo);

module.exports = router;
