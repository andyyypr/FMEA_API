const express = require("express");
const router = express.Router();
const efectosController = require("../controllers/efectosControler.js");

router.get("/", efectosController.getEfectos);
router.post("/", efectosController.postIngresarEfecto);

router
  .route("/:id")
  .get(efectosController.getEfectoByID)
  .put(efectosController.putActualizarEfecto)
  .delete(efectosController.deleteEliminarEfecto);

module.exports = router;
