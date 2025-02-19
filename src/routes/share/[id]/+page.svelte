<!-- src/routes/share/[id]/+page.svelte -->
<script lang="ts">
    import type { PageData } from './$types';
    import type { SharedDocument } from '$lib/services/database';
    
    interface CollaboratorProfile {
        id: string;
        name: string;
        email: string;
    }

    interface DocumentWithOwner extends SharedDocument {
        owner: CollaboratorProfile;
        collaboratorProfiles: CollaboratorProfile[];
    }

    interface PageDataWithDoc extends PageData {
        document: DocumentWithOwner;
        currentUser: CollaboratorProfile;
    }
    
    export let data: PageDataWithDoc;
    
    $: ({ document, currentUser } = data);
</script>

<div class="container mx-auto p-4 max-w-3xl">
    <div class="bg-white shadow-lg rounded-lg p-6">
        <h1 class="text-2xl font-bold mb-4">{document.title}</h1>
        
        <div class="mb-6">
            <h2 class="text-lg font-semibold mb-2">Document Owner</h2>
            <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <div class="flex-1">
                    <p class="font-medium">{document.owner.name}</p>
                    <p class="text-sm text-gray-600">{document.owner.email}</p>
                </div>
                {#if document.owner.id === currentUser.id}
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">You</span>
                {/if}
            </div>
        </div>
        
        <div>
            <h2 class="text-lg font-semibold mb-2">Collaborators</h2>
            <div class="space-y-2">
                {#each document.collaboratorProfiles as collaborator}
                    <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <div class="flex-1">
                            <p class="font-medium">{collaborator.name}</p>
                            <p class="text-sm text-gray-600">{collaborator.email}</p>
                        </div>
                        {#if collaborator.id === currentUser.id}
                            <span class="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">You</span>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
        
        <div class="mt-6 flex justify-end space-x-4">
            <a 
                href={`/?doc=${document.$id}`}
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
                Open Document
            </a>
        </div>
    </div>
</div>