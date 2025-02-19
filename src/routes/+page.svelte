<script lang="ts">
	import "../app.postcss";

	import { dev, browser } from "$app/environment";
	import { afterUpdate, onMount, onDestroy } from "svelte";
	import { convertDocumentToMarkdown } from '$lib/utilities/convertDocument';

	import { processMarkdown } from "robino/util/md";

	import { inject } from "@vercel/analytics";

	import gettingStarted from "$lib/gettingStarted.md?raw";

	import Metrics from "$lib/components/Metrics.svelte";
	import PrintButton from "$lib/components/PrintButton.svelte";
	import Slides from "$lib/components/Slides.svelte";

	import { codeEval } from "$lib/utilities/codeEval";
	import { formatMd } from "$lib/utilities/formatMd";

	// svg
	import Bullet from "$lib/components/svg/Bullet.svelte";
	import Blockquote from "$lib/components/svg/Blockquote.svelte";
	import Anchor from "$lib/components/svg/Anchor.svelte";
	import Image from "$lib/components/svg/Image.svelte";
	import Table from "$lib/components/svg/Table.svelte";
	import Code from "$lib/components/svg/Code.svelte";
	import View from "$lib/components/svg/View.svelte";
	import Edit from "$lib/components/svg/Edit.svelte";
	import Document from "$lib/components/svg/Document.svelte";
	import Slideshow from "$lib/components/svg/Slideshow.svelte";
	import ZoomOut from "$lib/components/svg/ZoomOut.svelte";
	import ZoomIn from "$lib/components/svg/ZoomIn.svelte";
	import Open from "$lib/components/svg/Open.svelte";
	import Save from "$lib/components/svg/Save.svelte";
	import Copy from "$lib/components/svg/Copy.svelte";
	import CopyComplete from "$lib/components/svg/CopyComplete.svelte";
	import CodeBracket from "$lib/components/svg/CodeBracket.svelte";
	import Focus from "$lib/components/svg/Focus.svelte";
	import Share from '$lib/components/svg/Share.svelte';

	import { auth } from '$lib/stores/auth';
	import { authService } from '$lib/services/appwrite';
	import { databaseService } from '$lib/services/database';
	import type { SharedDocument, CollaboratorProfile } from '$lib/services/database';
	import { initializeCollaboration } from '$lib/services/collaboration';

	import { getBaseURL } from '$lib/utilities/url';
	import { writable, get } from 'svelte/store';

	import Auth from '$lib/components/Auth.svelte';
	import FilesSidebar from '$lib/components/FilesSidebar.svelte';
	import Files from '$lib/components/svg/Files.svelte';

	inject({ mode: dev ? "development" : "production" });

	/** raw text that the user enters into the `textarea` element */
	let content = "";

	/** Store previous content states for undo functionality */
	interface ContentState {
		content: string;
		selectionStart: number;
		selectionEnd: number;
		isFormatting: boolean;
	}
	
	let contentHistory: ContentState[] = [];
	let historyIndex = -1;

	/** Store content state before formatting */
	const saveContentState = (isFormatting = false) => {
		// Remove future states if we're in the middle of the history
		if (historyIndex >= 0 && historyIndex < contentHistory.length - 1) {
			contentHistory = contentHistory.slice(0, historyIndex + 1);
		}
		contentHistory.push({
			content,
			selectionStart: textArea.selectionStart,
			selectionEnd: textArea.selectionEnd,
			isFormatting
		});
		historyIndex = contentHistory.length - 1;
	};

	/** Restore previous content state */
	const undo = () => {
		if (historyIndex > 0) {
			const currentState = contentHistory[historyIndex];
			const previousState = contentHistory[historyIndex - 1];

			if (!currentState || !previousState) return;

			if (currentState.isFormatting) {
				// For formatting operations, only restore the affected text range
				const beforeText = content.substring(0, previousState.selectionStart);
				const afterText = content.substring(previousState.selectionEnd);
				const restoredText = previousState.content.substring(
					previousState.selectionStart,
					previousState.selectionEnd
				);
				content = beforeText + restoredText + afterText;
				
				// Restore cursor position
				textArea.value = content;
				textArea.setSelectionRange(
					previousState.selectionStart,
					previousState.selectionEnd
				);
			} else {
				// For regular edits, restore the entire content
				content = previousState.content;
				textArea.value = content;
				textArea.setSelectionRange(
					previousState.selectionStart,
					previousState.selectionEnd
				);
			}
			historyIndex--;
		}
	};

	/** Redo content state */
	const redo = () => {
		if (historyIndex < contentHistory.length - 1) {
			const nextState = contentHistory[historyIndex + 1];
			
			if (!nextState) return;
			
			if (nextState.isFormatting) {
				// For formatting operations, only restore the affected text range
				const beforeText = content.substring(0, nextState.selectionStart);
				const afterText = content.substring(nextState.selectionEnd);
				const restoredText = nextState.content.substring(
					nextState.selectionStart,
					nextState.selectionEnd
				);
				content = beforeText + restoredText + afterText;
			} else {
				// For regular edits, restore the entire content
				content = nextState.content;
			}
			
			textArea.value = content;
			textArea.setSelectionRange(
				nextState.selectionStart,
				nextState.selectionEnd
			);
			historyIndex++;
		}
	};

	/** controls the expansion of the preview area */
	let viewMode = false;

	let textArea: HTMLTextAreaElement;

	let currentSlide: number;

	let file: File | null;
	let fileHandle: FileSystemFileHandle | null;
	let errorMessage: string | null = null;

	/** `true` if the browser supports the `window.showOpenFilePicker` method */
	let supported = false;
	if (browser) supported = Boolean(window.showOpenFilePicker);

	const fontSizes = [
		"prose-sm",
		"prose-base",
		"prose-lg",
		"prose-xl",
		"prose-2xl",
	];

	const fontFamilies = [
		"font-sans",
		"font-sans-rounded",
		"font-serif",
		"font-antique",
		"font-mono",
	];

	const colors = {
		prose: ["", "prose-teal", "prose-sky", "prose-rose"],
		medium: ["bg-gray-500", "bg-teal-500", "bg-sky-500", "bg-rose-500"],
		dark: ["bg-gray-900", "bg-teal-950", "bg-sky-950", "bg-red-950"],
	};

	const viewTypes = ["document", "slideshow"] as const;

	interface Preferences {
		fontSize: number;
		fontFamily: number;
		color: number;
		viewType: (typeof viewTypes)[number];
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

	const options: FilePickerOptions = {
		types: [
			{
				description: "markdown and documents",
				accept: {
					"text/markdown": [".md", ".mdx", ".mdoc", ".markdoc", ".svx"],
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
					"application/pdf": [".pdf"],
					"text/plain": [".txt"]
				},
			},
		],
		excludeAcceptAllOption: true,
	};

	const saveOptions: FilePickerOptions = {
		types: [
			{
				description: "markdown",
				accept: {
					"text/markdown": [".md"]
				},
			},
		],
		excludeAcceptAllOption: true,
	};

	const open = async () => {
		try {
			[fileHandle] = await window.showOpenFilePicker(options);
			file = await fileHandle.getFile();
			
			// Handle document conversion for supported file types
			if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
				file.type === "text/plain" ||
				file.type === "application/pdf") {
				content = await convertDocumentToMarkdown(file);
				// Clear fileHandle since we're working with converted content
				fileHandle = null;
			} else {
				content = await file.text();
			}
			errorMessage = null;
		} catch (error) {
			console.error("Error during file open/conversion:", error);
			errorMessage = `Error converting file: ${error}`;
		}
	};

	const saveAs = async () => {
		try {
			const handle = await window.showSaveFilePicker(saveOptions);
			const writable = await handle.createWritable();
			await writable.write(content);
			await writable.close();
			file = await handle.getFile();
			fileHandle = handle;
		} catch (error) {
			console.error("Error saving file:", error);
			errorMessage = `Error saving file: ${error}`;
		}
	};

	const save = async () => {
		if (fileHandle && !viewMode) {
			try {
				const writable = await fileHandle.createWritable();
				await writable.write(content);
				await writable.close();
			} catch (error) {
				console.error("Error saving file:", error);
				errorMessage = `Error saving file: ${error}`;
				// If save fails, prompt for save as
				await saveAs();
			}
		} else {
			// If no fileHandle, do save as
			await saveAs();
		}
	};

	const dropFile = async (e: DragEvent) => {
		const items = e.dataTransfer?.items;
		if (items && items[0]) {
			const item = items[0];
			if (item.kind === "file") {
				// @ts-ignore - not supported by all browsers
				if (item.getAsFileSystemHandle) {
					e.preventDefault();
					try {
						const handle = await item.getAsFileSystemHandle();
						// since `item.kind === "file"` it will be a `FileSystemFileHandle`
						fileHandle = handle as FileSystemFileHandle;
						file = await fileHandle.getFile();
						
						// Handle document conversion for supported file types
						if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
							file.type === "text/plain" ||
							file.type === "application/pdf") {
							content = await convertDocumentToMarkdown(file);
						} else {
							content = await file.text();
						}
						errorMessage = null;
					} catch (error) {
						console.error("Error during file drop/conversion:", error);
						errorMessage = `Error converting file: ${error}`;
					}
				}
			}
		}
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

	const changeViewType = (type: typeof preferences.viewType) => {
		preferences.viewType = type;
		savePreferences();
	};

	const changeProseSize = (action: "increase" | "decrease") => {
		if (action === "increase") {
			if (preferences.fontSize < fontSizes.length - 1) preferences.fontSize++;
		} else {
			if (preferences.fontSize > 0) preferences.fontSize--;
		}
		savePreferences();
	};

	const changeColor = () => {
		if (preferences.color < colors.prose.length - 1) {
			preferences.color++;
		} else {
			preferences.color = 0;
		}
		savePreferences();
	};

	const changeFontFamily = () => {
		if (preferences.fontFamily < fontFamilies.length - 1) {
			preferences.fontFamily++;
		} else {
			preferences.fontFamily = 0;
		}
		savePreferences();
	};

	const toggleFocusMode = () => {
		preferences.focusMode = !preferences.focusMode;
		// Close sidebar when entering focus mode
		if (preferences.focusMode && isSidebarOpen) {
			isSidebarOpen = false;
		}
		savePreferences();
	};

	const onKeyUp = (e: KeyboardEvent) => {
		// Only save if Ctrl/Cmd + S is pressed
		if ((e.ctrlKey || e.metaKey) && e.key === "s") {
			e.preventDefault();
			save();
		}
		
		if (e.key === "i") {
			textArea.focus();
		}
		if (e.key === "Escape") {
			toggleView();
		} else {
			findCurrentSlide();
		}
	};

	const fmt = async () => {
		const sel = textArea.selectionStart;
		content = await formatMd(content);
		textArea.setSelectionRange(sel, sel);
	};

	const onKeyDown = (e: KeyboardEvent) => {
		// Format shortcuts
		if (e.ctrlKey || e.metaKey) {
			switch (e.key.toLowerCase()) {
				case 'z':
					e.preventDefault();
					if (e.shiftKey) {
						redo(); // Ctrl/Cmd + Shift + Z for Redo
					} else {
						undo(); // Ctrl/Cmd + Z for Undo
					}
					break;
				case 's':
					e.preventDefault();
					saveContentState(); // Save state before saving file
					if (e.shiftKey) {
						saveAs(); // Ctrl/Cmd + Shift + S for Save As
					} else {
						save(); // Ctrl/Cmd + S for Save
					}
					break;
				case 'b':
					e.preventDefault();
					saveContentState(true); // Save state before formatting
					if (textArea.selectionStart === textArea.selectionEnd) {
						// No selection - insert markdown and place cursor between
						const pos = textArea.selectionStart;
						textArea.setRangeText('****', pos, pos, 'end');
						textArea.setSelectionRange(pos + 2, pos + 2);
					} else {
						// Check if text is already bold
						const text = textArea.value.substring(textArea.selectionStart, textArea.selectionEnd);
						if (text.startsWith('**') && text.endsWith('**')) {
							// Remove bold formatting
							const unformattedText = text.slice(2, -2);
							textArea.setRangeText(unformattedText, textArea.selectionStart, textArea.selectionEnd, 'end');
						} else {
							// Add bold formatting
							textArea.setRangeText(`**${text}**`, textArea.selectionStart, textArea.selectionEnd, 'end');
						}
					}
					break;
				case 'i':
					e.preventDefault();
					saveContentState(true); // Save state before formatting
					if (textArea.selectionStart === textArea.selectionEnd) {
						// No selection - insert markdown and place cursor between
						const pos = textArea.selectionStart;
						textArea.setRangeText('**', pos, pos, 'end');
						textArea.setSelectionRange(pos + 1, pos + 1);
					} else {
						// Check if text is already italic
						const text = textArea.value.substring(textArea.selectionStart, textArea.selectionEnd);
						if (text.startsWith('*') && text.endsWith('*') && !text.startsWith('**')) {
							// Remove italic formatting
							const unformattedText = text.slice(1, -1);
							textArea.setRangeText(unformattedText, textArea.selectionStart, textArea.selectionEnd, 'end');
						} else {
							// Add italic formatting
							textArea.setRangeText(`*${text}*`, textArea.selectionStart, textArea.selectionEnd, 'end');
						}
					}
					break;
				case 'u':
					e.preventDefault();
					saveContentState(true); // Save state before formatting
					if (textArea.selectionStart === textArea.selectionEnd) {
						// No selection - insert markdown and place cursor between
						const pos = textArea.selectionStart;
						textArea.setRangeText('<ins></ins>', pos, pos, 'end');
						textArea.setSelectionRange(pos + 5, pos + 5);
					} else {
						// Check if text is already underlined
						const text = textArea.value.substring(textArea.selectionStart, textArea.selectionEnd);
						if (text.startsWith('<ins>') && text.endsWith('</ins>')) {
							// Remove underline formatting
							const unformattedText = text.slice(5, -6);
							textArea.setRangeText(unformattedText, textArea.selectionStart, textArea.selectionEnd, 'end');
						} else {
							// Add underline formatting
							textArea.setRangeText(`<ins>${text}</ins>`, textArea.selectionStart, textArea.selectionEnd, 'end');
						}
					}
					break;
				case 'k':
					e.preventDefault();
					if (textArea.selectionStart === textArea.selectionEnd) {
						// No selection - insert template and place cursor at 'text'
						const pos = textArea.selectionStart;
						textArea.setRangeText('[text](url)', pos, pos, 'end');
						textArea.setSelectionRange(pos + 1, pos + 5); // Select 'text'
					} else {
						// Use selected text as link text
						const text = textArea.value.substring(textArea.selectionStart, textArea.selectionEnd);
						textArea.setRangeText(`[${text}](url)`, textArea.selectionStart, textArea.selectionEnd, 'end');
						// Position cursor at 'url'
						const endOfText = textArea.selectionEnd;
						textArea.setSelectionRange(endOfText + 2, endOfText + 5);
					}
					break;
				case 'm':
					e.preventDefault();
					toggleFocusMode();
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
			const s = content.slice(0, textArea.selectionStart);
			let curr = s.split("\n\n---\n").length - 1;
			if (s.startsWith("---\n")) curr++; // if first line === `---`, considered an <hr>
			currentSlide = curr;
		}
	};

	const clearError = () => {
		errorMessage = null;
	};

	let hasUnsavedChanges = false;

	const saveCurrentFile = async (force = false) => {
		if (!currentFile || !$auth.user) return;
		
		// If not forced and no unsaved changes, don't save
		if (!force && !hasUnsavedChanges) return;
		
		const fileToUpdate = currentFile;
		
		try {
			isSaving = true;
			
			// Save to server
			const updatedFile = await databaseService.updateFile(
				fileToUpdate.$id,
				content,
				fileToUpdate.title
			) as AppwriteDocument;
			
			currentFile = updatedFile;
			hasUnsavedChanges = false;
			errorMessage = null;
			
			// Quietly sync with server in background
			loadFiles().catch(error => {
				console.error('Error syncing files:', error);
			});
			
		} catch (error) {
			console.error('Error saving file:', error);
			errorMessage = 'Failed to save file';
			// Revert optimistic update on error
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
			// Save current file if there are unsaved changes
			if (hasUnsavedChanges && currentFile) {
				await saveCurrentFile(true);
			}

			const newFile = await databaseService.saveFile('Untitled', '', $auth.user.$id) as AppwriteDocument;
			currentFile = newFile;
			content = '';
			$documentId = newFile.$id;
			shareLink.set(generateShareLink(newFile.$id));
			hasUnsavedChanges = false;
			// Reset history when creating new file
			contentHistory = [];
			historyIndex = -1;
			// Trigger files reload
			await loadFiles();
		} catch (error) {
			console.error('Error creating new file:', error);
			errorMessage = 'Failed to create new file';
		}
	};

	let files: AppwriteDocument[] = [];
	let loading = true;
	let error: string | null = null;

	async function loadFiles() {
		if (!$auth.user) return;
		
		try {
			loading = true;
			const fetchedFiles = await databaseService.getAllFiles($auth.user.$id) as AppwriteDocument[];
			// Sort files by updatedAt in descending order (most recent first)
			files = fetchedFiles.sort((a, b) => 
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
			);
			
			// Load the most recently updated file if we have files and no current file loaded
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
			// Save current file if there are unsaved changes
			if (hasUnsavedChanges && currentFile) {
				await saveCurrentFile(true);
			}

			// Cleanup previous collaboration
			if (currentCollaboration) {
				// Save any pending changes before cleanup
				if (content !== currentCollaboration.getContent()) {
					await currentCollaboration.saveContent(content);
				}
				currentCollaboration.cleanup();
				currentCollaboration = null;
			}
			
			currentFile = file;
			$documentId = file.$id;
			shareLink.set(generateShareLink(file.$id));
			
			// Initialize collaboration when loading a file
			if ($auth.user) {
				currentCollaboration = await initializeCollaboration({
					documentId: file.$id,
					userId: $auth.user.$id,
					userName: $auth.user.name || 'Anonymous',
					initialContent: file.content,
					onContentChange: (newContent) => {
						try {
							// Check if this is a special message
							const message = JSON.parse(newContent);
							if (message.type === 'collaborator_removed') {
								if (message.removedId === $auth.user?.$id) {
									// If we're the removed collaborator, reload the page
									window.location.reload();
									return;
								}
							}
						} catch {
							// Not a JSON message, handle as normal content update
							if (newContent !== content) {
								content = newContent;
								hasUnsavedChanges = true;
							}
						}
					}
				});
				
				// Set content after collaboration is initialized
				content = currentCollaboration.getContent();
			} else {
				content = file.content;
			}
			
			hasUnsavedChanges = false;
			
			// Reset history when loading new file
			contentHistory = [];
			historyIndex = -1;
			errorMessage = null;
		} catch (error) {
			console.error('Error loading file:', error);
			errorMessage = 'Failed to load file';
		}
	};

	onMount(async () => {
		// Set initial sidebar state from localStorage
		if (browser) {
			isSidebarOpen = localStorage.getItem('sidebarOpen') !== 'false';
		}

		const saved = localStorage.getItem("preferences");
		if (saved) {
			preferences = JSON.parse(saved);
		} else {
			savePreferences();
		}

		await import("drab/define");
		
		// Check for existing session
		await authService.checkSession();
		
		// Check for shared document in URL
		const urlParams = new URLSearchParams(window.location.search);
		const sharedDocId = urlParams.get('doc');
		
		// Initial files load
		await loadFiles();

		// If there's a shared document ID, load it
		if (sharedDocId) {
			try {
				const doc = await databaseService.getDocument(sharedDocId) as AppwriteDocument;
				await loadFile(doc);
				// Clean up the URL
				window.history.replaceState({}, '', '/');
			} catch (error) {
				console.error('Error loading shared document:', error);
				errorMessage = 'Failed to load shared document';
			}
		}
	});

	onDestroy(() => {
		if (currentCollaboration) {
			currentCollaboration.cleanup();
		}
	});

	afterUpdate(async () => {
		codeEval();
	});

	let html: string = "";

	$: {
		processMarkdown(content ? content : gettingStarted.trim()).then(
			(result) => {
				html = result.html;
			},
		);
	}

	// Add logout function
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

	/** Current file being edited */
	let currentFile: AppwriteDocument | null = null;
	let isSidebarOpen = false;
	let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

	// Watch sidebar state changes and save to localStorage
	$: if (browser) {
		localStorage.setItem('sidebarOpen', isSidebarOpen.toString());
	}

	// Modify the auto-save reactive statement
	$: if (content && currentFile && currentCollaboration) {
		if (autoSaveTimeout) {
			clearTimeout(autoSaveTimeout);
		}
		hasUnsavedChanges = true;
		
		// Save content through collaboration
		currentCollaboration.saveContent(content).catch(error => {
			console.error('Error saving content through collaboration:', error);
			errorMessage = 'Failed to save changes';
		});
	}

	onMount(() => {
		const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges && currentFile) {
				// Show browser "unsaved changes" dialog
				e.preventDefault();
				e.returnValue = '';
				
				// Try to save
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

	let showTextStyleMenu = false;
	let showInsertMenu = false;

	let textStyleTooltip = false;
	let insertTooltip = false;

	let isSaving = false;

	let isProfileMenuOpen = false;
	let isHelpModalOpen = false;

	export const shareLink = writable("");
	export const documentId = writable('');

	function generateShareLink(docId: string): string {
		const baseUrl = getBaseURL();
		return `${baseUrl}/share/${docId}`;
	}

	let isShareModalOpen = false;

	let collaboratorProfiles: CollaboratorProfile[] = [];
	let isAddingCollaborator = false;
	let addCollaboratorSuccess: string | null = null;
	let removeCollaboratorSuccess: string | null = null;

	const loadCollaboratorProfiles = async () => {
		if (!currentFile) return;
		try {
			collaboratorProfiles = await databaseService.getCollaboratorProfiles(currentFile.collaborators);
		} catch (error) {
			console.error('Error loading collaborator profiles:', error);
			errorMessage = 'Failed to load collaborators';
		}
	};

	const handleShareClick = async () => {
		const docId = get(documentId);
		if (!docId || !currentFile) {
			errorMessage = 'No document selected to share';
			return;
		}
		
		// Load collaborator profiles before opening modal
		await loadCollaboratorProfiles();
		isShareModalOpen = true;
		// Blur the textarea when opening modal
		if (textArea) {
			textArea.blur();
		}
	};

	let newCollaboratorEmail = '';
	let addCollaboratorError: string | null = null;

	async function handleAddCollaborator() {
		if (!currentFile || !$auth.user) return;
		
		try {
			isAddingCollaborator = true;
			addCollaboratorError = null;
			addCollaboratorSuccess = null;
			
			// Use the databaseService to find the user by email
			const userProfile = await databaseService.findUserByEmail(newCollaboratorEmail);
			
			if (!userProfile) {
				throw new Error('User not found');
			}
			
			// Add the user as a collaborator
			await databaseService.addCollaborator(currentFile.$id, userProfile.userId);
			
			// Immediately refresh collaborator profiles
			await loadCollaboratorProfiles();
			
			// Update the current file to reflect the changes
			const updatedFile = await databaseService.getDocument(currentFile.$id) as AppwriteDocument;
			currentFile = updatedFile;
			
			// Clear the input and show success message
			newCollaboratorEmail = '';
			addCollaboratorSuccess = 'Collaborator added successfully';
			
			// Clear success message after 3 seconds
			setTimeout(() => {
				addCollaboratorSuccess = null;
			}, 3000);
			
		} catch (error) {
			console.error('Error adding collaborator:', error);
			addCollaboratorError = 'Failed to add collaborator. Make sure the email is correct and the user exists.';
		} finally {
			isAddingCollaborator = false;
		}
	}

	async function handleRemoveCollaborator(collaboratorId: string) {
		if (!currentFile || !$auth.user) return;
		
		if (!confirm('Are you sure you want to remove this collaborator?')) return;
		
		try {
			// Remove the collaborator
			await databaseService.removeCollaborator(currentFile.$id, collaboratorId);
			
			// Show success message
			removeCollaboratorSuccess = 'Collaborator removed successfully';
			
			// Immediately refresh collaborator profiles for the owner's modal
			await loadCollaboratorProfiles();
			
			// Update the current file to reflect the changes
			const updatedFile = await databaseService.getDocument(currentFile.$id) as AppwriteDocument;
			currentFile = updatedFile;
			
			// Clear success message after 3 seconds
			setTimeout(() => {
				removeCollaboratorSuccess = null;
			}, 3000);
			
			// If we have an active collaboration, send a special message to notify removed user
			if (currentCollaboration) {
				// Save any pending changes first
				if (content !== currentCollaboration.getContent()) {
					await currentCollaboration.saveContent(content);
				}
				
				// Force reload for the removed collaborator
				const message = {
					type: 'collaborator_removed',
					removedId: collaboratorId
				};
				
				await currentCollaboration.saveContent(JSON.stringify(message));
			}
		} catch (error) {
			console.error('Error removing collaborator:', error);
			errorMessage = 'Failed to remove collaborator';
		}
	}
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

	<div class="flex flex-col h-screen {isSidebarOpen ? 'pl-64' : ''} transition-all duration-200 bg-gray-950 text-gray-50">
		<header class="fixed top-0 left-0 right-0 z-50 bg-gray-950 border-b border-gray-700">
			<div class="flex items-center justify-between px-4 h-16">
				<div class="flex items-center space-x-2">
					<!-- Toggle Sidebar Button -->
					<button
						title="Toggle Files Sidebar (Ctrl/Cmd + \)"
						class="button"
						on:click={() => isSidebarOpen = !isSidebarOpen}
					>
						<Files />
					</button>

					<!-- New File Button -->
					<button
						title="New File"
						class="button"
						on:click={createNewFile}
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
								on:blur={() => saveCurrentFile(true)}
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

				<!-- Right side of header -->
				<div class="flex items-center space-x-4">
					<!-- Existing toolbar buttons -->
					<div class="flex items-center space-x-2">
						{#if supported}
							<button
								title="Open (or drag and drop)"
								class="button"
								on:click={open}
							>
								<Open />
								<span class="hidden lg:inline">Open</span>
							</button>
							<button title="Save As" class="button" on:click={saveAs}>
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
							on:click={handleShareClick}
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
						<button title="Format" on:click={fmt} class="button">
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
						</button>
						<button title="View" class="button lg:hidden" on:click={toggleView}>
							<View />
						</button>
					</div>

					<!-- User info and logout -->
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
								<!-- User Info -->
								<div class="px-4 py-2 border-b border-gray-700">
									<p class="text-sm font-medium text-gray-200">{$auth.user?.name}</p>
									<p class="text-xs text-gray-400">{$auth.user?.email}</p>
								</div>

								<!-- Help Button -->
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

								<!-- Sign Out Button -->
								<button
									class="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center border-t border-gray-700"
									on:click={handleLogout}
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

			<!-- Error message -->
			{#if errorMessage}
				<div class="bg-red-950 text-red-100 px-4 py-2 text-sm flex justify-between items-center">
					<span>{errorMessage}</span>
					<button 
						class="ml-4 text-red-100 hover:text-white focus:outline-none" 
						on:click={clearError}
						title="Dismiss"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			{/if}
		</header>

		<!-- Main content -->
		<main 
			class="flex-1 pt-16 flex"
			role="application"
			aria-label="Markdown Editor"
			on:drop={dropFile}
			on:dragover|preventDefault
		>
			<!-- Editor pane -->
			<div
				class="w-1/2 flex flex-col h-full border-r border-gray-700"
				class:hidden={viewMode}
			>
				<div class="h-full flex flex-col relative">
					<textarea
						bind:this={textArea}
						class="flex-1 resize-none appearance-none overflow-y-auto p-6 font-mono text-sm transition placeholder:text-gray-400 focus:outline-none text-gray-50 bg-gray-950"
						placeholder="# Title"
						bind:value={content}
					></textarea>

					<!-- Formatting toolbar -->
					<div class="flex flex-wrap p-3 border-t border-gray-700 bg-gray-900" class:hidden={preferences.focusMode}>
						<button
							data-trigger
							class="button"
							title="Heading (# )"
							data-value="# "
							data-type="block"
						>
							H
						</button>
						<button
							data-trigger
							class="button"
							title="Bullet (- )"
							data-value="- "
							data-type="block"
						>
							<Bullet />
						</button>
						<button
							data-trigger
							class="button"
							title="Blockquote (> )"
							data-value="> "
							data-type="block"
						>
							<Blockquote />
						</button>

						<!-- Text Style Dropdown -->
						<div class="relative">
							<button
								class="button"
								title="Text Style"
								on:click={() => {
									showTextStyleMenu = !showTextStyleMenu;
									showInsertMenu = false;
								}}
								on:mouseenter={() => textStyleTooltip = true}
								on:mouseleave={() => textStyleTooltip = false}
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
									<path d="M13.197 3.003h-2.396l-3.2 14h2.396l3.2-14zm-7.2 14h2.396l3.2-14H9.197l-3.2 14z"/>
								</svg>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
							</button>
							{#if textStyleTooltip && !showTextStyleMenu}
								<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-gray-100 text-sm rounded whitespace-nowrap">
									Text Formatting Options
									<div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-4 border-transparent border-t-gray-800"></div>
								</div>
							{/if}
							{#if showTextStyleMenu}
								<div class="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-lg shadow-lg z-50 py-1 min-w-[150px]">
									<button
										data-trigger
										class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
										title="Bold (Ctrl/Cmd + B)"
										data-value="**"
										data-type="wrap"
									>
										<span class="font-bold">B</span>
										<span class="ml-3 text-sm">Bold</span>
										<span class="ml-auto text-xs text-gray-400">⌘B</span>
									</button>
									<button
										data-trigger
										class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
										title="Italic (Ctrl/Cmd + I)"
										data-value="*"
										data-type="wrap"
									>
										<span class="italic">I</span>
										<span class="ml-3 text-sm">Italic</span>
										<span class="ml-auto text-xs text-gray-400">⌘I</span>
									</button>
									<button
										data-trigger
										class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
										title="Underline (Ctrl/Cmd + U)"
										data-value="<ins>"
										data-type="wrap"
										data-end-value="</ins>"
									>
										<span class="underline">U</span>
										<span class="ml-3 text-sm">Underline</span>
										<span class="ml-auto text-xs text-gray-400">⌘U</span>
									</button>
									<button
										data-trigger
										class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
										title="Strikethrough (~)"
										data-value="~"
										data-type="wrap"
									>
										<span class="line-through">S</span>
										<span class="ml-3 text-sm">Strikethrough</span>
										<span class="ml-auto text-xs text-gray-400">~</span>
									</button>
									<div class="absolute bottom-0 left-4 translate-y-full border-4 border-transparent border-t-gray-800"></div>
								</div>
							{/if}
						</div>

						<!-- Insert Menu Dropdown -->
						<div class="relative">
							<button
								class="button"
								title="Insert"
								on:click={() => {
									showInsertMenu = !showInsertMenu;
									showTextStyleMenu = false;
								}}
								on:mouseenter={() => insertTooltip = true}
								on:mouseleave={() => insertTooltip = false}
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10 3a1 1 0 00-1 1v4H5a1 1 0 100 2h4v4a1 1 0 102 0v-4h4a1 1 0 100-2h-4V4a1 1 0 00-1-1z" clip-rule="evenodd" />
								</svg>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
							</button>
							{#if insertTooltip && !showInsertMenu}
								<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-gray-100 text-sm rounded whitespace-nowrap">
									Insert Content
									<div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-4 border-transparent border-t-gray-800"></div>
								</div>
							{/if}
							{#if showInsertMenu}
								<div class="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-lg shadow-lg z-50 py-1 min-w-[150px]">
									<button
										data-trigger
										class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
										title="Link (Ctrl/Cmd + K)"
										data-value="[text](href)"
										data-type="inline"
										data-key="["
									>
										<Anchor />
										<span class="ml-3 text-sm">Link</span>
										<span class="ml-auto text-xs text-gray-400">⌘K</span>
									</button>
									<button
										data-trigger
										class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
										title="Image"
										data-value="![alt](src)"
										data-type="inline"
										data-key="]"
									>
										<Image />
										<span class="ml-3 text-sm">Image</span>
									</button>
									<button
										data-trigger
										class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
										title="Table"
										data-value={"| th  | th  |\n| --- | --- |\n| td  | td  |\n| td  | td  |"}
										data-type="inline"
										data-key={"\\"}
									>
										<Table />
										<span class="ml-3 text-sm">Table</span>
									</button>
									<button
										data-trigger
										class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
										title="Code"
										data-value={"`"}
										data-type="wrap"
									>
										<CodeBracket />
										<span class="ml-3 text-sm">Code</span>
									</button>
									<button
										data-trigger
										class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
										title="Slide"
										data-value="---"
										data-type="inline"
									>
										<Slideshow />
										<span class="ml-3 text-sm">Slide</span>
									</button>
									<div class="absolute bottom-0 left-4 translate-y-full border-4 border-transparent border-t-gray-800"></div>
								</div>
							{/if}
						</div>

						<button
							class="button"
							title="Toggle Focus Mode (Ctrl/Cmd + M)"
							on:click={toggleFocusMode}
						>
							<Focus />
						</button>
					</div>
				</div>
			</div>

			<!-- Preview pane -->
			<div
				style="view-transition-name: preview;"
				class="w-1/2 flex flex-col {viewMode ? 'w-full' : ''}"
			>
				<div class="flex-1 overflow-y-auto bg-gray-950">
					<div
						class="prose prose-gray mx-auto h-full max-w-[72ch] break-words p-8 transition-[font-size] dark:prose-invert prose-img:rounded-lg {fontSizes[preferences.fontSize]} {colors.prose[preferences.color]} {fontFamilies[preferences.fontFamily]}"
					>
						{#if preferences.viewType === "document"}
							{@html html}
						{:else if preferences.viewType === "slideshow"}
							<Slides bind:viewMode bind:currentSlide {html} />
						{/if}
					</div>
				</div>
				<!-- Preview controls -->
				<div
					class="flex justify-between p-3 border-t border-gray-700 bg-gray-900"
				>
					<!-- viewType controls -->
					<div class="flex">
						{#each viewTypes as type}
							<button
								class="button group-hover:opacity-100"
								class:opacity-0={viewMode}
								disabled={preferences.viewType === type}
								on:click={() => changeViewType(type)}
								title={type}
							>
								{#if type === "document"}
									<Document />
								{:else if type === "slideshow"}
									<Slideshow />
								{/if}
							</button>
						{/each}
						<div
							class="transition group-hover:opacity-100"
							class:opacity-0={viewMode}
						>
							<Metrics {content} />
						</div>
					</div>
					<div class="flex">
						<button
							title="Change Color"
							class="button group-hover:opacity-100"
							class:opacity-0={viewMode}
							on:click={changeColor}
						>
							<div
								class="h-5 w-5 rounded-full border-2 border-gray-50 {colors.medium[preferences.color]}"
								class:border-gray-950={viewMode}
								class:dark:border-gray-50={viewMode}
							/>
						</button>
						<button
							title="Change Font"
							class="button group-hover:opacity-100 {fontFamilies[preferences.fontFamily]}"
							class:opacity-0={viewMode}
							on:click={changeFontFamily}
							aria-label={preferences.fontFamily ? "sans-serif" : "serif"}
						>
							F
						</button>
						<button
							title="Decrease Font Size"
							class="button group-hover:opacity-100"
							class:opacity-0={viewMode}
							disabled={preferences.fontSize < 1}
							on:click={() => changeProseSize("decrease")}
						>
							<ZoomOut />
						</button>
						<button
							title="Increase Font Size"
							class="button group-hover:opacity-100"
							class:opacity-0={viewMode}
							disabled={preferences.fontSize >= fontSizes.length - 1}
							on:click={() => changeProseSize("increase")}
						>
							<ZoomIn />
						</button>

						<drab-fullscreen class="contents">
							<button
								data-trigger
								title="Toggle Fullscreen"
								class="button group-hover:opacity-100"
								class:opacity-0={viewMode}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="currentColor"
									class="h-5 w-5"
								>
									<path
										fill-rule="evenodd"
										d="M15 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V5.56l-3.97 3.97a.75.75 0 1 1-1.06-1.06l3.97-3.97h-2.69a.75.75 0 0 1-.75-.75Zm-12 0A.75.75 0 0 1 3.75 3h4.5a.75.75 0 0 1 0 1.5H5.56l3.97 3.97a.75.75 0 0 1-1.06 1.06L4.5 5.56v2.69a.75.75 0 0 1-1.5 0v-4.5Zm11.47 11.78a.75.75 0 1 1 1.06-1.06l3.97 3.97v-2.69a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h2.69l-3.97-3.97Zm-4.94-1.06a.75.75 0 0 1 0 1.06L5.56 19.5h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0Z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
						</drab-fullscreen>

						<!-- viewMode toggle -->
						<button
							title={viewMode ? "Edit" : "View"}
							class="button"
							on:click={toggleView}
						>
							{#if viewMode}
								<Edit />
							{:else}
								<View />
							{/if}
						</button>
					</div>
				</div>
			</div>
		</main>
	</div>

	<!-- Add Help Modal -->
	{#if isHelpModalOpen}
		<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
			<div class="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
				<div class="flex justify-between items-center p-4 border-b border-gray-700">
					<h2 class="text-lg font-semibold text-gray-100">Keyboard Shortcuts</h2>
					<button 
						class="text-gray-400 hover:text-gray-200"
						on:click={() => isHelpModalOpen = false}
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

	<!-- Add this before the closing body tag -->
	{#if isShareModalOpen && currentFile}
		<div 
			class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="share-modal-title"
		>
			<div 
				class="bg-gray-800 rounded-lg max-w-2xl w-full"
				role="document"
			>
				<div class="flex justify-between items-center p-4 border-b border-gray-700">
					<h2 id="share-modal-title" class="text-lg font-semibold text-gray-100">Share Document</h2>
					<button 
						class="text-gray-400 hover:text-gray-200"
						on:click={() => isShareModalOpen = false}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div class="p-4">
					<!-- Add Collaborator Form -->
					<div class="mb-6">
						<label for="collaborator-email" class="block text-sm font-medium text-gray-300 mb-2">Add People</label>
						<div class="flex space-x-2">
							<input 
								id="collaborator-email"
								type="email" 
								placeholder="Enter email address"
								bind:value={newCollaboratorEmail}
								class="flex-1 bg-gray-700 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
								on:keydown|stopPropagation
								on:keyup|stopPropagation
								on:keypress|stopPropagation
							/>
							<button
								class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
								on:click={handleAddCollaborator}
								disabled={!newCollaboratorEmail || isAddingCollaborator}
							>
								{#if isAddingCollaborator}
									<svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
								{/if}
								Add
							</button>
						</div>
						{#if addCollaboratorError}
							<p class="mt-2 text-sm text-red-400">{addCollaboratorError}</p>
						{/if}
						{#if addCollaboratorSuccess}
							<p class="mt-2 text-sm text-green-400 transition-opacity duration-300">{addCollaboratorSuccess}</p>
						{/if}
					</div>

					<!-- Collaborators -->
					<div>
						<div class="flex justify-between items-center mb-2">
							<h3 class="text-sm font-medium text-gray-300">People with access</h3>
							{#if currentFile?.ownerId === $auth.user?.$id}
								<button 
									class="text-sm text-blue-400 hover:text-blue-300"
									on:click={() => {
										// TODO: Add invite functionality
									}}
								>
									+ Add people
								</button>
							{/if}
						</div>
						
						<!-- Owner -->
						<div class="space-y-2">
							<div class="flex items-center justify-between p-2 bg-gray-700 rounded-lg">
								<div class="flex items-center space-x-3">
									<div class="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
										<span class="text-white font-medium">
											{currentFile.ownerId === $auth.user?.$id ? 
												$auth.user.name?.charAt(0).toUpperCase() : 'O'}
										</span>
									</div>
									<div>
										<p class="text-gray-200 font-medium">
											{currentFile.ownerId === $auth.user?.$id ? 
												$auth.user.name : 'Owner'}
										</p>
										<p class="text-sm text-gray-400">Owner</p>
									</div>
								</div>
								{#if currentFile.ownerId === $auth.user?.$id}
									<span class="px-2 py-1 bg-gray-600 text-gray-300 text-sm rounded-lg">You</span>
								{/if}
							</div>

							<!-- Collaborators -->
							{#if currentFile && collaboratorProfiles}
								{#each collaboratorProfiles.filter(profile => profile.id !== currentFile?.ownerId) as profile}
									<div class="flex items-center justify-between p-2 bg-gray-700 rounded-lg">
										<div class="flex items-center space-x-3">
											<div class="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
												<span class="text-white font-medium">{profile.name.charAt(0).toUpperCase()}</span>
											</div>
											<div>
												<p class="text-gray-200 font-medium">{profile.name}</p>
												<p class="text-sm text-gray-400">{profile.email}</p>
											</div>
										</div>
										<div class="flex items-center space-x-2">
											{#if profile.id === $auth.user?.$id}
												<span class="px-2 py-1 bg-gray-600 text-gray-300 text-sm rounded-lg">You</span>
											{/if}
											{#if currentFile?.ownerId === $auth.user?.$id && profile.id !== $auth.user?.$id}
												<button
													class="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
													on:click={() => handleRemoveCollaborator(profile.id)}
													title="Remove collaborator"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
														<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
													</svg>
												</button>
											{/if}
										</div>
									</div>
								{/each}
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Add success message for remove action -->
	{#if removeCollaboratorSuccess}
		<div class="fixed bottom-4 right-4 bg-green-900 text-green-100 px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300">
			{removeCollaboratorSuccess}
		</div>
	{/if}
{/if}

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

	:global(drab-editor) {
		display: none !important;
	}

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

	textarea {
		flex: 1;
		min-height: 0;
	}

	/* Click outside to close dropdowns */
	:global(body) {
		position: relative;
	}

	:global(body::before) {
		content: '';
		position: fixed;
		inset: 0;
		z-index: 40;
		display: none;
	}

	:global(body.dropdown-open::before) {
		display: block;
	}
</style>

<svelte:body 
	on:click={e => {
		const target = e.target;
		if (!(target instanceof Element) || !target.closest('.relative')) {
			showTextStyleMenu = false;
			showInsertMenu = false;
			isProfileMenuOpen = false;
		}
	}}
	class:dropdown-open={showTextStyleMenu || showInsertMenu || isProfileMenuOpen}
/>
