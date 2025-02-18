import { Client, Databases, ID, Query, Permission, Role } from 'appwrite';
import { auth } from '$lib/stores/auth';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

// Database and collection IDs (create these in Appwrite Console)
const DATABASE_ID = 'typo-ai';
const PROFILES_COLLECTION_ID = 'profiles';
const DOCUMENTS_COLLECTION_ID = 'documents';

export interface UserProfile {
    userId: string;
    name: string;
    email: string;
    createdAt: string;
}

export interface SharedDocument {
    id: string;
    title: string;
    content: string;
    ownerId: string;
    collaborators: string[]; // Array of user IDs
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

export const databaseService = {
    // User Profiles
    async createProfile(userId: string, name: string, email: string): Promise<UserProfile> {
        try {
            const profile = await databases.createDocument(
                DATABASE_ID,
                PROFILES_COLLECTION_ID,
                userId,
                {
                    userId,
                    name,
                    email,
                    createdAt: new Date().toISOString()
                }
            );
            return profile as unknown as UserProfile;
        } catch (error) {
            console.error('Error creating profile:', error);
            throw error;
        }
    },

    async getProfile(userId: string): Promise<UserProfile> {
        try {
            const profile = await databases.getDocument(
                DATABASE_ID,
                PROFILES_COLLECTION_ID,
                userId
            );
            return profile as unknown as UserProfile;
        } catch (error) {
            console.error('Error getting profile:', error);
            throw error;
        }
    },

    // Documents
    async createDocument(title: string, content: string, isPublic: boolean = false): Promise<SharedDocument> {
        const user = auth.getUser();
        if (!user) throw new Error('User not authenticated');

        try {
            const doc = await databases.createDocument(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                ID.unique(),
                {
                    title,
                    content,
                    ownerId: user.$id,
                    collaborators: [user.$id],
                    isPublic,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            );

            // Set permissions after creation
            if (isPublic) {
                await databases.updateDocument(
                    DATABASE_ID,
                    DOCUMENTS_COLLECTION_ID,
                    doc.$id,
                    {},
                    [Permission.read(Role.any())]
                );
            }

            return doc as unknown as SharedDocument;
        } catch (error) {
            console.error('Error creating document:', error);
            throw error;
        }
    },

    async updateDocument(documentId: string, data: Partial<SharedDocument>): Promise<SharedDocument> {
        try {
            const doc = await databases.updateDocument(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                documentId,
                {
                    ...data,
                    updatedAt: new Date().toISOString()
                }
            );
            return doc as unknown as SharedDocument;
        } catch (error) {
            console.error('Error updating document:', error);
            throw error;
        }
    },

    async getDocument(documentId: string): Promise<SharedDocument> {
        try {
            const doc = await databases.getDocument(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                documentId
            );
            return doc as unknown as SharedDocument;
        } catch (error) {
            console.error('Error getting document:', error);
            throw error;
        }
    },

    async getUserDocuments(): Promise<SharedDocument[]> {
        const user = auth.getUser();
        if (!user) throw new Error('User not authenticated');

        try {
            const docs = await databases.listDocuments(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                [
                    Query.equal('collaborators', [user.$id])
                ]
            );
            return docs.documents as unknown as SharedDocument[];
        } catch (error) {
            console.error('Error getting user documents:', error);
            throw error;
        }
    },

    async addCollaborator(documentId: string, collaboratorId: string): Promise<SharedDocument> {
        try {
            const doc = await this.getDocument(documentId);
            if (!doc.collaborators.includes(collaboratorId)) {
                doc.collaborators.push(collaboratorId);
                
                // Update document with new collaborator
                const updatedDoc = await databases.updateDocument(
                    DATABASE_ID,
                    DOCUMENTS_COLLECTION_ID,
                    documentId,
                    { collaborators: doc.collaborators },
                    [
                        Permission.read(Role.user(collaboratorId)),
                        Permission.write(Role.user(collaboratorId))
                    ]
                );
                
                return updatedDoc as unknown as SharedDocument;
            }
            return doc;
        } catch (error) {
            console.error('Error adding collaborator:', error);
            throw error;
        }
    },

    async removeCollaborator(documentId: string, collaboratorId: string): Promise<SharedDocument> {
        try {
            const doc = await this.getDocument(documentId);
            const index = doc.collaborators.indexOf(collaboratorId);
            if (index > -1) {
                doc.collaborators.splice(index, 1);
                
                // Update document and remove collaborator permissions
                const updatedDoc = await databases.updateDocument(
                    DATABASE_ID,
                    DOCUMENTS_COLLECTION_ID,
                    documentId,
                    { collaborators: doc.collaborators }
                );
                
                return updatedDoc as unknown as SharedDocument;
            }
            return doc;
        } catch (error) {
            console.error('Error removing collaborator:', error);
            throw error;
        }
    }
}; 