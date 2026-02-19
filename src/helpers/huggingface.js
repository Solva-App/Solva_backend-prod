require('dotenv').config();
const { InferenceClient } = require('@huggingface/inference');

const HF_TOKEN = process.env.HUGGING_FACE_API_KEY;
const MODEL = process.env.MODEL_NAME;

const client = new InferenceClient(HF_TOKEN);

exports.generateResponse = async (prompt) => {
  try {
    const chatCompletion = await client.chatCompletion({
      provider: 'novita',
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    return chatCompletion.choices?.[0]?.message?.content || "No response generated.";
  } catch (error) {
    console.error('[HuggingFace Error]', error.code || error.message);
    if (error.code === 404) return 'Model not found or lacks chat capability.';
    if (error.code === 401) return 'Unauthorized — check your API token.';
    return 'Sorry, something went wrong.';
  }
};

exports.generateQuizFromTopic = async (topic, difficulty) => {
  try {
    const chatCompletion = await client.chatCompletion({
      provider: 'novita',
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a Quiz Generation Engine.
          Output ONLY valid JSON. No conversational text. No markdown backticks.
          Ensure each question has 4 options and exactly one isCorrect: true.`
        },
        {
          role: 'user',
          content: `Generate a quiz about "${topic}" with ${difficulty} difficulty.
          Use this exact structure:
          {
            "topic": "String",
            "difficulty": "${difficulty}",
            "questions": [
              {
                "questionText": "String",
                "explanation": "String",
                "options": [
                  { "optionText": "Choice 1", "isCorrect": true },
                  { "optionText": "Choice 2", "isCorrect": false },
                  { "optionText": "Choice 3", "isCorrect": false },
                  { "optionText": "Choice 4", "isCorrect": false }
                ]
              }
            ]
          }`
        },
      ],
      temperature: 0.4,
      max_tokens: 5120,
    });

    const rawContent = chatCompletion.choices?.[0]?.message?.content || "";

    const cleanJson = rawContent.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('[JSON Parse Error]', parseError.message);
      return { error: "AI returned invalid format." };
    }

  } catch (error) {
    console.error('[AI Service Error]', error.message);
    return { error: "Failed to generate quiz." };
  }
};

exports.generateQuizFromDocument = async (documentText, difficulty) => {
  try {
    const chatCompletion = await client.chatCompletion({
      provider: 'novita',
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a strict Document Analysis Engine.
          Your task is to generate a quiz based ONLY on the text provided.

          RULES:
          1. Do NOT use external knowledge. If the answer isn't in the text, don't ask it.
          2. Output must be EXCLUSIVELY valid JSON.
          3. No markdown backticks or conversational text.
          4. Each question must have exactly 4 options with one correct answer.`
        },
        {
          role: 'user',
          content: `TEXT TO ANALYZE:
          "${documentText}"

          GENERATE A ${difficulty.toUpperCase()} DIFFICULTY QUIZ IN THIS JSON FORMAT:
          {
            "topic": "Extracted Title/Subject",
            "difficulty": "${difficulty}",
            "questions": [
              {
                "questionText": "Question based on the text",
                "explanation": "Quote the relevant part of the text",
                "points": 1,
                "options": [
                  { "optionText": "Correct Answer", "isCorrect": true },
                  { "optionText": "Distractor 1", "isCorrect": false },
                  { "optionText": "Distractor 2", "isCorrect": false },
                  { "optionText": "Distractor 3", "isCorrect": false }
                ]
              }
            ]
          }`
        },
      ],
      temperature: 0.1, // Near-zero temperature for maximum factual accuracy
      max_tokens: 3000,
    });

    const rawContent = chatCompletion.choices?.[0]?.message?.content || "";

    // Safety: Remove markdown code blocks if the AI ignores instructions
    const cleanJson = rawContent.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('[JSON Parse Error]', parseError.message);
      return { error: "AI failed to maintain JSON structure." };
    }

  } catch (error) {
    console.error('[AI Error]', error.message);
    return { error: "Generation failed." };
  }
};

exports.generateFlashcardsFromTopic = async (topic, difficulty, type) => {
  try {
    const chatCompletion = await client.chatCompletion({
      provider: 'novita',
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a Flashcard Generation Engine.
          Output ONLY valid JSON. No conversational text. No markdown backticks.
          
          STYLE RULES:
          - If type is 'true/false': The 'front' must be a factual statement, and the 'back' must be exactly 'True' or 'False' followed by a short explanation.
          - If type is 'open-ended': The 'front' must be a question or term, and the 'back' must be the detailed answer.`
        },
        {
          role: 'user',
          content: `Generate a ${difficulty} difficulty ${type} flashcard deck about "${topic}".
          
          Use this exact structure:
          {
            "topic": "${topic}",
            "difficulty": "${difficulty}",
            "type": "${type}",
            "cards": [
              {
                "front": "Statement or Question",
                "back": "True/False explanation or Answer"
              }
            ]
          }`
        },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    const rawContent = chatCompletion.choices?.[0]?.message?.content || "";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawContent.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('[JSON Parse Error]', parseError.message);
      return { error: "AI returned invalid format." };
    }
  } catch (error) {
    console.error('[AI Service Error]', error.message);
    return { error: "Failed to generate flashcards." };
  }
};

exports.generateFlashcardsFromDocument = async (documentText, difficulty, type) => {
  try {
    const chatCompletion = await client.chatCompletion({
      provider: 'novita',
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a Document Analysis Engine. 
          Extract key concepts from the text and convert them into ${type} flashcards.
          
          RULES:
          1. Use ONLY the provided text.
          2. If type is 'true/false': Create statements based on the text where the answer is True or False.
          3. If type is 'open-ended': Create questions and answers based on the text.
          4. Output EXCLUSIVELY valid JSON.`
        },
        {
          role: 'user',
          content: `TEXT TO ANALYZE:
          "${documentText}"

          GENERATE A ${difficulty.toUpperCase()} ${type.toUpperCase()} FLASHCARD DECK IN THIS JSON FORMAT:
          {
            "topic": "Extracted Subject",
            "difficulty": "${difficulty}",
            "type": "${type}",
            "cards": [
              {
                "front": "Content based on ${type} style",
                "back": "Answer based on ${type} style"
              }
            ]
          }`
        },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const rawContent = chatCompletion.choices?.[0]?.message?.content || "";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawContent.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('[JSON Parse Error]', parseError.message);
      return { error: "AI failed to parse document into flashcards." };
    }
  } catch (error) {
    console.error('[AI Error]', error.message);
    return { error: "Generation failed." };
  }
};
