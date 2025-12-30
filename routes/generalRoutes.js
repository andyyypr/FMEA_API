const express = require("express");
const router = express.Router();
const generalController = require("../controllers/generalController.js");

router.get("/", generalController.getAll);
router.get("/equipos", generalController.getEquiposAnalisis);
router.get("/resumen", generalController.getResumenGeneral);
router.get("/modosNPR", generalController.getModosNprPromedio);
router.get("/tablaestadisticas", generalController.getTablaEstadisticas);
router.get("/historial-npr", generalController.getHistorialNpr);
router.post("/equipos", generalController.postCrearEquipo);
router.put("/equipos", generalController.putInsertEquipoCompleto);
router.put("/equipos/:id", generalController.putActualizarEquipo);
router.delete("/equipos/:id", generalController.deleteEliminarEquipo);
router.get("/:id", generalController.getInfoModo);

module.exports = router;
