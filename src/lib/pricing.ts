import { pricing as defaultPricing, type AddOnKey, type ServiceType, type Stories } from './config';

export type QuoteInput = {
	windows: number;
	stories: Stories;
	service: ServiceType;
	addons: AddOnKey[];
};

export type QuoteLine = { label: string; amount: number };

export type Quote = {
	lines: QuoteLine[];
	/** Before rounding and the minimum. */
	subtotal: number;
	total: number;
	minimumApplied: boolean;
};

type Pricing = typeof defaultPricing;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * price = max(minimum, round(windows × rate × storyFactor × serviceFactor + Σ add-ons))
 */
export function computeQuote(input: QuoteInput, p: Pricing = defaultPricing): Quote {
	const windowsAmount = round2(
		input.windows * p.perWindow * p.storyFactor[input.stories] * p.serviceFactor[input.service]
	);

	const lines: QuoteLine[] = [
		{
			label: `${input.windows} window${input.windows === 1 ? '' : 's'}, ${input.stories}-story`,
			amount: windowsAmount
		}
	];

	// De-duplicate add-ons so a repeated query param can't double-charge.
	for (const key of [...new Set(input.addons)]) {
		const addOn = p.addOns[key];
		if (addOn) lines.push({ label: addOn.label, amount: addOn.price });
	}

	const subtotal = round2(lines.reduce((sum, line) => sum + line.amount, 0));
	const rounded = Math.round(subtotal / p.roundTo) * p.roundTo;
	const total = Math.max(p.minimum, rounded);

	return { lines, subtotal, total, minimumApplied: total > rounded };
}

const usd = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 0
});

export const formatUsd = (n: number) => usd.format(n);
