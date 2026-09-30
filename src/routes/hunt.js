const router = require('express').Router();
const { auth, isAdmin } = require('../middlewares/auth');
const { fileParser } = require('../middlewares');
const controllers = require('../controllers/hunt');

router.use(auth);
router.post('/seasons', isAdmin, controllers.createSeason);
router.get('/seasons', controllers.getSeasons);
router.get('/seasons/:id/stages', controllers.getSeasonStages);
router.get('/seasons/:id/leaderboard', controllers.getSeasonLeaderboard);
router.get('/seasons/:id/votes', controllers.getSeasonVotes);
router.get('/seasons/:id', controllers.getSeason);
router.get('/faculties', controllers.getFaculties);
router.post('/faculty/access-code', isAdmin, controllers.createFacultyAccessCode);
router.post('/faculty/register', fileParser.single('crest_logo'), controllers.registerFaculty);
// router.post('/faculty/:id/join', controllers.joinFaculty);
// router.post('/faculty/:id/leave', controllers.leaveFaculty);
router.get('/stages/:id', controllers.getStage);
router.post('/stages/:id/submit', controllers.submitStage);
router.get('/stages/:id/submissions', controllers.getStageSubmissions);
router.post('/votes/initialize', controllers.initializeFacultyVote);
router.post('/votes/:reference/verify', controllers.verifyFacultyVote);

module.exports = router;