import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/remix', async (req, res) => {
  const { text, prompt } = req.body;
  
  if (!text || !prompt) {
    return res.status(400).json({ message: 'Text and prompt are required' });
  }

  try {
    console.log('Request received:', { text, prompt });
    
    const msg = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      system: "You are a creative writing assistant that helps create tweets. Provide only the exact tweet text without any labels, numbers, or prefixes. The output should be ready to post directly to Twitter/X.",
      messages: [{ 
        role: "user", 
        content: `Write a tweet ${prompt}. Provide only the tweet text, without any labels or prefixes: "${text}"` 
      }]
    });

    console.log('API Response:', msg);

    if (!msg.content || !msg.content[0] || !msg.content[0].text) {
      throw new Error('Invalid API response structure');
    }

    return res.json({ 
      remixedText: msg.content[0].text
    });
  } catch (error) {
    console.error('API Error:', {
      name: error.name,
      message: error.message,
      type: error.type,
      status: error.status,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      message: error.message || 'Error processing your request',
      type: error.type || 'UnknownError'
    });
  }
});

// Test endpoint
app.get('/test', async (req, res) => {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [{ role: "user", content: "Say hello!" }]
    });
    res.json({ 
      message: 'Server is running!',
      apiTest: msg.content[0].text 
    });
  } catch (error) {
    console.error('Test endpoint error:', {
      name: error.name,
      message: error.message,
      type: error.type,
      status: error.status
    });
    res.status(500).json({ 
      message: 'Server running but API test failed',
      error: error.message,
      type: error.type || 'UnknownError'
    });
  }
});

const server = app.listen(port, () => {
  const actualPort = server.address().port;
  console.log(`Server running at http://localhost:${actualPort}`);
  console.log('Environment check:', {
    nodeEnv: process.env.NODE_ENV,
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    apiKeyLength: process.env.ANTHROPIC_API_KEY?.length,
    port: actualPort
  });
}); 