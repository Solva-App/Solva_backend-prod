const express = require("express");
require("dotenv").config();
const cors = require("cors");
const http = require("http");
const morgan = require("morgan");
const path = require("path");
const socket = require("socket.io");
const { initiateAllSubscriptionScheduler } = require("./services/scheduler.js");// app.js or server.js
const { initNotificationIO } = require("./services/notification");
const { checkOrCreateAdmin } = require("./helpers/admin");

// setup database connection
require("./database/db.js").startDB([initiateAllSubscriptionScheduler]);
checkOrCreateAdmin();

const app = express();
const middlewares = require("./middlewares");

const server = http.createServer(app);

const io = new socket.Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("tiny"));
app.use("/static", express.static(path.join(__dirname, "..", "static")));
app.set("io", io);

// setup routes
const userRoutes = require("./routes/user");
const jobRoutes = require("./routes/job");
const grantRoutes = require("./routes/grant");
const scholarshipRoutes = require("./routes/scholarship");
const innovationRoutes = require("./routes/innovation");
const projectRoutes = require("./routes/project");
const questionRoutes = require("./routes/question");
const documentRoutes = require("./routes/document");
const cashoutRequestRoutes = require("./routes/cashout");
const freelancerRoutes = require("./routes/freelancer");
const subscriptionRoutes = require("./routes/subscription");
const webhookRoutes = require("./routes/webhook");
const sliderRoutes = require("./routes/slider");
const notificationRoutes = require("./routes/notification");
const chatRoutes = require("./routes/chat");
const statsRoutes = require("./routes/stats");
const taskRoutes = require("./routes/task");
// end of routes

// create a baseurl field containing the request http protocol & url) in the request object
app.use(function (req, _res, next) {
  req.baseUrl = `${req.protocol}://${req.headers["host"]}`;
  next();
});

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/grants", grantRoutes);
app.use("/api/v1/scholarships", scholarshipRoutes);
app.use("/api/v1/innovations", innovationRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/cashouts", cashoutRequestRoutes);
app.use("/api/v1/freelancers", freelancerRoutes);
app.use("/api/v1/sub", subscriptionRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/slider", sliderRoutes);
app.use("/api/v1/notification", notificationRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/stats", statsRoutes);
app.use("/api/v1/tasks", taskRoutes);

require("./helpers/socket")(io);
initNotificationIO(io);

app.use(function (req, res, _next) {
  console.log(req.query);
  return res.status(404).json({
    message: "Resources not found ☹️☹️",
    status: 404,
    success: false,
  });
});
app.use(middlewares.errorHandler);

// error handler

module.exports = { server };
