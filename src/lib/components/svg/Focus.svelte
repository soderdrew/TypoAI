<!-- Focus.svelte -->
<script lang="ts">
	export let size = 5;
	export let strokeWidth = 2;
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	fill="none"
	viewBox="0 0 24 24"
	stroke-width={strokeWidth}
	stroke="currentColor"
	class="w-{size} h-{size}"
>
	<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width={strokeWidth} />
	<line x1="12" y1="4" x2="12" y2="8" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" />
	<line x1="12" y1="16" x2="12" y2="20" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" />
	<line x1="4" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" />
	<line x1="16" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" />
</svg>