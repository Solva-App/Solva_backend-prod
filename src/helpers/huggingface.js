require('dotenv').config();
const { InferenceClient } = require('@huggingface/inference');

const HF_TOKEN = process.env.HUGGING_FACE_API_KEY;
const MODEL = process.env.MODEL_NAME;

const client = new InferenceClient(HF_TOKEN);

exports.generateResponse = async (prompt) => {
  try {
    const chatCompletion = await client.chatCompletion({
      // provider: 'featherless-ai',
      model: 'mistralai/Mistral-7B-Instruct-v0.3:novita',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    return chatCompletion.choices?.[0]?.message?.content || "No response generated.";
  } catch (error) {
    console.error('[HuggingFace Error]', error.code || error.message);
    if (error.code === 404) return 'Model not found or lacks chat capability.';
    if (error.code === 401) return 'Unauthorized — check your API token.';
    return 'Sorry, something went wrong.';
  }
};
