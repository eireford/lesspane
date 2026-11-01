<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	// lesspane.com/video: the 37-second pitch for a would-be owner, made to be opened from a text on a phone.
	// Silent, so it can start muted; the captions carry it.
</script>

<svelte:head>
	<title>LessPane · A window-cleaning business that books itself</title>
	<meta name="description" content="A 37-second look at LessPane: instant window-cleaning quotes and bookings for Maryland’s Eastern Shore." />
	<meta property="og:title" content="LessPane · A window-cleaning business that books itself" />
	<meta property="og:image" content="https://lesspane.com/video/poster.png" />
	<meta property="og:video" content="https://lesspane.com/video/lesspane-for-owners.mp4" />
	<meta property="og:video:type" content="video/mp4" />
</svelte:head>

<section class="player">
	<!-- svelte-ignore a11y_media_has_caption: the video is silent; its captions are drawn in the picture -->
	<video
		src="/video/lesspane-for-owners.mp4"
		poster="/video/poster.png"
		controls
		playsinline
		muted
		preload="metadata"
		aria-label="LessPane in 37 seconds: customers get a price in under a minute, pick their own day, and bookings land in the owner’s Gmail and Calendar."
	></video>
</section>

<p class="links">
	<a class="try" href="/"><Icon name="window" size={20} /> Try it yourself</a>
	<a href="/deck">The longer tour <Icon name="right" size={18} /></a>
</p>

<style>
	.player {
		display: grid;
		place-items: center;
	}

	video {
		width: 100%;
		max-width: 420px;
		max-height: 78vh;
		aspect-ratio: 9 / 16;
		border: 2px solid var(--ink);
		border-radius: 18px;
		background: var(--brand-soft);
		box-shadow: var(--shadow);
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 12px 20px;
		margin: 20px 0 0;
		font-family: var(--hand);
		font-size: 1.25rem;
	}

	.links a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--ink);
	}

	.try {
		padding: 8px 16px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--brand);
		color: var(--brand-ink) !important;
		text-decoration: none;
		box-shadow: var(--shadow);
	}
</style>
