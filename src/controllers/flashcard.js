const { sequelize } = require('../database/db');
const Flashcard = require('../models/Flashcard');
const Card = require('../models/Card');
const { generateFlashcardsFromTopic, generateFlashcardsFromDocument } = require('../helpers/huggingface');
const extractText = require('../helpers/file');

module.exports.createFlashcard = async function (req, res, next) {
  try {
    const { topic, difficulty, type } = req.body;
    const ownerId = req.user.id;

    if (!topic && !req.file) {
      return res.status(400).json({ success: false, message: "Either topic or document is required" });
    }

    let flashcardData;

    if (topic) {
      flashcardData = await generateFlashcardsFromTopic(topic, difficulty, type);
    } else {
      const extractedText = await extractText(req.file);
      const textToClean = typeof extractedText === 'string'
        ? extractedText
        : (extractedText?.text || JSON.stringify(extractedText));

      const cleanText = textToClean.replace(/\s+/g, ' ').trim().substring(0, 12000);
      flashcardData = await generateFlashcardsFromDocument(cleanText, difficulty, type);
    }

    const savedFlashcard = await Flashcard.create({
      owner: ownerId,
      topic: flashcardData.topic || topic,
      difficulty: difficulty,
      type: type
    });

    await Promise.all(
      flashcardData.cards.map(async (card) => {
        return Card.create({
          flashcardId: savedFlashcard.id,
          front: card.front,
          back: card.back
        });
      })
    );

    res.status(201).json({
      success: true,
      message: "Flashcard generated successfully",
      data: {
        flashcard: savedFlashcard,
        cards: flashcardData.cards
      }
    });

  } catch (error) {
    console.error('Card Generation Error:', error);
    res.status(500).json({ success: false, message: "Failed to generate flashcards" });
  }
};

module.exports.getAllFlashcards = async function (req, res, next) {
  try {
    const flashcard = await Flashcard.findAll({
      where: { owner: req.user.id }
    });
    res.status(200).json({ success: true, data: flashcard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports.getFlashcardById = async function (req, res, next) {
  try {
    const flashcard = await Flashcard.findByPk(req.params.id);

    if (!flashcard) {
      return res.status(404).json({ success: false, message: "Flashcard not found" });
    }

    const flashcardData = flashcard.toJSON();

    const cards = await Card.findAll({
      where: { flashcardId: req.params.id }
    });

    flashcardData.cards = cards;

    res.status(200).json({
      success: true,
      data: flashcardData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports.deleteFlashcard = async function (req, res, next) {
  try {
    const flashcardId = req.params.id;

    const flashcard = await Flashcard.findOne({
      where: { id: flashcardId, owner: req.user.id }
    });

    if (!flashcard) {
      return res.status(404).json({ success: false, message: "Flashcard not found or unauthorized" });
    }

    await Card.destroy({
      where: { flashcardId: flashcardId },
    });

    await Flashcard.destroy({
      where: { id: flashcardId },
    });

    res.status(200).json({ success: true, message: "Flashcard and all associated cards deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};