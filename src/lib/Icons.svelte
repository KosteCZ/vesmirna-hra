<script>
  export let name;
  export let size = 24;
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="icon"
>
  {#if name === 'iron'}
    <path d="M4 10h16M4 14h16M4 18h16M4 6h16M21 6V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z" />
  {:else if name === 'energy'}
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  {:else if name === 'mine'}
    <path d="M12 2v10M18 9l-6 3-6-3M6 15l6 3 6-3" />
  {:else if name === 'solar'}
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  {:else if name === 'warehouse'}
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  {:else if name === 'upgrade'}
    <polyline points="17 11 12 6 7 11" />
    <polyline points="17 18 12 13 7 18" />
  {/if}
</svg>

<style>
  .icon {
    display: inline-block;
    vertical-align: middle;
  }
</style>
