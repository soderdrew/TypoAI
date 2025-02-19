<script lang="ts">
	import { onMount, createEventDispatcher } from "svelte";
	
	// svg imports
	import Bullet from "$lib/components/svg/Bullet.svelte";
	import Blockquote from "$lib/components/svg/Blockquote.svelte";
	import Anchor from "$lib/components/svg/Anchor.svelte";
	import Image from "$lib/components/svg/Image.svelte";
	import Table from "$lib/components/svg/Table.svelte";
	import CodeBracket from "$lib/components/svg/CodeBracket.svelte";
	import Focus from "$lib/components/svg/Focus.svelte";
	import Slideshow from "$lib/components/svg/Slideshow.svelte";

	export let content: string;
	export let preferences: { focusMode: boolean };
	export let viewMode: boolean;

	const dispatch = createEventDispatcher();

	/** Store previous content states for undo functionality */
	interface ContentState {
		content: string;
		selectionStart: number;
		selectionEnd: number;
		isFormatting: boolean;
	}
	
	let contentHistory: ContentState[] = [];
	let historyIndex = -1;
	let textArea: HTMLTextAreaElement;

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

	const formatText = (type: string) => {
		if (!textArea) return;
		
		saveContentState(true);
		const selStart = textArea.selectionStart;
		const selEnd = textArea.selectionEnd;
		const text = textArea.value.substring(selStart, selEnd);
		
		let formattedText = '';
		let newCursorPos = selStart;
		
		switch (type) {
			case 'bold':
				if (text.startsWith('**') && text.endsWith('**')) {
					formattedText = text.slice(2, -2);
				} else {
					formattedText = `**${text}**`;
				}
				break;
			case 'italic':
				if (text.startsWith('*') && text.endsWith('*') && !text.startsWith('**')) {
					formattedText = text.slice(1, -1);
				} else {
					formattedText = `*${text}*`;
				}
				break;
			case 'underline':
				if (text.startsWith('<ins>') && text.endsWith('</ins>')) {
					formattedText = text.slice(5, -6);
				} else {
					formattedText = `<ins>${text}</ins>`;
				}
				break;
			case 'link':
				formattedText = `[${text}](url)`;
				break;
		}
		
		textArea.setRangeText(formattedText, selStart, selEnd, 'end');
		if (selStart === selEnd) {
			// If no text was selected, place cursor in the middle
			switch (type) {
				case 'bold':
					newCursorPos = selStart + 2;
					break;
				case 'italic':
					newCursorPos = selStart + 1;
					break;
				case 'underline':
					newCursorPos = selStart + 5;
					break;
				case 'link':
					newCursorPos = selStart + 1;
					break;
			}
			textArea.setSelectionRange(newCursorPos, newCursorPos);
		}
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
				case 'm':
					e.preventDefault();
					preferences.focusMode = !preferences.focusMode;
					dispatch('focusMode', { focusMode: preferences.focusMode });
					break;
				case 'b':
					e.preventDefault();
					formatText('bold');
					break;
				case 'i':
					e.preventDefault();
					formatText('italic');
					break;
				case 'u':
					e.preventDefault();
					formatText('underline');
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
			}
		}
	};

	onMount(() => {
		if (textArea) {
			textArea.focus();
		}
	});
</script>

<div class="w-1/2 flex flex-col h-full border-r border-gray-700" class:hidden={viewMode}>
	<div class="h-full flex flex-col relative">
		<textarea
			bind:this={textArea}
			class="flex-1 resize-none appearance-none overflow-y-auto p-6 font-mono text-sm transition placeholder:text-gray-400 focus:outline-none text-gray-50 bg-gray-950"
			placeholder="# Title"
			bind:value={content}
			on:keydown={onKeyDown}
		></textarea>

		<!-- Formatting toolbar -->
		<div class="flex flex-wrap p-3 border-t border-gray-700 bg-gray-900" class:hidden={preferences.focusMode}>
			<button
				class="button"
				title="Bold (Ctrl/Cmd + B)"
				on:click={() => formatText('bold')}
			>
				<strong>B</strong>
			</button>
			<button
				class="button"
				title="Italic (Ctrl/Cmd + I)"
				on:click={() => formatText('italic')}
			>
				<em>I</em>
			</button>
			<button
				class="button"
				title="Underline (Ctrl/Cmd + U)"
				on:click={() => formatText('underline')}
			>
				<u>U</u>
			</button>
			<button
				class="button"
				title="Link (Ctrl/Cmd + K)"
				on:click={() => formatText('link')}
			>
				<Anchor />
			</button>
			<button
				class="button"
				title="Bullet List"
				on:click={() => {
					saveContentState(true);
					const pos = textArea.selectionStart;
					textArea.setRangeText('- ', pos, pos, 'end');
					textArea.setSelectionRange(pos + 2, pos + 2);
				}}
			>
				<Bullet />
			</button>
			<button
				class="button"
				title="Blockquote"
				on:click={() => {
					saveContentState(true);
					const pos = textArea.selectionStart;
					textArea.setRangeText('> ', pos, pos, 'end');
					textArea.setSelectionRange(pos + 2, pos + 2);
				}}
			>
				<Blockquote />
			</button>
			<button
				class="button"
				title="Image"
				on:click={() => {
					saveContentState(true);
					const pos = textArea.selectionStart;
					textArea.setRangeText('![alt text](url)', pos, pos, 'end');
					textArea.setSelectionRange(pos + 2, pos + 10);
				}}
			>
				<Image />
			</button>
			<button
				class="button"
				title="Table"
				on:click={() => {
					saveContentState(true);
					const pos = textArea.selectionStart;
					const table = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
					textArea.setRangeText(table, pos, pos, 'end');
					textArea.setSelectionRange(pos + 2, pos + 10);
				}}
			>
				<Table />
			</button>
			<button
				class="button"
				title="Code Block"
				on:click={() => {
					saveContentState(true);
					const pos = textArea.selectionStart;
					textArea.setRangeText('```\n\n```', pos, pos, 'end');
					textArea.setSelectionRange(pos + 4, pos + 4);
				}}
			>
				<CodeBracket />
			</button>
			<button
				class="button"
				title="Toggle Focus Mode"
				on:click={() => preferences.focusMode = !preferences.focusMode}
			>
				<Focus />
			</button>
			<button
				class="button"
				title="Toggle View Mode"
				on:click={() => viewMode = !viewMode}
			>
				<Slideshow />
			</button>
		</div>
	</div>
</div>

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

	textarea {
		flex: 1;
		min-height: 0;
	}
</style> 