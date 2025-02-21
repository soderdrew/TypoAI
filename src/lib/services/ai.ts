import { Client, Functions } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const functions = new Functions(client);

export interface AISuggestion {
    type: 'spelling' | 'grammar' | 'style' | 'clarity';
    original: string;
    suggestion: string;
    explanation: string;
}

export interface GrammarCheckResult {
    original: string;
    corrected: string;
    changes: AISuggestion[];
    error: string | null;
}

export interface FormatPreview {
    original: string;
    formatted: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class AIService {
    async previewFormat(content: string): Promise<{ preview: FormatPreview | null; error: string | null }> {
        try {
            const response = await fetch(`${API_URL}/api/format`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) {
                return { preview: null, error: result.error };
            }

            return {
                preview: {
                    original: result.original,
                    formatted: result.formatted
                },
                error: null
            };
        } catch (error) {
            return {
                preview: null,
                error: `Error formatting content: ${error}`
            };
        }
    }

    async formatMarkdown(content: string): Promise<{ content: string; error: string | null }> {
        try {
            const { preview, error } = await this.previewFormat(content);
            if (error || !preview) {
                throw new Error(error || 'Failed to get formatting preview');
            }

            return {
                content: preview.formatted,
                error: null
            };
        } catch (error) {
            return {
                content,
                error: `Error formatting content: ${error}`
            };
        }
    }

    async analyzeText(content: string): Promise<GrammarCheckResult> {
        try {
            const response = await fetch(`${API_URL}/api/grammar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) {
                return { 
                    original: content,
                    corrected: content,
                    changes: [],
                    error: result.error 
                };
            }

            return {
                original: result.original,
                corrected: result.corrected,
                changes: result.changes,
                error: null
            };
        } catch (error) {
            return {
                original: content,
                corrected: content,
                changes: [],
                error: `Error analyzing text: ${error}`
            };
        }
    }
} 