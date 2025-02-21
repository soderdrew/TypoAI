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
                    content: "You are a grammar and style checker. Analyze the text and provide two things in your response: 1) A corrected version of the entire text, and 2) An array of changes made in JSON format. For each change include: type (spelling/grammar/style/clarity), the text that was changed, and an explanation. Format your response as JSON like this: {\"corrected\": \"full corrected text here\", \"changes\": [{\"type\": \"spelling\", \"original\": \"teh\", \"suggestion\": \"the\", \"explanation\": \"Corrected spelling error\"}]}"
                },
                {
                    role: "user",
                    content: `Please analyze and correct this text: ${content}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1500
        });

        const aiResponse = response.choices[0].message.content;
        let result;
        
        try {
            // Try to parse the response as JSON
            result = JSON.parse(aiResponse);
        } catch (parseError) {
            console.log('Failed to parse AI response as JSON, attempting to extract JSON');
            // If parsing fails, try to find JSON object in the response
            const jsonMatch = aiResponse.match(/\{.*\}/s);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Could not extract valid JSON from AI response');
            }
        }

        // Validate the response format
        if (!result.corrected || !Array.isArray(result.changes)) {
            throw new Error('Invalid response format from AI');
        }

        // Validate each change has required fields
        result.changes = result.changes.filter(change => 
            change.type && 
            change.original && 
            change.suggestion && 
            change.explanation
        );

        console.log('✨ Grammar check completed:', {
            changeCount: result.changes.length,
            changes: result.changes.slice(0, 2) // Log first two changes as preview
        });

        res.json({
            original: content,
            corrected: result.corrected,
            changes: result.changes,
            error: null
        });
    } catch (err) {
        console.error('❌ Error analyzing text:', err);
        res.status(500).json({
            error: `Error analyzing text: ${err.message}`,
            changes: []
        });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
}); 