// src/lib/services/collaboration.ts
import { Databases, Client } from 'appwrite';
import type { RealtimeResponseEvent, Models } from 'appwrite';
import type { AISuggestion } from './ai';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = "documents";

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);

interface DocumentState {
    content: string;
    aiSuggestions?: AISuggestion[];
}

interface CollaborationOptions {
    documentId: string;
    userId: string;
    userName: string;
    initialContent: string;
    onContentChange: (content: string) => void;
    onAISuggestionsChange?: (suggestions: AISuggestion[] | null) => void;
}

interface DocumentResponse extends Models.Document {
    content: string;
    aiSuggestions?: AISuggestion[];
}

let databaseUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
const activeSubscriptions = new Map<string, () => void>();

export const initializeCollaboration = async (options: CollaborationOptions) => {
    const { documentId, userId, initialContent, onContentChange, onAISuggestionsChange } = options;
    console.log("Initializing collaboration for document:", documentId);

    // Clean up any existing subscription for this document
    if (activeSubscriptions.has(documentId)) {
        console.log("Cleaning up existing subscription for document:", documentId);
        const cleanup = activeSubscriptions.get(documentId);
        if (cleanup) cleanup();
        activeSubscriptions.delete(documentId);
    }

    // Get the latest document state from the database
    let latestState: DocumentState = {
        content: initialContent
    };

    // Store document metadata
    // let documentMetadata: DocumentResponse | null = null;

    try {
        const doc = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID,
            documentId
        ) as DocumentResponse;
        
        // documentMetadata = doc;

        if (doc.content) {
            latestState.content = doc.content;
            if (doc.aiSuggestions) {
                latestState.aiSuggestions = doc.aiSuggestions;
                onAISuggestionsChange?.(doc.aiSuggestions);
            }
            console.log("Loaded latest state from database:", latestState);
            onContentChange(latestState.content);
        }
    } catch (error) {
        console.error("Failed to load latest state from database:", error);
    }

    // Function to save content changes
    const saveContent = async (newContent: string, newSuggestions?: AISuggestion[]) => {
        // Check if this is a special message
        try {
            const message = JSON.parse(newContent);
            if (message.type === 'collaborator_removed') {
                // For special messages, just send them through the realtime system
                // without saving to the database
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID,
                    documentId,
                    { 
                        // Send the message but keep the existing content
                        content: latestState.content,
                        _message: message 
                    }
                );
                return;
            }
        } catch {
            // Not a JSON message, handle as normal content update
        }

        if (newContent === latestState.content && !newSuggestions) {
            return; // No changes to save
        }

        try {
            // Save to database with debounce
            if (databaseUpdateTimeout) {
                clearTimeout(databaseUpdateTimeout);
            }
            databaseUpdateTimeout = setTimeout(async () => {
                try {
                    const updateData: any = { content: newContent };
                    if (newSuggestions) {
                        updateData.aiSuggestions = newSuggestions;
                    }
                    
                    await databases.updateDocument(
                        DATABASE_ID,
                        COLLECTION_ID,
                        documentId,
                        updateData
                    );
                    latestState.content = newContent;
                    if (newSuggestions) {
                        latestState.aiSuggestions = newSuggestions;
                    }
                    console.log("Successfully saved update to database");
                } catch (error) {
                    console.error("Failed to save update to database:", error);
                }
            }, 1000);
        } catch (error) {
            console.error("Failed to handle document update:", error);
        }
    };

    // Subscribe to document changes
    const unsubscribe = client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents.${documentId}`, 
        (response: RealtimeResponseEvent<any>) => {
            if (response.events.includes('databases.*.collections.*.documents.*.update')) {
                const updatedState = response.payload;
                console.log("Received realtime update:", updatedState);

                // Check for special messages
                if (updatedState._message) {
                    const message = updatedState._message;
                    if (message.type === 'collaborator_removed') {
                        if (message.removedId === userId) {
                            // If we're the removed collaborator, reload the page
                            window.location.reload();
                            return;
                        }
                    }
                    return; // Don't update content for special messages
                }

                // Update content if changed
                if (updatedState.content !== latestState.content) {
                    latestState.content = updatedState.content;
                    onContentChange(updatedState.content);
                }

                // Update AI suggestions if changed
                if (updatedState.aiSuggestions !== latestState.aiSuggestions) {
                    latestState.aiSuggestions = updatedState.aiSuggestions;
                    onAISuggestionsChange?.(updatedState.aiSuggestions);
                }
            }
        }
    );

    // Store cleanup function
    const cleanup = () => {
        console.log("Cleaning up collaboration for document:", documentId);
        if (databaseUpdateTimeout) {
            clearTimeout(databaseUpdateTimeout);
        }
        unsubscribe();
    };
    activeSubscriptions.set(documentId, cleanup);

    // Return the interface for the collaboration
    return {
        saveContent,
        cleanup,
        getContent: () => latestState.content,
        getAISuggestions: () => latestState.aiSuggestions
    };
};