# src/lib/components/Header.svelte
<script lang="ts">
	import Files from '$lib/components/svg/Files.svelte';
	import Share from '$lib/components/svg/Share.svelte';
	import Open from "$lib/components/svg/Open.svelte";
	import Save from "$lib/components/svg/Save.svelte";
	import Copy from "$lib/components/svg/Copy.svelte";
	import CopyComplete from "$lib/components/svg/CopyComplete.svelte";
	import Code from "$lib/components/svg/Code.svelte";
	import PrintButton from "$lib/components/PrintButton.svelte";
	import { auth } from '$lib/stores/auth';
	import type { SharedDocument } from '$lib/services/database';

	export let isSidebarOpen: boolean;
	export let currentFile: SharedDocument | null;
	export let content: string;
	export let html: string;
	export let isSaving: boolean;
	export let errorMessage: string | null;
	export let supported: boolean;
	export let isHelpModalOpen: boolean;
	export let isProfileMenuOpen: boolean;

	export let onToggleSidebar: () => void;
	export let onCreateNewFile: () => void;
	export let onSaveCurrentFile: () => void;
	export let onOpen: () => void;
	export let onSaveAs: () => void;
	export let onFormat: () => void;
	export let onShare: () => void;
	export let onLogout: () => void;
	export let onClearError: () => void;
	export let onAIFormat: () => void;
	export let onGrammarCheck: () => void;

	$: isSidebarOpen;  // Mark prop as used
</script>

<header class="fixed top-0 left-0 right-0 z-50 bg-gray-950 border-b border-gray-700">
	<div class="flex items-center justify-between px-4 h-16">
		<div class="flex items-center space-x-2">
			<button
				title="Toggle Files Sidebar (Ctrl/Cmd + \)"
				class="button"
				on:click={onToggleSidebar}
			>
				<Files />
			</button>

			<button
				title="New File"
				class="button"
				on:click={onCreateNewFile}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
			</button>

			{#if currentFile}
				<div class="flex items-center space-x-2">
					<input
						type="text"
						bind:value={currentFile.title}
						class="px-2 py-1 text-lg font-medium bg-transparent border border-transparent hover:border-gray-700 focus:border-blue-500 rounded text-gray-50 transition-colors duration-150 focus:outline-none"
						placeholder="Untitled"
						on:blur={onSaveCurrentFile}
					/>
					{#if isSaving}
						<div class="flex items-center text-gray-400 text-sm">
							<svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span>Saving...</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="flex items-center space-x-4">
			<div class="flex items-center space-x-2">
				{#if supported}
					<button
						title="Open (or drag and drop)"
						class="button"
						on:click={onOpen}
					>
						<Open />
						<span class="hidden lg:inline">Open</span>
					</button>
					<button title="Save As" class="button" on:click={onSaveAs}>
						<Save />
						<span class="hidden lg:inline">Save As</span>
					</button>
				{:else}
					<a
						href="data:text/plain,{content}"
						download="Untitled.md"
						title="Download"
						class="button"
					>
						<Save />
						<span class="hidden lg:inline">Download</span>
					</a>
				{/if}
				<drab-copy value={content} class="contents">
					<button data-trigger class="button">
						<span data-content>
							<Copy />
						</span>
						<template data-swap>
							<CopyComplete />
						</template>
						<span class="hidden lg:inline">Copy</span>
					</button>
				</drab-copy>

				<button
					title="Get sharable link"
					class="button"
					on:click={onShare}
				>
					<Share />
					<span class="hidden lg:inline">Share</span>
				</button>

				<drab-copy value={html} class="contents">
					<button data-trigger title="Copy HTML" class="button">
						<span data-content>
							<Code />
						</span>
						<template data-swap>
							<CopyComplete />
						</template>
						<span class="hidden lg:inline">Copy</span>
					</button>
				</drab-copy>
				<PrintButton innerHtml={html} />
				<!-- <button title="Format" on:click={onFormat} class="button">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="h-5 w-5"
					>
						<path
							fill-rule="evenodd"
							d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
							clip-rule="evenodd"
						/>
						<path
							d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z"
						/>
					</svg>
					<span class="hidden lg:inline">Format</span>
				</button> -->
				<button title="AI Format" on:click={onAIFormat} class="button">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
					<span class="hidden lg:inline">AI Format</span>
				</button>
				<button title="Grammar Check" on:click={onGrammarCheck} class="button">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<span class="hidden lg:inline">Grammar</span>
				</button>
			</div>

			<div class="relative">
				<button 
					class="button p-2 h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center"
					on:click={() => isProfileMenuOpen = !isProfileMenuOpen}
					title={$auth.user?.name}
				>
					{#if $auth.user?.name}
						<span class="text-sm font-medium">
							{$auth.user.name.charAt(0).toUpperCase()}
						</span>
					{/if}
				</button>

				{#if isProfileMenuOpen}
					<div class="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-lg py-1 z-50">
						<div class="px-4 py-2 border-b border-gray-700">
							<p class="text-sm font-medium text-gray-200">{$auth.user?.name}</p>
							<p class="text-xs text-gray-400">{$auth.user?.email}</p>
						</div>

						<button
							class="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center"
							on:click={() => {
								isHelpModalOpen = true;
								isProfileMenuOpen = false;
							}}
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							Keyboard Shortcuts
						</button>

						<button
							class="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center border-t border-gray-700"
							on:click={onLogout}
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
							</svg>
							Sign Out
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#if errorMessage}
		<div class="bg-red-950 text-red-100 px-4 py-2 text-sm flex justify-between items-center">
			<span>{errorMessage}</span>
			<button 
				class="ml-4 text-red-100 hover:text-white focus:outline-none" 
				on:click={onClearError}
				title="Dismiss"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>
	{/if}
</header>

<style>
	.button {
		padding: 0.5rem;
		color: rgb(209 213 219);
		border-radius: 0.5rem;
		transition-property: color, background-color;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 150ms;
		display: flex;
		align-items: center;
	}

	.button:hover {
		color: white;
		background-color: rgb(55 65 81);
	}

	:global(.dark) .button {
		color: rgb(209 213 219);
	}

	:global(.dark) .button:hover {
		color: white;
		background-color: rgb(55 65 81);
	}
</style> 