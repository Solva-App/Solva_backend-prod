const router = require("express").Router();
const { fileParser } = require("../middlewares");
const { auth, isAdmin } = require("../middlewares/auth");
const controllers = require("./../controllers/user");

router.post("/create", controllers.createAccount);
router.post("/login", controllers.login);
router.post("/generate/token", controllers.generateToken);
router.post("/forgotten/password/otp", controllers.sendForgotPasswordOTP);
router.post("/forgotten/password/reset", controllers.resetForgottenPassword);
router.get("/referrals/:userId", controllers.getUserReferrals);

router.post("/admin/login", controllers.adminLogin);
router.post("/admin/generate/token", controllers.adminGenerateToken);
router.post("/admin/forgotten/password/otp", controllers.adminSendForgotPasswordOTP);
router.post("/admin/forgotten/password/reset", controllers.adminResetForgottenPassword);

router.use(auth);
router.get("/", controllers.getUser);
router.patch("/update/password", controllers.updatePassword);
router.patch("/", controllers.updateProfile);
router.get("/balance/:id", controllers.getUserBalance);
router.get("/:id", controllers.getUserById);

router.use(isAdmin); // ensure only admins  gets access to the below endpoints
router.get("/admin/all", controllers.getAllUsers);
router.patch("/flag/:id", controllers.flagUsers);
router.patch("/unflag/:id", controllers.unFlagUsers);
router.get("/admin/download", controllers.downloadAllUsers);

module.exports = router;

