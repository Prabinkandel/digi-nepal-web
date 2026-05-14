const express = require('express');
const router = express.Router();
const { generateResponse } = require('../utils/claude');

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  const { messages, systemPrompt } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  try {
    const response = await generateResponse(messages, systemPrompt);
    res.json({ message: response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate response from Claude' });
  }
});

module.exports = router;
