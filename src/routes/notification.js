const router = require('express').Router()
const controllers = require("./../controllers/notification");

const { auth, isAdmin } = require("../middlewares/auth");

router.use(auth);
router.post("/send", controllers.sendNotification);
router.get("/unread", controllers.getUserUnreadNotifications);
router.get("/all", controllers.getAllUserNotifications);
router.patch("/:id/read", controllers.markNotificationAsRead);
router.patch("/read/all", controllers.markAllUserNotificationsAsRead);

router.use(isAdmin);
router.post("/broadcast", controllers.broadcast);
router.get("/admin/all", controllers.getAllNotifications);
router.patch("/edit/:id", controllers.editNotification);
router.delete("/delete/:id", controllers.deleteNotification);

module.exports = router;
