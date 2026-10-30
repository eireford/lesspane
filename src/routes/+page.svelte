<svelte:head>
	<title>LessPane · Window cleaning, priced in seconds</title>
</svelte:head>

<section class="hero stack">
	<h1>Clean windows, without the phone tag.</h1>
	<p class="lead muted">
		Tell us about your home, see your price instantly, and pick a day. We handle the rest.
	</p>
	<a class="btn block" href="/quote">Get my quote</a>
	<p class="muted small">Serving Maryland's Eastern Shore · No account needed · Takes under 2 minutes</p>
</section>

<section class="how card">
	<h2>How it works</h2>
	<ol>
		<li><strong>Describe your home.</strong> Address, stories, and about how many windows.</li>
		<li><strong>See your price.</strong> No in-person estimate, no waiting for a callback.</li>
		<li><strong>Pick a day.</strong> We text you to confirm the exact time.</li>
	</ol>
</section>

<style>
	.hero {
		padding: 24px 0 32px;
	}

	h1 {
		font-size: clamp(2rem, 8vw, 2.6rem);
	}

	.lead {
		font-size: 1.15rem;
	}

	.small {
		font-size: 0.9rem;
		text-align: center;
	}

	ol {
		margin: 0;
		padding-left: 1.25rem;
	}

	li + li {
		margin-top: 10px;
	}
</style>
