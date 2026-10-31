<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';

	// The whole journey in four stages, so customers know what they're doing and what comes next.
	// The landing and quote pages cover stages 0–1, the booking page stage 2; stage 3 happens after they send.
	let { stage }: { stage: 0 | 1 | 2 | 3 } = $props();

	const stages: { icon: IconName; label: string; note: string }[] = [
		{ icon: 'home', label: 'Describe your house', note: 'floors, sides, windows' },
		{ icon: 'sparkle', label: 'See your price', note: 'instantly, no account' },
		{ icon: 'calendar', label: 'Pick a time', note: 'morning or afternoon' },
		{ icon: 'phone', label: 'We text to confirm', note: 'no payment until the job' }
	];
</script>

<ol class="journey" aria-label="How it works">
	{#each stages as s, i}
		<li class:now={i === stage} class:done={i < stage} aria-current={i === stage ? 'step' : undefined}>
			<span class="num"><Icon name={s.icon} size={18} /></span>
			<span class="what"><strong>{s.label}</strong><small>{s.note}</small></span>
		</li>
	{/each}
</ol>

<style>
	.journey {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
		margin: 0 0 16px;
		padding: 0;
		list-style: none;
		counter-reset: stage;
	}

	.journey li {
		display: grid;
		justify-items: center;
		gap: 4px;
		padding: 8px 4px;
		text-align: center;
		border: 1.5px dashed var(--line);
		border-radius: var(--sketchy);
		color: var(--ink-soft);
		counter-increment: stage;
	}

	.journey li.now {
		border: 2px solid var(--ink);
		background: var(--highlight);
		color: var(--ink);
	}

	.journey li.done {
		border-style: solid;
		border-color: var(--brand);
		color: var(--brand);
	}

	.num {
		position: relative;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 1.5px solid currentColor;
		border-radius: 50%;
		background: var(--paper);
	}

	.num::after {
		content: counter(stage);
		position: absolute;
		top: -6px;
		right: -8px;
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--ink);
		color: var(--paper);
		font-family: var(--hand);
		font-size: 0.8rem;
	}

	.journey .what {
		display: grid;
		line-height: 1.1;
	}

	.journey strong {
		font-family: var(--hand);
		font-weight: 400;
		font-size: 1rem;
	}

	.journey small {
		font-size: 0.72rem;
	}

	@media (max-width: 380px) {
		.journey small {
			display: none;
		}
	}
</style>
