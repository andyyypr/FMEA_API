const express = require("express");
const router = express.Router();
const generalController = require("../controllers/generalController.js");

router.get("/", generalController.getAll);
router.get("/:id", generalController.getInfoModo);

module.exports = router;
