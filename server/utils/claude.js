const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
});

const generateResponse = async (messages, systemPrompt = '') => {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',


      max_tokens: 1024,
      system: systemPrompt,

      messages: messages,
    });
    return response.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
};

module.exports = {
  generateResponse,
  anthropic
};
