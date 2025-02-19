import { Client, Functions } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const functions = new Functions(client);

export interface AISuggestion {
    original: string;
    suggestion: string;
    type: 'spelling' | 'grammar' | 'style' | 'clarity';
    explanation: string;
    startIndex: number;
    endIndex: number;
}

export class AIService {
    async formatMarkdown(content: string): Promise<{ content: string; error: string | null }> {
        try {
            const execution = await functions.createExecution(
                'ai-operations',
                JSON.stringify({
                    type: 'format',
                    content
                })
            );

            const result = JSON.parse(execution.responseBody);
            return {
                content: result.content || content,
                error: result.error
            };
        } catch (error) {
            return {
                content,
                error: `Error formatting content: ${error}`
            };
        }
    }

    async analyzeText(content: string): Promise<{ suggestions: AISuggestion[]; error: string | null }> {
        try {
            const execution = await functions.createExecution(
                'ai-operations',
                JSON.stringify({
                    type: 'grammar',
                    content
                })
            );

            const result = JSON.parse(execution.responseBody);
            return {
                suggestions: result.suggestions || [],
                error: result.error
            };
        } catch (error) {
            return {
                suggestions: [],
                error: `Error analyzing text: ${error}`
            };
        }
    }
} 