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
