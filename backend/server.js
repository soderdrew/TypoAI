import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Format markdown endpoint
app.post('/api/format', async (req, res) => {
    try {
        const { content } = req.body;
        console.log('📝 Formatting request received:', {
            contentLength: content.length,
            preview: content.substring(0, 100) + '...'
        });
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a markdown formatting assistant. Format the given markdown to be more readable and well-structured. Preserve all content and links but improve formatting, spacing, and organization. Add appropriate headers if missing."
                },
                {
                    role: "user",
                    content
                }
            ],
            temperature: 0.3
        });

        const formattedContent = response.choices[0].message.content;
        if (!formattedContent) throw new Error('No content returned from OpenAI');

        console.log('✨ Formatting completed:', {
            originalLength: content.length,
            formattedLength: formattedContent.length,
            preview: formattedContent.substring(0, 100) + '...'
        });

        // Return both original and formatted content
        res.json({
            original: content,
            formatted: formattedContent,
            error: null
        });
    } catch (err) {
        console.error('❌ Error formatting content:', err);
        res.status(500).json({
            error: `Error formatting content: ${err.message}`,
            content: null
        });
    }
});

// Grammar check endpoint
app.post('/api/grammar', async (req, res) => {
    try {
        const { content } = req.body;
        console.log('📝 Grammar check request received:', {
            contentLength: content.length,
            preview: content.substring(0, 100) + '...'
        });
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Analyze the following text and provide suggestions for improvements in spelling, grammar, style, and clarity. For each suggestion, include the start and end indices of the text to be replaced."
                },
                {
                    role: "user",
                    content
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        const suggestions = JSON.parse(response.choices[0].message.content);
        console.log('✨ Grammar check completed:', {
            suggestionCount: suggestions.length,
            suggestions: suggestions.slice(0, 2) // Log first two suggestions as preview
        });

        res.json({
            suggestions,
            error: null
        });
    } catch (err) {
        console.error('❌ Error analyzing text:', err);
        res.status(500).json({
            error: `Error analyzing text: ${err.message}`,
            suggestions: []
        });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
}); 