import { OpenAI } from 'openai';
import { Client } from 'node-appwrite';

export default async function(context) {
  const { req, res, log, error } = context;
  const envEndpoint = process.env.APPWRITE_FUNCTION_ENDPOINT;
  const envProjectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const envApiKey = process.env.APPWRITE_API_KEY;
  const envOpenAiKey = process.env.OPENAI_API_KEY;

  if (!envEndpoint || !envProjectId || !envApiKey || !envOpenAiKey) {
    return res.json({
      error: 'Missing required environment variables',
      content: null,
      suggestions: []
    });
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(envEndpoint)
    .setProject(envProjectId)
    .setKey(envApiKey);

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: envOpenAiKey
  });

  try {
    const data = JSON.parse(req.body);
    
    if (data.type === 'format') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a markdown formatting assistant. Format the given markdown to be more readable and well-structured. Preserve all content and links but improve formatting, spacing, and organization. Add appropriate headers if missing."
          },
          {
            role: "user",
            content: data.content
          }
        ],
        temperature: 0.3
      });

      const formattedContent = response.choices[0].message.content;
      if (!formattedContent) throw new Error('No content returned from OpenAI');

      return res.json({
        content: formattedContent,
        error: null
      });
    } 
    else if (data.type === 'grammar') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Analyze the following text and provide suggestions for improvements in spelling, grammar, style, and clarity. For each suggestion, include the start and end indices of the text to be replaced."
          },
          {
            role: "user",
            content: data.content
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No content returned from OpenAI');

      const suggestions = JSON.parse(content);
      return res.json({
        suggestions,
        error: null
      });
    }
    
    throw new Error('Invalid operation type');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error(errorMessage);
    return res.json({
      error: `Error processing request: ${errorMessage}`,
      content: null,
      suggestions: []
    });
  }
} 