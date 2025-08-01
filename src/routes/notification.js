const router = require('express').Router()
const controllers = require("./../controllers/notification");

const { auth, isAdmin } = require("../middlewares/auth");

router.use(auth);

router.post("/send", controllers.sendNotification);
router.get("/unread", controllers.getUnreadNotifications);
router.get("/all", controllers.getAllNotifications);
router.patch("/:id/read", controllers.markNotificationAsRead);
router.patch("/read/all", controllers.markAllAsRead);

router.use(isAdmin);
router.post("/broadcast", controllers.broadcast);

module.exports = router;
