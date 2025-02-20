<script lang="ts">
	import "../app.postcss";
	import { dev, browser } from "$app/environment";
	import { afterUpdate, onMount, onDestroy } from "svelte";
	import { inject } from "@vercel/analytics";
	import { writable, get } from 'svelte/store';
	import { processMarkdown } from "robino/util/md";
	import gettingStarted from "$lib/gettingStarted.md?raw";
	import { codeEval } from "$lib/utilities/codeEval";
	import { formatMd } from "$lib/utilities/formatMd";
	import type { FileSystemFileHandle } from '$lib/types/fileSystem';
	import { FileOperationsService } from '$lib/services/fileOperations';

	import { auth } from '$lib/stores/auth';
	import { authService } from '$lib/services/appwrite';
	import { databaseService } from '$lib/services/database';
	import type { SharedDocument } from '$lib/services/database';
	import { initializeCollaboration } from '$lib/services/collaboration';
	import { getBaseURL } from '$lib/utilities/url';

	import Auth from '$lib/components/Auth.svelte';
	import FilesSidebar from '$lib/components/FilesSidebar.svelte';
	import ShareModal from '$lib/components/ShareModal.svelte';
	import HelpModal from '$lib/components/HelpModal.svelte';
	import PreviewPane from '$lib/components/PreviewPane.svelte';
	import TextEditor from '$lib/components/TextEditor.svelte';
	import Header from '$lib/components/Header.svelte';

	import { AIService } from '$lib/services/ai';
	import FormatPreviewModal from '$lib/components/FormatPreviewModal.svelte';
	import type { FormatPreview } from '$lib/services/ai';

	inject({ mode: dev ? "development" : "production" });

	let content = "";
	let viewMode = false;
	let currentSlide: number;
	let fileHandle: FileSystemFileHandle | null = null;
	let errorMessage: string | null = null;
	let supported = false;
	if (browser) supported = Boolean(window.showOpenFilePicker);

	interface Preferences {
		fontSize: number;
		fontFamily: number;
		color: number;
		viewType: "document" | "slideshow";
		focusMode: boolean;
	}

	let preferences: Preferences = {
		fontSize: 1,
		fontFamily: 0,
		color: 0,
		viewType: "document",
		focusMode: false
	};

	const savePreferences = () => {
		localStorage.setItem("preferences", JSON.stringify(preferences));
	};

	const fileOps = new FileOperationsService();

	const open = async () => {
		const result = await fileOps.open();
		content = result.content;
		fileHandle = fileOps.getFileHandle();
		errorMessage = result.error;
	};

	const saveAs = async () => {
		const result = await fileOps.saveAs(content);
		fileHandle = fileOps.getFileHandle();
		errorMessage = result.error;
	};

	const save = async () => {
		const result = await fileOps.save(content, viewMode);
		fileHandle = fileOps.getFileHandle();
		errorMessage = result.error;
	};

	const dropFile = async (e: DragEvent) => {
		const result = await fileOps.handleDrop(e);
		if (result.content) {
			content = result.content;
			fileHandle = fileOps.getFileHandle();
		}
		errorMessage = result.error;
	};

	const toggleView = () => {
		const toggleView = () => {
			viewMode = !viewMode;
		};
		if (document.startViewTransition) {
			document.startViewTransition(() => {
				toggleView();
			});
		} else {
			toggleView();
		}
	};

	const onKeyUp = (e: KeyboardEvent) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "s") {
			e.preventDefault();
			save();
		}
		
		if (e.key === "Escape") {
			toggleView();
		} else {
			findCurrentSlide();
		}
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.ctrlKey || e.metaKey) {
			switch (e.key.toLowerCase()) {
				case 's':
					e.preventDefault();
					if (e.shiftKey) {
						saveAs();
					} else {
						save();
					}
					break;
				case '\\':
					e.preventDefault();
					isSidebarOpen = !isSidebarOpen;
					break;
			}
		}
	};

	const findCurrentSlide = () => {
		if (preferences.viewType === "slideshow" && !viewMode) {
			const s = content.slice(0, content.length);
			let curr = s.split("\n\n---\n").length - 1;
			if (s.startsWith("---\n")) curr++; // if first line === `---`, considered an <hr>
			currentSlide = curr;
		}
	};

	const clearError = () => {
		errorMessage = null;
	};

	let hasUnsavedChanges = false;
	let currentFile: AppwriteDocument | null = null;
	let isSidebarOpen = false;
	let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	let isSaving = false;
	let isHelpModalOpen = false;
	let isProfileMenuOpen = false;
	let isShareModalOpen = false;
	let files: AppwriteDocument[] = [];
	let loading = true;
	let error: string | null = null;

	export const shareLink = writable("");
	export const documentId = writable('');

	function generateShareLink(docId: string): string {
		const baseUrl = getBaseURL();
		return `${baseUrl}/share/${docId}`;
	}

	const handleShareClick = async () => {
		const docId = get(documentId);
		if (!docId || !currentFile) {
			errorMessage = 'No document selected to share';
			return;
		}
		
		isShareModalOpen = true;
	};

	const saveCurrentFile = async (force = false) => {
		if (!currentFile || !$auth.user) return;
		
		if (!force && !hasUnsavedChanges) return;
		
		const fileToUpdate = currentFile;
		
		try {
			isSaving = true;
			
			const updatedFile = await databaseService.updateFile(
				fileToUpdate.$id,
				content,
				fileToUpdate.title
			) as AppwriteDocument;
			
			currentFile = updatedFile;
			hasUnsavedChanges = false;
			errorMessage = null;
			
			loadFiles().catch(error => {
				console.error('Error syncing files:', error);
			});
			
		} catch (error) {
			console.error('Error saving file:', error);
			errorMessage = 'Failed to save file';
			loadFiles();
		} finally {
			setTimeout(() => {
				isSaving = false;
			}, 1000);
		}
	};

	const createNewFile = async () => {
		if (!$auth.user) return;
		
		try {
			if (hasUnsavedChanges && currentFile) {
				await saveCurrentFile(true);
			}

			const newFile = await databaseService.saveFile('Untitled', '', $auth.user.$id) as AppwriteDocument;
			currentFile = newFile;
			content = '';
			$documentId = newFile.$id;
			shareLink.set(generateShareLink(newFile.$id));
			hasUnsavedChanges = false;
			await loadFiles();
		} catch (error) {
			console.error('Error creating new file:', error);
			errorMessage = 'Failed to create new file';
		}
	};

	async function loadFiles() {
		if (!$auth.user) return;
		
		try {
			loading = true;
			const fetchedFiles = await databaseService.getAllFiles($auth.user.$id) as AppwriteDocument[];
			files = fetchedFiles.sort((a, b) => 
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
			);
			
			const mostRecentFile = files[0];
			if (mostRecentFile && !currentFile) {
				await loadFile(mostRecentFile);
			}
			
		} catch (err) {
			error = 'Failed to load files';
			console.error('Error loading files:', err);
		} finally {
			loading = false;
		}
	}

	let currentCollaboration: { 
		saveContent: (content: string) => Promise<void>;
		cleanup: () => void;
		getContent: () => string;
	} | null = null;

	const loadFile = async (file: AppwriteDocument) => {
		try {
			if (hasUnsavedChanges && currentFile) {
				await saveCurrentFile(true);
			}

			if (currentCollaboration) {
				if (content !== currentCollaboration.getContent()) {
					await currentCollaboration.saveContent(content);
				}
				currentCollaboration.cleanup();
				currentCollaboration = null;
			}
			
			currentFile = file;
			$documentId = file.$id;
			shareLink.set(generateShareLink(file.$id));
			
			if ($auth.user) {
				currentCollaboration = await initializeCollaboration({
					documentId: file.$id,
					userId: $auth.user.$id,
					userName: $auth.user.name || 'Anonymous',
					initialContent: file.content,
					onContentChange: (newContent) => {
						try {
							const message = JSON.parse(newContent);
							if (message.type === 'collaborator_removed') {
								if (message.removedId === $auth.user?.$id) {
									window.location.reload();
									return;
								}
							}
						} catch {
						if (newContent !== content) {
							content = newContent;
								hasUnsavedChanges = true;
						}
						}
					}
				});
				
				content = currentCollaboration.getContent();
			} else {
				content = file.content;
			}
			
			hasUnsavedChanges = false;
			errorMessage = null;
		} catch (error) {
			console.error('Error loading file:', error);
			errorMessage = 'Failed to load file';
		}
	};

	const handleLogout = async () => {
		try {
			await authService.deleteSession();
		} catch (error) {
			console.error('Error logging out:', error);
		}
	};

	interface AppwriteDocument extends SharedDocument {
		$id: string;
	}

	$: if (browser) {
		localStorage.setItem('sidebarOpen', isSidebarOpen.toString());
	}

	$: if (content && currentFile && currentCollaboration) {
		if (autoSaveTimeout) {
			clearTimeout(autoSaveTimeout);
		}
		hasUnsavedChanges = true;

		currentCollaboration.saveContent(content).catch(error => {
			console.error('Error saving content through collaboration:', error);
			errorMessage = 'Failed to save changes';
		});
	}

	let html: string = "";

	$: {
		processMarkdown(content ? content : gettingStarted.trim()).then(
			(result) => {
				html = result.html;
			},
		);
	}

	const aiService = new AIService();

	let formatPreview: FormatPreview | null = null;
	let isFormatPreviewOpen = false;

	const aiFormat = async () => {
		console.log("AI Format clicked");
		try {
			const result = await aiService.previewFormat(content);
			if (result.error) {
				errorMessage = result.error;
				return;
			}
			if (result.preview) {
				formatPreview = result.preview;
				isFormatPreviewOpen = true;
			}
		} catch (error) {
			errorMessage = `AI formatting failed: ${error}`;
		}
	};

	const handleAcceptFormat = async () => {
		if (!formatPreview) return;
		content = formatPreview.formatted;
		hasUnsavedChanges = true;
		isFormatPreviewOpen = false;
		formatPreview = null;
	};

	const handleRejectFormat = () => {
		isFormatPreviewOpen = false;
		formatPreview = null;
	};

	const grammarCheck = async () => {
		// TODO: Implement grammar checking
		console.log("Grammar check clicked");
	};

	onMount(() => {
		if (browser) {
			isSidebarOpen = localStorage.getItem('sidebarOpen') !== 'false';
		}

		const saved = localStorage.getItem("preferences");
		if (saved) {
			preferences = JSON.parse(saved);
		} else {
			savePreferences();
		}

		(async () => {
			await import("drab/define");
			await authService.checkSession();
			
			const urlParams = new URLSearchParams(window.location.search);
			const sharedDocId = urlParams.get('doc');
			
			await loadFiles();

			if (sharedDocId) {
				try {
					const doc = await databaseService.getDocument(sharedDocId) as AppwriteDocument;
					await loadFile(doc);
					window.history.replaceState({}, '', '/');
		} catch (error) {
					console.error('Error loading shared document:', error);
					errorMessage = 'Failed to load shared document';
				}
			}
		})();

		const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges && currentFile) {
				e.preventDefault();
				e.returnValue = '';
				await saveCurrentFile(true);
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			if (autoSaveTimeout) {
				clearTimeout(autoSaveTimeout);
			}
			if (currentCollaboration) {
				currentCollaboration.cleanup();
			}
		};
	});

	onDestroy(() => {
			if (currentCollaboration) {
			currentCollaboration.cleanup();
		}
	});

	afterUpdate(async () => {
		codeEval();
	});

	const fmt = async () => {
		content = await formatMd(content);
	};
