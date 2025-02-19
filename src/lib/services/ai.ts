import axios from 'axios';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const openaiApi = axios.create({
    baseURL: 'https://api.openai.com/v1',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
    }
});

export interface AISuggestion {
    original: string;
    suggestion: string;
    type: 'spelling' | 'grammar' | 'style' | 'clarity';
    explanation: string;
    startIndex: number;
    endIndex: number;
}

export const aiService = {
    async analyzeText(content: string): Promise<AISuggestion[]> {
        try {
            const response = await openaiApi.post('/chat/completions', {
                model: "gpt-4",
                messages: [{
                    role: "user", 
                    content: `Analyze the following text and provide suggestions for improvements in spelling, grammar, style, and clarity. For each suggestion, include the start and end indices of the text to be replaced. Format your response as a JSON array of objects with the following structure:
                    {
                        "original": "text with issue",
                        "suggestion": "improved text",
                        "type": "spelling|grammar|style|clarity",
                        "explanation": "brief explanation of the improvement",
                        "startIndex": number,
                        "endIndex": number
                    }
                    
                    Text to analyze: ${content}`
                }],
                temperature: 0.7,
                max_tokens: 1000
            });

            const suggestions = JSON.parse(response.data.choices[0].message.content);
            return suggestions as AISuggestion[];
        } catch (error) {
            console.error("Error analyzing text:", error);
            throw error;
        }
    }
}; 