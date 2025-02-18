// src/lib/services/collaboration.ts
import { Databases, Client, ID, Query } from 'appwrite';
import type { RealtimeResponseEvent } from 'appwrite';
import { auth } from '../stores/auth';
import type { Models } from 'appwrite';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = "documents";

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);

interface CursorPosition {
    start: number;
    end: number;
}

interface UserPresence {
    userId: string;
    name: string;
    cursor: CursorPosition | null;
    lastActive: string;
}

interface DocumentState {
    content: string;
    presence: Record<string, UserPresence>;
}

interface CollaborationOptions {
    documentId: string;
    userId: string;
    userName: string;
    initialContent: string;
    onContentChange: (content: string) => void;
    onPresenceChange: (presence: Record<string, UserPresence>) => void;
}

interface DocumentResponse extends Models.Document {
    content: string;
    presence?: Record<string, UserPresence>;
}

let databaseUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
let presenceUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
const activeSubscriptions = new Map<string, () => void>();

export const initializeCollaboration = async (options: CollaborationOptions) => {
    const { documentId, userId, userName, initialContent, onContentChange, onPresenceChange } = options;
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
        content: initialContent,
        presence: {}
    };

    // Store document metadata
    let documentMetadata: DocumentResponse | null = null;

    try {
        const doc = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID,
            documentId
        ) as DocumentResponse;
        
        documentMetadata = doc;

        if (doc.content) {
            latestState.content = doc.content;
            // Only use presence if it exists in the document
            if (doc.$attributes && doc.$attributes.includes('presence')) {
                latestState.presence = doc.presence || {};
            }
            console.log("Loaded latest state from database:", latestState);
            onContentChange(latestState.content);
            onPresenceChange(latestState.presence);
        }
    } catch (error) {
        console.error("Failed to load latest state from database:", error);
    }

    // Initialize our presence
    latestState.presence[userId] = {
        userId,
        name: userName,
        cursor: null,
        lastActive: new Date().toISOString()
    };

    // Subscribe to document changes
    const unsubscribe = client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents.${documentId}`, 
        (response: RealtimeResponseEvent<any>) => {
            if (response.events.includes('databases.*.collections.*.documents.*.update')) {
                const updatedState = response.payload as DocumentState;
                console.log("Received realtime update:", updatedState);

                // Update content if changed
                if (updatedState.content !== latestState.content) {
                    latestState.content = updatedState.content;
                    onContentChange(updatedState.content);
                }

                // Update presence information if it exists
                if (updatedState.presence && documentMetadata?.$attributes?.includes('presence')) {
                    latestState.presence = updatedState.presence;
                    onPresenceChange(updatedState.presence);
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
        if (presenceUpdateTimeout) {
            clearTimeout(presenceUpdateTimeout);
        }
        // Remove our presence before unsubscribing
        updatePresence(null);
        unsubscribe();
    };
    activeSubscriptions.set(documentId, cleanup);

    // Function to update presence
    const updatePresence = async (cursor: CursorPosition | null) => {
        // Only update presence if the attribute exists in the document
        if (!documentMetadata?.$attributes?.includes('presence')) {
            console.log("Presence attribute not available yet");
            return;
        }

        // Update our presence locally first
        latestState.presence[userId] = {
            userId,
            name: userName,
            cursor,
            lastActive: new Date().toISOString()
        };

        // Debounce presence updates
        if (presenceUpdateTimeout) {
            clearTimeout(presenceUpdateTimeout);
        }
        presenceUpdateTimeout = setTimeout(async () => {
            try {
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID,
                    documentId,
                    {
                        presence: latestState.presence
                    }
                );
                console.log("Successfully updated presence");
            } catch (error) {
                console.error("Failed to update presence:", error);
            }
        }, 100); // Shorter debounce for presence updates
    };

    // Function to save content changes
    const saveContent = async (newContent: string) => {
        if (newContent === latestState.content) {
            return; // No changes to save
        }

        try {
            // Save to database with debounce
            if (databaseUpdateTimeout) {
                clearTimeout(databaseUpdateTimeout);
            }
            databaseUpdateTimeout = setTimeout(async () => {
                try {
                    const updateData: any = {
                        content: newContent
                    };
                    
                    // Only include presence if the attribute exists
                    if (documentMetadata?.$attributes?.includes('presence')) {
                        updateData.presence = latestState.presence;
                    }

                    await databases.updateDocument(
                        DATABASE_ID,
                        COLLECTION_ID,
                        documentId,
                        updateData
                    );
                    latestState.content = newContent;
                    console.log("Successfully saved update to database");
                } catch (error) {
                    console.error("Failed to save update to database:", error);
                }
            }, 1000);
        } catch (error) {
            console.error("Failed to handle document update:", error);
        }
    };

    // Return the interface for the collaboration
    return {
        saveContent,
        updatePresence,
        cleanup,
        getContent: () => latestState.content,
        getPresence: () => latestState.presence
    };
};