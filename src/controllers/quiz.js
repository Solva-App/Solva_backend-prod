const CustomError = require('../helpers/error')
const { Schema } = require('json-validace')
const { OK } = require('http-status-codes')
const { generateQuizFromTopic, generateQuizFromDocument } = require('../helpers/huggingface');
const Quiz = require('../models/Quiz')
const QuizQuestion = require('../models/QuizQuestion')
const QuizOption = require('../models/QuizOption')
const extractText = require('../helpers/file')

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

module.exports.createQuiz = async function (req, res, next) {
  try {
    const schema = new Schema({
      topic: { type: 'string', required: false },
      difficulty: { type: 'string', required: true },
    });

    const result = schema.validate(req.body);

    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error));
    }

    const { topic, difficulty } = result.data;

    if (!topic && !req.file) {
      return res.status(400).json({ success: false, message: "Either topic or document is required" });
    }

    let quizData;

    if (topic) {
      quizData = await generateQuizFromTopic(topic, difficulty);
    } else {
      let extractedText = await extractText(req.file);
      const textToClean = typeof extractedText === 'string'
        ? extractedText
        : (extractedText?.text || JSON.stringify(extractedText));

      const cleanText = textToClean
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 12000);

      quizData = await generateQuizFromDocument(cleanText, difficulty);
    }

    if (quizData && quizData.questions) {
      quizData.questions = quizData.questions.map(question => {
        return {
          ...question,
          options: shuffleArray([...question.options])
        };
      });
    }

    const savedQuiz = await Quiz.create({
      owner: req.user.id,
      topic: quizData.topic,
      difficulty: quizData.difficulty
    });

    await Promise.all(
      quizData.questions.map(async (question) => {
        const savedQuestion = await QuizQuestion.create({
          quizId: savedQuiz.id,
          questionText: question.questionText,
          explanation: question.explanation,
        });

        await Promise.all(
          question.options.map(async (option) => {
            await QuizOption.create({
              questionId: savedQuestion.id,
              optionText: option.optionText,
              isCorrect: option.isCorrect
            });
          })
        );
      })
    );

    res.status(201).json({
      success: true,
      message: "Quiz generated and saved successfully",
      data: quizData,
    });
  } catch (error) {
    console.error('Generation/Save Error:', error);
    res.status(500).json({ success: false, message: "Server error during generation" });
  }
};

module.exports.getAllQuizzes = async function (req, res, next) {
  try {
    const quizzes = await Quiz.findAll({
      where: { owner: req.user.id }
    });
    res.status(200).json({ success: true, data: quizzes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.getQuizById = async function (req, res, next) {
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    const quizData = quiz.toJSON();

    const questions = await QuizQuestion.findAll({
      where: { quizId: req.params.id }
    });

    const questionsWithOptions = await Promise.all(questions.map(async (q) => {
      const questionJson = q.toJSON();

      const options = await QuizOption.findAll({
        where: { questionId: questionJson.id }
      });

      questionJson.options = options;
      return questionJson;
    }));

    quizData.questions = questionsWithOptions;

    res.status(200).json({
      success: true,
      data: quizData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports.deleteQuiz = async function (req, res, next) {
  try {
    const quizId = req.params.id;

    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    const questions = await QuizQuestion.findAll({
      where: { quizId: quizId }
    });
    const questionIds = questions.map(q => q.id);

    if (questionIds.length > 0) {
      await QuizOption.destroy({
        where: { questionId: questionIds }
      });
    }

    await QuizQuestion.destroy({
      where: { quizId: quizId }
    });

    await Quiz.destroy({
      where: { id: quizId }
    });

    res.status(200).json({ success: true, message: "Quiz, questions, and options deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};