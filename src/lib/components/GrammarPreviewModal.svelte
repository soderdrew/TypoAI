<script lang="ts">
    import type { AISuggestion } from '$lib/services/ai';
    
    export let isOpen = false;
    export let original: string = "";
    export let corrected: string = "";
    export let changes: AISuggestion[] = [];
    export let onAccept: (activeChanges: AISuggestion[]) => void;
    export let onReject: () => void;

    let excludedChanges = new Set<string>();
    let currentCorrected = corrected;
    let showExcluded = false;

    // Update the corrected text when changes are toggled
    function toggleChange(change: AISuggestion) {
        const key = change.original;
        if (excludedChanges.has(key)) {
            excludedChanges.delete(key);
        } else {
            excludedChanges.add(key);
        }
        updateCorrectedText();
    }

    // Recalculate the corrected text based on active changes
    function updateCorrectedText() {
        // Start with original text
        let text = original;
        
        // Apply only the active changes
        changes
            .filter(change => !excludedChanges.has(change.original))
            .forEach(change => {
                text = text.replace(change.original, change.suggestion);
            });
        
        currentCorrected = text;
    }

    function handleAccept() {
        // Filter out excluded changes and pass the current corrected text
        const activeChanges = changes.filter(change => !excludedChanges.has(change.original));
        onAccept(activeChanges);
    }

    // Initialize currentCorrected when the modal opens
    $: if (isOpen) {
        currentCorrected = corrected;
        excludedChanges.clear();
        showExcluded = false;
    }

    $: enabledChangesCount = changes.length - excludedChanges.size;
    $: totalChangesCount = changes.length;
    $: hasExcludedChanges = excludedChanges.size > 0;
</script>

<style>
    .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgb(55 65 81) transparent;
    }

    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgb(55 65 81);
        border-radius: 3px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: rgb(75 85 99);
    }

    .modal-content {
        max-height: 90vh;
        width: 90vw;
        max-width: 1400px;
    }

    .modal-scroll-area {
        overflow-y: auto;
        height: calc(90vh - 130px); /* Account for header and footer */
    }

    .text-panes {
        min-height: 300px;
    }

    .change-item {
        position: relative;
    }

    .change-item:hover .hover-controls {
        opacity: 1;
    }

    .hover-controls {
        opacity: 1;
        transition: opacity 0.2s;
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
    }

    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 36px;
        height: 20px;
    }

    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgb(55 65 81);
        transition: .4s;
        border-radius: 20px;
    }

    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
    }

    input:checked + .toggle-slider {
        background-color: rgb(37 99 235);
    }

    input:checked + .toggle-slider:before {
        transform: translateX(16px);
    }

    .suggestion-switch {
        position: relative;
        display: inline-block;
        width: 32px;
        height: 18px;
    }

    .suggestion-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .suggestion-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgb(55 65 81);
        transition: .4s;
        border-radius: 20px;
    }

    .suggestion-slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
    }

    input:checked + .suggestion-slider {
        background-color: rgb(37 99 235);
    }

    input:checked + .suggestion-slider:before {
        transform: translateX(14px);
    }
</style>

{#if isOpen}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
        <div class="modal-content bg-gray-800 rounded-lg flex flex-col">
            <div class="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 class="text-lg font-semibold text-gray-100">Review Grammar & Style Changes</h2>
                <button 
                    class="text-gray-400 hover:text-gray-200"
                    on:click={onReject}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div class="modal-scroll-area custom-scrollbar">
                <div class="p-4 space-y-4">
                    <div class="grid grid-cols-2 gap-4 text-panes">
                        <div class="flex flex-col">
                            <h3 class="text-sm font-medium text-gray-300 mb-2">Original</h3>
                            <div class="bg-gray-900 rounded p-4">
                                <pre class="whitespace-pre-wrap font-mono text-sm text-gray-300">{original}</pre>
                            </div>
                        </div>
                        <div class="flex flex-col">
                            <h3 class="text-sm font-medium text-gray-300 mb-2">Corrected</h3>
                            <div class="bg-gray-900 rounded p-4">
                                <pre class="whitespace-pre-wrap font-mono text-sm text-gray-300">{currentCorrected}</pre>
                            </div>
                        </div>
                    </div>

                    <div class="border-t border-gray-700 pt-4">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-100">Active Changes ({enabledChangesCount} of {totalChangesCount})</h3>
                            {#if hasExcludedChanges}
                                <label class="flex items-center space-x-2 cursor-pointer">
                                    <span class="text-sm text-gray-400">Show excluded</span>
                                    <div class="toggle-switch">
                                        <input type="checkbox" bind:checked={showExcluded}>
                                        <span class="toggle-slider"></span>
                                    </div>
                                </label>
                            {/if}
                        </div>
                        <div class="space-y-2">
                            {#each changes as change}
                                <div class="change-item flex items-start space-x-2 bg-gray-900 p-2 rounded-lg" class:opacity-50={excludedChanges.has(change.original)}>
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2">
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize
                                                {change.type === 'spelling' ? 'bg-red-900 text-red-200' :
                                                change.type === 'grammar' ? 'bg-yellow-900 text-yellow-200' :
                                                change.type === 'style' ? 'bg-blue-900 text-blue-200' :
                                                'bg-purple-900 text-purple-200'}">
                                                {change.type}
                                            </span>
                                        </div>
                                        <div class="mt-1">
                                            <span class="text-gray-300 line-through">{change.original}</span>
                                            <span class="text-green-400 mx-2">→</span>
                                            <span class="text-green-400">{change.suggestion}</span>
                                        </div>
                                        <p class="mt-1 text-xs text-gray-400">{change.explanation}</p>
                                    </div>
                                    <div class="hover-controls">
                                        <label class="suggestion-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={!excludedChanges.has(change.original)}
                                                on:change={() => toggleChange(change)}
                                            >
                                            <span class="suggestion-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-4 border-t border-gray-700 flex justify-end space-x-4">
                <button
                    class="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    on:click={onReject}
                >
                    Cancel
                </button>
                <button
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    on:click={handleAccept}
                >
                    Apply Selected Changes
                </button>
            </div>
        </div>
    </div>
{/if} 