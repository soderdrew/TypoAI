<script lang="ts">
    import type { FormatPreview } from '$lib/services/ai';
    
    export let isOpen = false;
    export let preview: FormatPreview | null = null;
    export let onAccept: () => void;
    export let onReject: () => void;

    function splitIntoLines(text: string): string[] {
        return text.split('\n');
    }
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
</style>

{#if isOpen && preview}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
        <div class="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div class="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 class="text-lg font-semibold text-gray-100">Review AI Formatting</h2>
                <button 
                    class="text-gray-400 hover:text-gray-200"
                    on:click={onReject}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div class="flex-1 min-h-0 p-4 grid grid-cols-2 gap-4">
                <div class="flex flex-col min-h-0">
                    <h3 class="text-sm font-medium text-gray-300 mb-2">Original</h3>
                    <div class="flex-1 min-h-0 bg-gray-900 rounded">
                        <div class="h-full overflow-y-auto font-mono text-sm text-gray-300 custom-scrollbar p-4">
                            {#each splitIntoLines(preview.original) as line}
                                <div class="min-h-[1.5rem]">{line || ' '}</div>
                            {/each}
                        </div>
                    </div>
                </div>
                <div class="flex flex-col min-h-0">
                    <h3 class="text-sm font-medium text-gray-300 mb-2">Formatted</h3>
                    <div class="flex-1 min-h-0 bg-gray-900 rounded">
                        <div class="h-full overflow-y-auto font-mono text-sm text-gray-300 custom-scrollbar p-4">
                            {#each splitIntoLines(preview.formatted) as line}
                                <div class="min-h-[1.5rem]">{line || ' '}</div>
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
                    on:click={onAccept}
                >
                    Apply Changes
                </button>
            </div>
        </div>
    </div>
{/if} 