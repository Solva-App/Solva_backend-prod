const OpenAI = require('openai');
require('dotenv').config();

const MODEL = process.env.OPENAI_MODEL_NAME;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.generateQuizFromTopic = async (topic, difficulty) => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a Quiz Engine. Output ONLY valid JSON.'
        },
        {
          role: 'user',
          content: `Generate a ${difficulty} quiz about ${topic}.`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quiz_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              topic: { type: "string" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    questionText: { type: "string" },
                    explanation: { type: "string" },
                    options: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          optionText: { type: "string" },
                          isCorrect: { type: "boolean" }
                        },
                        required: ["optionText", "isCorrect"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["questionText", "explanation", "options"],
                  additionalProperties: false
                }
              }
            },
            required: ["topic", "questions"],
            additionalProperties: false
          }
        }
      }
    })
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('[OpenAI API Error]', error.message);
    return { error: "Generation failed", questions: [] };
  }
};

exports.generateQuizFromDocument = async (documentText, difficulty) => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a strict Document Analysis Engine. Generate a quiz based ONLY on the provided text. Do not use external knowledge.'
        },
        {
          role: 'user',
          content: `TEXT: "${documentText.substring(0, 12000)}"\n\nGenerate a ${difficulty} quiz.`
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "document_quiz",
          strict: true,
          schema: {
            type: "object",
            properties: {
              topic: { type: "string" },
              difficulty: { type: "string" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    questionText: { type: "string" },
                    explanation: { type: "string" },
                    options: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          optionText: { type: "string" },
                          isCorrect: { type: "boolean" }
                        },
                        required: ["optionText", "isCorrect"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["questionText", "explanation", "options"],
                  additionalProperties: false
                }
              }
            },
            required: ["topic", "difficulty", "questions"],
            additionalProperties: false
          }
        }
      },
      temperature: 0.1
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('[OpenAI Doc Quiz Error]', error.message);
    return { error: "Generation failed." };
  }
};

exports.generateFlashcardsFromTopic = async (topic, difficulty, type) => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a Flashcard Engine. Generate ${difficulty} difficulty cards.
          - If type is 'true/false': The 'front' must be a statement, and 'back' must be 'True' or 'False' with a brief explanation.
          - If type is 'open-ended': The 'front' is a question/term, and 'back' is the detailed answer.`
        },
        {
          role: 'user',
          content: `Generate ${type} flashcards about "${topic}".`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "flashcard_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              topic: { type: "string" },
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    front: { type: "string" },
                    back: { type: "string" }
                  },
                  required: ["front", "back"],
                  additionalProperties: false
                }
              }
            },
            required: ["topic", "cards"],
            additionalProperties: false
          }
        }
      },
      temperature: 0.7
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('[OpenAI Flashcard Error]', error.message);
    return { error: "Failed to generate flashcards.", cards: [] };
  }
};

exports.generateFlashcardsFromDocument = async (documentText, difficulty, type) => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a Document Analysis Engine. Extract key concepts from the text and convert them into ${type} flashcards.
          Use ONLY the provided text.

          REQUIRED JSON STRUCTURE:
          {
            "topic": "Summarized Title",
            "cards": [
              { "front": "Question/Statement", "back": "Answer/Explanation" }
            ]
          }`
        },
        {
          role: 'user',
          content: `TEXT: "${documentText.substring(0, 12000)}"\n\nGenerate ${difficulty} level ${type} flashcards based on this text.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('[OpenAI Doc Flashcard Error]', error.message);
    return { error: "Failed to generate flashcards.", cards: [] };
  }
};

exports.generateLessonFromTopic = async (topic, difficulty, type) => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert Educator. Create a structured ${type} lesson.
          A 'Standard' lesson should have 3-5 sections.
          A 'Deep Dive' should have 7-10 sections.`
        },
        {
          role: 'user',
          content: `Create a ${difficulty} difficulty lesson about "${topic}".`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lesson_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              topic: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    heading: { type: "string" },
                    content: { type: "string" }
                  },
                  required: ["heading", "content"],
                  additionalProperties: false
                }
              }
            },
            required: ["topic", "sections"],
            additionalProperties: false
          }
        }
      },
      temperature: 0.7
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('[OpenAI Lesson Error]', error.message);
    return { error: "Failed to create lesson.", sections: [] };
  }
};

exports.generateLessonFromDocument = async (documentText, difficulty, type) => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a Document Analysis Expert. Transform the provided text into a structured educational lesson.

          RULES:
          1. Use ONLY the provided text.
          2. Maintain a ${difficulty} level of depth.
          3. Style: ${type}.

          REQUIRED FORMAT:
          {
            "topic": "Summarized Title",
            "sections": [
              { "heading": "Section Title", "content": "Detailed text extracted from document" }
            ]
          }`
        },
        {
          role: 'user',
          content: `TEXT TO ANALYZE: "${documentText.substring(0, 15000)}"`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      parsed.sections = [];
    }

    return parsed;
  } catch (error) {
    console.error('[OpenAI Doc Lesson Error]', error.message);
    return { error: "Failed to analyze document.", sections: [] };
  }
};