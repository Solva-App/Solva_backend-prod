const router = require("express").Router();
const controllers = require("./../controllers/studyMaterials");

router.get("/all", controllers.getAllStudyMaterials);
router.get("/", controllers.getAllStudyMaterials);
router.get("/:id", controllers.getStudyMaterial);

module.exports = router;
