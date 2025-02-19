<script lang="ts">
	import Metrics from "$lib/components/Metrics.svelte";
	import Slides from "$lib/components/Slides.svelte";
	import Document from "$lib/components/svg/Document.svelte";
	import Slideshow from "$lib/components/svg/Slideshow.svelte";
	import ZoomOut from "$lib/components/svg/ZoomOut.svelte";
	import ZoomIn from "$lib/components/svg/ZoomIn.svelte";
	import View from "$lib/components/svg/View.svelte";
	import Edit from "$lib/components/svg/Edit.svelte";

	export let content: string;
	export let html: string;
	export let viewMode: boolean;
	export let currentSlide: number;
	export let preferences: {
		fontSize: number;
		fontFamily: number;
		color: number;
		viewType: "document" | "slideshow";
		focusMode: boolean;
	};

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

	const changeViewType = (type: typeof preferences.viewType) => {
		preferences.viewType = type;
	};

	const changeProseSize = (action: "increase" | "decrease") => {
		if (action === "increase") {
			if (preferences.fontSize < fontSizes.length - 1) preferences.fontSize++;
		} else {
			if (preferences.fontSize > 0) preferences.fontSize--;
		}
	};

	const changeColor = () => {
		if (preferences.color < colors.prose.length - 1) {
			preferences.color++;
		} else {
			preferences.color = 0;
		}
	};

	const changeFontFamily = () => {
		if (preferences.fontFamily < fontFamilies.length - 1) {
			preferences.fontFamily++;
		} else {
			preferences.fontFamily = 0;
		}
	};
</script>

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
				on:click={() => viewMode = !viewMode}
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