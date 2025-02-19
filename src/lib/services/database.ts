import { Client, Databases, ID, Query, Permission, Role } from 'appwrite';
import { auth } from '$lib/stores/auth';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);

// Database and collection IDs
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;  // Updated to match your database ID
const PROFILES_COLLECTION_ID = 'profiles';
const DOCUMENTS_COLLECTION_ID = 'documents';

export interface UserProfile {
    userId: string;
    name: string;
    email: string;
    createdAt: string;
    documentsCount: number;
    lastLoginAt: string;
}

export interface SharedDocument {
    $id: string;
    id: string;
    title: string;
    content: string;
    ownerId: string;
    collaborators: string[]; // Array of user IDs
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CollaboratorProfile {
    id: string;
    name: string;
    email: string;
}

export const databaseService = {
    // User Profiles
    async createProfile(userId: string, name: string, email: string): Promise<UserProfile> {
        try {
            console.log('Creating profile with:', {
                databaseId: DATABASE_ID,
                collectionId: PROFILES_COLLECTION_ID,
                userId,
                name,
                email
            });
            
            const profile = await databases.createDocument(
                DATABASE_ID,
                PROFILES_COLLECTION_ID,
                userId,
                {
                    userId,
                    name,
                    email,
                    createdAt: new Date().toISOString(),
                    documentsCount: 0,
                    lastLoginAt: new Date().toISOString()
                }
            );
            console.log('Profile created successfully:', profile);
            return profile as unknown as UserProfile;
        } catch (error) {
            console.error('Error creating profile:', {
                error,
                databaseId: DATABASE_ID,
                collectionId: PROFILES_COLLECTION_ID,
                userId
            });
            throw error;
        }
    },

    async ensureProfile(userId: string, name: string, email: string): Promise<UserProfile> {
        try {
            console.log('Ensuring profile exists for:', { userId, name, email });
            // Try to get the profile
            try {
                const profile = await this.getProfile(userId);
                console.log('Existing profile found:', profile);
                // Update lastLoginAt
                return await this.updateProfile(userId, { lastLoginAt: new Date().toISOString() });
            } catch (error) {
                console.log('No existing profile found, creating new one');
                // If profile doesn't exist, create one
                return await this.createProfile(userId, name, email);
            }
        } catch (error) {
            console.error('Error ensuring profile:', error);
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

    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
        try {
            const profile = await databases.updateDocument(
                DATABASE_ID,
                PROFILES_COLLECTION_ID,
                userId,
                updates
            );
            return profile as unknown as UserProfile;
        } catch (error) {
            console.error('Error updating profile:', error);
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
                documentId,
                // Add permissions for both owner and collaborators
                [
                    Permission.read(Role.user('{{document.ownerId}}')),
                    Permission.read(Role.user('{{document.collaborators}}')),
                    Permission.update(Role.user('{{document.ownerId}}')),
                    Permission.update(Role.user('{{document.collaborators}}'))
                ]
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
                    Query.search('collaborators', user.$id)
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
            console.log('Adding collaborator:', { documentId, collaboratorId });
            
            // First try to get the document
            let doc;
            try {
                doc = await databases.getDocument(
                    DATABASE_ID,
                    DOCUMENTS_COLLECTION_ID,
                    documentId
                );
                console.log('Retrieved document:', doc);
            } catch (error) {
                console.error('Error getting document:', error);
                throw error;
            }

            // Check if collaborator is already added
            if (doc.collaborators.includes(collaboratorId)) {
                console.log('Collaborator already exists:', collaboratorId);
                return doc as unknown as SharedDocument;
            }

            // Add new collaborator
            const updatedCollaborators = [...doc.collaborators, collaboratorId];
            console.log('Updating collaborators:', updatedCollaborators);

            try {
                // Update document with new collaborator
                const updatedDoc = await databases.updateDocument(
                    DATABASE_ID,
                    DOCUMENTS_COLLECTION_ID,
                    documentId,
                    { collaborators: updatedCollaborators }
                );
                console.log('Document updated successfully:', updatedDoc);
                return updatedDoc as unknown as SharedDocument;
            } catch (error) {
                console.error('Error updating document:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error in addCollaborator:', error);
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
    },

    async saveFile(title: string, content: string, userId: string): Promise<SharedDocument> {
        try {
            const doc = await databases.createDocument(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                ID.unique(),
                {
                    title,
                    content,
                    ownerId: userId,
                    collaborators: [userId],
                    isPublic: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            );
            return doc as unknown as SharedDocument;
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    },

    async getAllFiles(userId: string): Promise<SharedDocument[]> {
        try {
            const { documents } = await databases.listDocuments(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                [Query.equal("ownerId", userId)]
            );
            return documents as unknown as SharedDocument[];
        } catch (error) {
            console.error('Error getting all files:', error);
            throw error;
        }
    },

    async getSharedWithMe(userId: string): Promise<SharedDocument[]> {
        try {
            const { documents } = await databases.listDocuments(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                [
                    Query.contains('collaborators', [userId]),
                    Query.notEqual('ownerId', userId)
                ]
            );
            return documents as unknown as SharedDocument[];
        } catch (error) {
            console.error('Error getting shared files:', error);
            throw error;
        }
    },

    async getFile(fileId: string): Promise<SharedDocument> {
        try {
            const doc = await databases.getDocument(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                fileId
            );
            return doc as unknown as SharedDocument;
        } catch (error) {
            console.error('Error getting file:', error);
            throw error;
        }
    },

    async updateFile(fileId: string, content: string, title: string): Promise<SharedDocument> {
        try {
            const doc = await databases.updateDocument(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                fileId,
                {
                    content,
                    title,
                    updatedAt: new Date().toISOString()
                }
            );
            return doc as unknown as SharedDocument;
        } catch (error) {
            console.error('Error updating file:', error);
            throw error;
        }
    },

    async deleteFile(fileId: string): Promise<void> {
        try {
            await databases.deleteDocument(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                fileId
            );
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    },

    async getCollaboratorProfiles(collaboratorIds: string[]): Promise<CollaboratorProfile[]> {
        try {
            const profiles = await Promise.all(
                collaboratorIds.map(async (id) => {
                    try {
                        const profile = await databases.getDocument(
                            DATABASE_ID,
                            PROFILES_COLLECTION_ID,
                            id
                        );
                        return {
                            id,
                            name: profile.name,
                            email: profile.email
                        };
                    } catch (error) {
                        return {
                            id,
                            name: 'Unknown User',
                            email: ''
                        };
                    }
                })
            );
            return profiles;
        } catch (error) {
            console.error('Error getting collaborator profiles:', error);
            throw error;
        }
    },

    async findUserByEmail(email: string): Promise<UserProfile | null> {
        try {
            console.log('Finding user by email:', email);
            
            const response = await databases.listDocuments(
                DATABASE_ID,
                PROFILES_COLLECTION_ID,
                [Query.equal('email', email)]
            );
            
            console.log('User search response:', response);
            
            if (response.documents.length === 0) {
                console.log('No user found with email:', email);
                return null;
            }
            
            console.log('Found user:', response.documents[0]);
            return response.documents[0] as unknown as UserProfile;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }
}; 