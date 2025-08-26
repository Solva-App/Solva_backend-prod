const router = require("express").Router();
const { fileParser } = require("../middlewares");
const { auth, isAdmin } = require("../middlewares/auth");
const controllers = require("./../controllers/project");

router.get("/", controllers.getProjects);
router.get("/:id", controllers.getProject);

router.use(auth);
router.use(isAdmin);
router.post(
  "/create",
  fileParser.array("documents", 10),
  controllers.createProject,
);
router.delete(
  "/:id",
  controllers.deleteProject,
);


module.exports = router;
