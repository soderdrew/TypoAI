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

    async function deleteFile(event: MouseEvent, fileId: string) {
        event.stopPropagation(); // Prevent file selection when clicking delete
        
        if (!confirm('Are you sure you want to delete this file?')) return;
        
        try {
            await databaseService.deleteFile(fileId);
            // Remove file from local array
            files = files.filter(f => f.$id !== fileId);
            // If the deleted file was the current file, select another file
            if (currentFileId === fileId && files.length > 0) {
                onFileSelect(files[0]);
            }
        } catch (err) {
            error = 'Failed to delete file';
            console.error('Error deleting file:', err);
        }
    }

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
    .files-sidebar {
        @apply fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-700 
               transform transition-transform duration-200 ease-in-out z-40 pt-16;
    }

    .files-sidebar.hidden {
        @apply -translate-x-full;
    }

    .files-sidebar.open {
        @apply translate-x-0;
    }

    .sidebar-header {
        @apply px-4 py-3 border-b border-gray-700 bg-gray-900;
    }

    .files-list {
        @apply p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)];
    }

    .file-item-wrapper {
        @apply relative flex items-center;
    }

    .file-item {
        @apply w-full px-3 py-2 text-left rounded text-gray-300 hover:text-white hover:bg-gray-700
               flex flex-col items-start transition-colors duration-150;
    }

    .file-item.active {
        @apply bg-gray-700 text-white;
    }

    .delete-button {
        @apply absolute right-2 p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded
               transition-all duration-150;
    }

    .file-title {
        @apply font-medium;
    }

    .file-date {
        @apply text-xs text-gray-400;
    }

    .loading, .error, .empty-state {
        @apply p-4 text-center text-gray-400;
    }

    .error {
        @apply text-red-400;
    }
</style> 