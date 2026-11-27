<script lang="ts">
	import { business } from '#lib/config.ts';

	// What LessPane collects. Keep it true to the code: the booking form and store (src/lib/server/store.ts), email
	// and calendar (email.ts, calendar.ts), the chat (ChatPanel.svelte keeps it in sessionStorage; chat.ts), and the
	// /admin session cookie. If showcase mode is turned off for a real business, rewrite this with the owner first.
	const showcase = business.showcase;
</script>

<svelte:head>
	<title>Privacy · {business.name}{showcase.enabled ? ' demo' : ''}</title>
	<meta name="description" content="What {business.name} collects when you get a quote, book a visit or use the chat, and where it goes." />
</svelte:head>

<section class="privacy">
	<p class="step">Privacy</p>
	<h1>What this site collects</h1>

	{#if showcase.enabled}
		<p>
			{business.name} is a working demo built and run by <a href={showcase.builtByUrl}>{showcase.builtBy}</a>.
			Requests made here are not real jobs: no one will come to clean, and they go to {showcase.builtBy}, not to a
			window-cleaning business.
		</p>
	{/if}

	<h2>Getting a quote</h2>
	<p>The quote is worked out from what you choose about the house. Nothing is saved until you book.</p>

	<h2>Booking a visit</h2>
	<p>
		Your email address (the only required field), and your name, phone number, address, ZIP code, notes and the
		details of the job if you give them, are saved in the site's database on Google Cloud. They are used to send
		you a confirmation, to send the owner an alert email, and to put the visit on the owner's Google Calendar.
		Your private link to change or cancel the booking is stored only as a hash. Bookings made by an AI assistant
		on your behalf are handled the same way.
	</p>

	<h2>The chat</h2>
	<p>
		The conversation is kept in your browser until you close the tab, and each message is sent to Google's Gemini
		model on Google Cloud to write the answer. It isn't saved on the server. If the chat books a visit for you,
		the booking is saved as above.
	</p>

	<h2>Server logs and cookies</h2>
	<p>
		Google Cloud keeps standard request logs (IP address, page, time and browser) for about 30 days, read only to
		fix problems. The only cookie is the owner's sign-in. There are no analytics or advertising tags.
	</p>

	<h2>Deleting your details</h2>
	<p>
		Nothing is sold or shared. To have a booking and your details deleted, email
		<a href="mailto:{business.contactEmail}">{business.contactEmail}</a>.
	</p>
</section>

<style>
	.privacy {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1rem 0 2rem;
	}
	.privacy h2 {
		margin-top: 1.5rem;
		font-size: 1.15rem;
	}
	.privacy p {
		line-height: 1.6;
	}
</style>
