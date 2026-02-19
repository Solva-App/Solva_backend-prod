const { sequelize } = require('../database/db');
const Lesson = require('../models/Lesson');
const Section = require('../models/Section');
const { generateLessonFromTopic, generateLessonFromDocument } = require('../helpers/huggingface');
const extractText = require('../helpers/file');

module.exports.createLesson = async function (req, res, next) {
  try {
    const { topic, difficulty, type } = req.body;

    if (!topic && !req.file) {
      return res.status(400).json({ success: false, message: "Provide a topic or a document." });
    }

    let lessonData;

    if (topic) {
      lessonData = await generateLessonFromTopic(topic, difficulty, type);
    } else {
      const extractedText = await extractText(req.file);
      const cleanText = (typeof extractedText === 'string' ? extractedText : extractedText.text)
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000);

      lessonData = await generateLessonFromDocument(cleanText, difficulty, type);
    }

    const savedLesson = await Lesson.create({
      owner: req.user?.id || null,
      topic: lessonData.topic || topic,
      difficulty,
      type
    });

    await Promise.all(
      lessonData.sections.map((section, index) => {
        return Section.create({
          lessonId: savedLesson.id,
          heading: section.heading,
          content: section.content,
          order: index
        });
      })
    );

    res.status(201).json({
      success: true,
      message: `Lesson created successfully`,
      data: {
        lesson: savedLesson,
        sections: lessonData.sections
      }
    });

  } catch (error) {
    console.error('Lesson Controller Error:', error);
    res.status(500).json({ success: false, message: "Server error creating lesson" });
  }
};

module.exports.getAllLessons = async function (req, res) {
  try {
    const lessons = await Lesson.findAll({
      where: { owner: req.user.id }
    });

    res.status(200).json({ success: true, data: lessons });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.getLessonById = async function (req, res) {
  try {
    const lesson = await Lesson.findByPk(req.params.id);
    if (!lesson) return res.status(404).json({ success: false, message: "Lesson not found" });

    const sections = await Section.findAll({
      where: { lessonId: req.params.id },
      order: [['order', 'ASC']]
    });

    const data = lesson.toJSON();
    data.sections = sections;

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.deleteLesson = async function (req, res) {
  try {
    await Section.destroy({ where: { lessonId: req.params.id }});
    await Lesson.destroy({ where: { id: req.params.id }});
    res.status(200).json({ success: true, message: "Lesson deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
