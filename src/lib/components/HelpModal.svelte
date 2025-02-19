<script lang="ts">
	export let isOpen = false;
	export let onClose: () => void;
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
		<div class="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
			<div class="flex justify-between items-center p-4 border-b border-gray-700">
				<h2 class="text-lg font-semibold text-gray-100">Keyboard Shortcuts</h2>
				<button 
					class="text-gray-400 hover:text-gray-200"
					on:click={onClose}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="p-4 space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<h3 class="font-medium text-gray-200">Text Formatting</h3>
						<div class="space-y-1 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-400">Bold</span>
								<kbd class="px-2 py-1 bg-gray-700 text-white rounded text-xs">Ctrl/⌘ + B</kbd>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-400">Italic</span>
								<kbd class="px-2 py-1 bg-gray-700 text-white rounded text-xs">Ctrl/⌘ + I</kbd>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-400">Underline</span>
								<kbd class="px-2 py-1 bg-gray-700 text-white rounded text-xs">Ctrl/⌘ + U</kbd>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-400">Link</span>
								<kbd class="px-2 py-1 bg-gray-700 text-white rounded text-xs">Ctrl/⌘ + K</kbd>
							</div>
						</div>
					</div>
					<div class="space-y-2">
						<h3 class="font-medium text-gray-200">General</h3>
						<div class="space-y-1 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-400">Save</span>
								<kbd class="px-2 py-1 bg-gray-700 text-white rounded text-xs">Ctrl/⌘ + S</kbd>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-400">Toggle Focus Mode</span>
								<kbd class="px-2 py-1 bg-gray-700 text-white rounded text-xs">Ctrl/⌘ + M</kbd>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-400">Toggle Sidebar</span>
								<kbd class="px-2 py-1 bg-gray-700 text-white rounded text-xs">Ctrl/⌘ + \</kbd>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if} 