</script>

<svelte:document />

<svelte:window on:keyup={onKeyUp} on:keydown={onKeyDown} />

{#if $auth.isLoading}
	<div class="flex h-screen items-center justify-center bg-gray-950 text-gray-50">
		<div class="text-center">
			<div class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
			<p>Loading...</p>
		</div>
	</div>
{:else if !$auth.isAuthenticated && !$auth.isLocal}
	<Auth />
{:else}
	<FilesSidebar
		isOpen={isSidebarOpen}
		currentFileId={currentFile?.$id}
		onFileSelect={loadFile}
		{files}
		{loading}
		{error}
	/>

	<HelpModal 
		isOpen={isHelpModalOpen}
		onClose={() => isHelpModalOpen = false}
	/>

	<ShareModal 
		isOpen={isShareModalOpen} 
		{currentFile}
		onClose={() => isShareModalOpen = false}
	/>

	<FormatPreviewModal
		isOpen={isFormatPreviewOpen}
		preview={formatPreview}
		onAccept={handleAcceptFormat}
		onReject={handleRejectFormat}
	/>

	<div class="flex flex-col h-screen {isSidebarOpen ? 'pl-64' : ''} transition-all duration-200 bg-gray-950 text-gray-50">
		<Header
			{isSidebarOpen}
			{currentFile}
			{content}
			{html}
			{isSaving}
			{errorMessage}
			{supported}
			{isHelpModalOpen}
			{isProfileMenuOpen}
			onToggleSidebar={() => isSidebarOpen = !isSidebarOpen}
			onCreateNewFile={createNewFile}
			onSaveCurrentFile={() => saveCurrentFile(true)}
			onOpen={open}
			onSaveAs={saveAs}
			onFormat={fmt}
			onAIFormat={aiFormat}
			onGrammarCheck={grammarCheck}
			onShare={handleShareClick}
			onLogout={handleLogout}
			onClearError={clearError}
		/>

		<main 
			class="flex-1 pt-16 flex"
			role="application"
			aria-label="Markdown Editor"
			on:drop={dropFile}
			on:dragover|preventDefault
		>
			<TextEditor 
				bind:content
				bind:preferences
				bind:viewMode
				on:focusMode={({ detail }) => {
					if (detail.focusMode) {
						isSidebarOpen = false;
					}
				}}
			/>

			<PreviewPane 
				{content}
				{html}
				bind:viewMode
				bind:currentSlide
				bind:preferences
			/>
		</main>
		</div>
{/if}

<style>
	:global(.files-sidebar) {
		background-color: rgb(17 24 39);
		border-right: 1px solid rgb(55 65 81);
	}

	:global(.files-sidebar .sidebar-header) {
		background-color: rgb(17 24 39);
		border-bottom: 1px solid rgb(55 65 81);
	}

	:global(.files-sidebar .file-item) {
		color: rgb(209 213 219);
	}

	:global(.files-sidebar .file-item:hover) {
		color: white;
		background-color: rgb(55 65 81);
	}

	:global(.files-sidebar .file-item.active) {
		background-color: rgb(55 65 81);
		color: white;
	}

	:global(drab-editor) {
		display: none !important;
	}
</style>

<svelte:body 
	on:click={e => {
		const target = e.target;
		if (!(target instanceof Element) || !target.closest('.relative')) {
			isProfileMenuOpen = false;
		}
	}}
	class:dropdown-open={isProfileMenuOpen}
/>
