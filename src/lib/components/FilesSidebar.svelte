<script lang="ts">
    import { onMount } from 'svelte';
    import { databaseService } from '$lib/services/database';
    import { auth } from '$lib/stores/auth';
    import type { SharedDocument } from '$lib/services/database';

    export let isOpen = false;
    export let onFileSelect: (doc: SharedDocument) => void;
    export let currentFileId: string | null = null;
    export let files: SharedDocument[] = [];
    export let loading = true;
    export let error: string | null = null;

    let sharedFiles: SharedDocument[] = [];
    let loadingShared = false;
    let sharedError: string | null = null;
    let activeTab: 'my-files' | 'shared' = 'my-files';

    async function loadFiles() {
        if (!$auth.user) return;
        
        try {
            loading = true;
            files = await databaseService.getAllFiles($auth.user.$id);
        } catch (err) {
            error = 'Failed to load files';
            console.error('Error loading files:', err);
        } finally {
            loading = false;
        }
    }

    // async function deleteFile(event: MouseEvent, fileId: string) {
    //     event.stopPropagation(); // Prevent file selection when clicking delete
        
    //     if (!confirm('Are you sure you want to delete this file?')) return;
        
    //     try {
    //         await databaseService.deleteFile(fileId);
    //         // Remove file from local array
    //         files = files.filter(f => f.$id !== fileId);
    //         // If the deleted file was the current file, select another file
    //         if (currentFileId === fileId && files.length > 0) {
    //             onFileSelect(files[0]);
    //         }
    //     } catch (err) {
    //         error = 'Failed to delete file';
    //         console.error('Error deleting file:', err);
    //     }
    // }

    async function loadSharedFiles() {
        if (!$auth.user) return;
        
        try {
            loadingShared = true;
            sharedFiles = await databaseService.getSharedWithMe($auth.user.$id);
        } catch (err) {
            console.error('Error loading shared files:', err);
            sharedError = 'Failed to load shared files';
        } finally {
            loadingShared = false;
        }
    }

    onMount(() => {
        loadFiles();
        loadSharedFiles();
    });

    $: if ($auth.user) {
        loadFiles();
        loadSharedFiles();
    }
</script>

<div class="fixed top-16 left-0 bottom-0 w-64 bg-gray-900 border-r border-gray-700 transition-transform duration-200 {isOpen ? 'translate-x-0' : '-translate-x-full'}">
    <!-- Tabs -->
    <div class="flex border-b border-gray-700">
        <button 
            class="flex-1 px-4 py-2 text-sm font-medium {activeTab === 'my-files' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}"
            on:click={() => activeTab = 'my-files'}
        >
            My Files
        </button>
        <button 
            class="flex-1 px-4 py-2 text-sm font-medium {activeTab === 'shared' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}"
            on:click={() => activeTab = 'shared'}
        >
            Shared with me
        </button>
    </div>

    {#if activeTab === 'my-files'}
        <!-- My Files List -->
        <div class="p-4">
            {#if loading}
                <div class="text-gray-400 text-sm">Loading...</div>
            {:else if error}
                <div class="text-red-400 text-sm">{error}</div>
            {:else if files.length === 0}
                <div class="text-gray-400 text-sm">No files yet</div>
            {:else}
                <div class="space-y-2">
                    {#each files as file}
                        <button
                            class="w-full text-left p-2 rounded text-sm {currentFileId === file.$id ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}"
                            on:click={() => onFileSelect(file)}
                        >
                            {file.title || 'Untitled'}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {:else}
        <!-- Shared Files List -->
        <div class="p-4">
            {#if loadingShared}
                <div class="text-gray-400 text-sm">Loading shared files...</div>
            {:else if sharedError}
                <div class="text-red-400 text-sm">{sharedError}</div>
            {:else if sharedFiles.length === 0}
                <div class="text-gray-400 text-sm">No shared files</div>
            {:else}
                <div class="space-y-2">
                    {#each sharedFiles as file}
                        <button
                            class="w-full text-left p-2 rounded text-sm {currentFileId === file.$id ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}"
                            on:click={() => onFileSelect(file)}
                        >
                            {file.title || 'Untitled'}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    :global(.files-sidebar) {
        position: fixed;
        left: 0;
        top: 0;
        height: 100%;
        width: 16rem;
        background-color: rgb(17 24 39);
        border-right: 1px solid rgb(55 65 81);
        transform: translateX(0);
        transition-property: transform;
        transition-duration: 200ms;
        transition-timing-function: ease-in-out;
        z-index: 40;
        padding-top: 4rem;
    }
</style> 