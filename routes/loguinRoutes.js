const express = require("express");
const router = express.Router();
const loguinController = require("../controllers/loguinController.js");

router.post("/loguear", loguinController.postLoguear);
router.post("/crearUsuario", loguinController.postCrearUsuario);

module.exports = router;
