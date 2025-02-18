<script lang="ts">
    import { onMount } from 'svelte';
    import { databaseService } from '$lib/services/database';
    import { auth } from '$lib/stores/auth';
    import type { SharedDocument } from '$lib/services/database';

    interface AppwriteDocument extends SharedDocument {
        $id: string;
    }

    export let isOpen = false;
    export let onFileSelect: (doc: AppwriteDocument) => void;
    export let currentFileId: string | null = null;
    export let files: AppwriteDocument[] = [];
    export let loading = true;
    export let error: string | null = null;

    async function loadFiles() {
        if (!$auth.user) return;
        
        try {
            loading = true;
            files = (await databaseService.getAllFiles($auth.user.$id)) as AppwriteDocument[];
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

    onMount(() => {
        loadFiles();
    });

    $: if ($auth.user) {
        loadFiles();
    }
</script>

<div class="files-sidebar {isOpen ? 'open' : ''}" class:hidden={!isOpen}>
    <div class="sidebar-header">
        <h2 class="text-lg font-semibold text-gray-50">Your Files</h2>
    </div>
    
    <div class="files-list">
        {#if loading}
            <div class="loading">Loading files...</div>
        {:else if error}
            <div class="error">{error}</div>
        {:else if files.length === 0}
            <div class="empty-state">No files yet</div>
        {:else}
            {#each files as file}
                <div class="file-item-wrapper group">
                    <button
                        class="file-item {currentFileId === file.$id ? 'active' : ''}"
                        on:click={() => onFileSelect(file)}
                    >
                        <span class="file-title">{file.title || 'Untitled'}</span>
                        <span class="file-date">{new Date(file.updatedAt).toLocaleDateString()}</span>
                    </button>
                    <button
                        class="delete-button opacity-0 group-hover:opacity-100"
                        on:click={(e) => deleteFile(e, file.$id)}
                        title="Delete file"
                    >
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            class="h-4 w-4" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path 
                                stroke-linecap="round" 
                                stroke-linejoin="round" 
                                stroke-width="2" 
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                            />
                        </svg>
                    </button>
                </div>
            {/each}
        {/if}
    </div>
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