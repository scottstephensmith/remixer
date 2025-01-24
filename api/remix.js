import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { text, prompt } = req.body;

  try {
    const completion = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      system: "You are a creative writing assistant that helps remix and rewrite text in different styles.",
      messages: [{
        role: "user",
        content: `${prompt}: "${text}"`
      }]
    });

    return res.status(200).json({ remixedText: completion.content[0].value });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Error processing your request' });
  }
} 