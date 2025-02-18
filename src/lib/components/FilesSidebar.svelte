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
                <button
                    class="file-item {currentFileId === file.$id ? 'active' : ''}"
                    on:click={() => onFileSelect(file)}
                >
                    <span class="file-title">{file.title || 'Untitled'}</span>
                    <span class="file-date">{new Date(file.updatedAt).toLocaleDateString()}</span>
                </button>
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

    .file-item {
        @apply w-full px-3 py-2 text-left rounded text-gray-300 hover:text-white hover:bg-gray-700
               flex flex-col items-start transition-colors duration-150;
    }

    .file-item.active {
        @apply bg-gray-700 text-white;
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