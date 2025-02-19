<!-- AIAnalysisModal.svelte -->
<script lang="ts">
    import type { AISuggestion } from '$lib/services/ai';
    import { aiService } from '$lib/services/ai';

    export let isOpen: boolean;
    export let content: string;
    export let onClose: () => void;
    export let onApplyChanges: (newContent: string) => void;

    let loading = false;
    let error: string | null = null;
    let suggestions: AISuggestion[] = [];
    let selectedSuggestions = new Set<number>();

    async function analyzeSuggestions() {
        loading = true;
        error = null;
        try {
            suggestions = await aiService.analyzeText(content);
            // Pre-select all suggestions
            selectedSuggestions = new Set(suggestions.map((_, index) => index));
        } catch (err) {
            error = 'Failed to analyze text. Please try again.';
            console.error('Analysis error:', err);
        } finally {
            loading = false;
        }
    }

    function toggleSuggestion(index: number) {
        if (selectedSuggestions.has(index)) {
            selectedSuggestions.delete(index);
        } else {
            selectedSuggestions.add(index);
        }
        selectedSuggestions = selectedSuggestions; // Trigger reactivity
    }

    function applySelectedChanges() {
        let newContent = content;
        let offset = 0;

        // Sort suggestions by startIndex to apply changes from start to end
        const sortedSuggestions = [...suggestions]
            .sort((a, b) => a.startIndex - b.startIndex)
            .filter((_, index) => selectedSuggestions.has(index));

        // Apply each selected suggestion
        for (const suggestion of sortedSuggestions) {
            const start = suggestion.startIndex + offset;
            const end = suggestion.endIndex + offset;
            newContent = newContent.slice(0, start) + suggestion.suggestion + newContent.slice(end);
            // Update offset for subsequent replacements
            offset += suggestion.suggestion.length - (suggestion.endIndex - suggestion.startIndex);
        }

        onApplyChanges(newContent);
        onClose();
    }

    $: if (isOpen) {
        analyzeSuggestions();
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
            <!-- Header -->
            <div class="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 class="text-lg font-semibold text-gray-100">AI Text Analysis</h2>
                <button 
                    class="text-gray-400 hover:text-gray-200"
                    on:click={onClose}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-4">
                {#if loading}
                    <div class="flex items-center justify-center h-full">
                        <div class="text-center">
                            <div class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
                            <p class="text-gray-300">Analyzing text...</p>
                        </div>
                    </div>
                {:else if error}
                    <div class="text-red-400 text-center p-4">
                        {error}
                    </div>
                {:else if suggestions.length === 0}
                    <div class="text-gray-300 text-center p-4">
                        No suggestions found. Your text looks good!
                    </div>
                {:else}
                    <div class="space-y-4">
                        {#each suggestions as suggestion, index}
                            <div class="bg-gray-700 rounded-lg p-4">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2 mb-2">
                                            <span class="px-2 py-1 text-xs rounded-full
                                                {suggestion.type === 'spelling' ? 'bg-red-500' :
                                                suggestion.type === 'grammar' ? 'bg-yellow-500' :
                                                suggestion.type === 'style' ? 'bg-blue-500' :
                                                'bg-green-500'}
                                                text-white"
                                            >
                                                {suggestion.type}
                                            </span>
                                            <p class="text-gray-300 text-sm">{suggestion.explanation}</p>
                                        </div>
                                        <div class="grid grid-cols-2 gap-4">
                                            <div class="bg-gray-800 p-3 rounded">
                                                <div class="text-sm text-gray-400 mb-1">Original</div>
                                                <div class="text-gray-100">{suggestion.original}</div>
                                            </div>
                                            <div class="bg-gray-800 p-3 rounded">
                                                <div class="text-sm text-gray-400 mb-1">Suggestion</div>
                                                <div class="text-teal-400">{suggestion.suggestion}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <button
                                            class="p-2 rounded-lg transition-colors
                                                {selectedSuggestions.has(index) ?
                                                'bg-teal-600 hover:bg-teal-700' :
                                                'bg-gray-600 hover:bg-gray-500'}"
                                            on:click={() => toggleSuggestion(index)}
                                        >
                                            {#if selectedSuggestions.has(index)}
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                                </svg>
                                            {:else}
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            {/if}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Footer -->
            <div class="border-t border-gray-700 p-4 flex justify-between items-center">
                <div class="text-sm text-gray-400">
                    {suggestions.length} suggestions found
                </div>
                <div class="flex space-x-2">
                    <button
                        class="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                        on:click={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        on:click={applySelectedChanges}
                        disabled={selectedSuggestions.size === 0 || loading}
                    >
                        Apply Selected Changes
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if} 