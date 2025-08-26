const router = require("express").Router();
const { fileParser } = require("../middlewares");
const { auth, isAdmin } = require("../middlewares/auth");
const controllers = require("./../controllers/project");

router.get("/", controllers.getProjects);
router.get("/:id", controllers.getProject);

router.use(auth);
router.use(isAdmin);
router.post("/create", fileParser.array("documents", 10), controllers.createProject);
router.patch("/approve/:id", controllers.approveProject);
router.patch("/decline/:id", controllers.declineProject);
router.delete("/:id", controllers.deleteProject);
router.get("/all", controllers.getAllProjects);



module.exports = router;
