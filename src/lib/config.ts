// All business settings in one place. Change numbers here, not in components.
//
// ESTIMATES: prices below are set from published 2026 market rates (national $4–8 per pane /
// $10–15 per window inside + out; typical job $200–320). Confirm against two or three Eastern
// Shore competitor quotes (Salisbury, Easton, Ocean City) before the pilot (see "Open questions" in the prototype spec).

export const business = {
	name: 'LessPane',
	timeZone: 'America/New_York',
	/** How far ahead customers can request a date. */
	bookingWindowDays: { min: 1, max: 60 },
	/** The feature-tour slides, kept outside the app; /deck on either site redirects here. */
	deckUrl: 'https://claude.ai/artifact/XaSD4ek8sxbtncPPzrBVJG',
	/**
	 * Showcase mode: LessPane is a working portfolio prototype, not a live service. While `enabled`,
	 * every page says so, and the confirmation page says no one will come. Set to false at launch.
	 */
	/**
	 * Public contact address in the footer. hello@lesspane.com bounces until it is added as an alternate
	 * address in Google Workspace (README, "Email"); switch back once a test message to it arrives.
	 */
	contactEmail: 'eire@wedocompute.com',
	showcase: {
		enabled: true,
		builtBy: 'Eire Ford',
		builtByUrl: 'https://eireford.com',
		sourceUrl: 'https://github.com/eireford/lesspane'
	}
};

export type ServiceType = 'exterior' | 'interior_exterior';
export type AddOnKey = 'screens' | 'tracks' | 'hard_water';
export type Stories = 1 | 2 | 3;
export type TimeWindow = 'morning' | 'afternoon';

/** An add-on is charged once per window or once per visit. */
export type AddOn = { label: string; price: number; per: 'window' | 'visit' };

export const pricing = {
	/** Base price per window, outside only, single story, USD. ESTIMATE */
	perWindow: 7,
	/** Upper floors need ladders: roughly +$1–2.50 per window per floor. ESTIMATE */
	storyFactor: { 1: 1.0, 2: 1.15, 3: 1.4 } as Record<Stories, number>,
	/** Inside + outside ≈ $12 per window at the base rate. ESTIMATE */
	serviceFactor: { exterior: 1.0, interior_exterior: 1.7 } as Record<ServiceType, number>,
	/** Add-on prices, USD. ESTIMATE (market: screens $1–5, tracks $2–5, hard water $10–30 per window) */
	addOns: {
		screens: { label: 'Screen cleaning', price: 3, per: 'window' },
		tracks: { label: 'Track and sill cleaning', price: 4, per: 'window' },
		hard_water: { label: 'Hard-water stain removal', price: 10, per: 'window' }
	} as Record<AddOnKey, AddOn>,
	/** Smallest job you'll take, USD. ESTIMATE (small homes run $120–200) */
	minimum: 150,
	/** Final price is rounded to the nearest multiple of this. */
	roundTo: 5,
	/** Up to 8 sides × 3 floors × a "10+" bucket (12) each = 288. */
	maxWindows: 300
};

export const serviceLabels: Record<ServiceType, string> = {
	exterior: 'Outside only',
	interior_exterior: 'Inside + outside'
};

export const timeWindowLabels: Record<TimeWindow, string> = {
	morning: 'Morning (8am–12pm)',
	afternoon: 'Afternoon (12pm–5pm)'
};

// Service area: Maryland's Eastern Shore, all nine counties (ZIPs from GeoNames, includes PO-box ZIPs).
// Trim to a launch cluster before the pilot if you can't cover the whole shore yet.
export const serviceAreaZips = new Set([
	// Caroline County: Bethlehem, Denton, Federalsburg, Goldsboro, Greensboro, Henderson, Hillsboro, Marydel, Preston, Ridgely, Templeville
	'21609', '21629', '21632', '21636', '21639', '21640', '21641', '21649', '21655', '21660',
	'21670',
	// Cecil County: Cecilton, Charlestown, Chesapeake City, Childs, Colora, Conowingo, Earleville, Elk Mills, Elkton, Georgetown, North East, Perry Point, Perryville, Port Deposit, Rising Sun, Warwick
	'21901', '21902', '21903', '21904', '21911', '21912', '21913', '21914', '21915', '21916',
	'21917', '21918', '21919', '21920', '21921', '21922', '21930',
	// Dorchester County: Cambridge, Church Creek, Crapo, Crocheron, East New Market, Fishing Creek, Hurlock, Linkwood, Madison, Rhodesdale, Secretary, Taylors Island, Toddville, Vienna, Wingate, Woolford
	'21613', '21622', '21626', '21627', '21631', '21634', '21643', '21648', '21659', '21664',
	'21669', '21672', '21675', '21677', '21835', '21869',
	// Kent County: Betterton, Chestertown, Galena, Kennedyville, Massey, Millington, Rock Hall, Still Pond, Worton
	'21610', '21620', '21635', '21645', '21650', '21651', '21661', '21667', '21678',
	// Queen Anne's County: Barclay, Centreville, Chester, Chestertown, Church Hill, Crumpton, Grasonville, Ingleside, Price, Queen Anne, Queenstown, Stevensville, Sudlersville
	'21607', '21617', '21619', '21623', '21628', '21638', '21644', '21656', '21657', '21658',
	'21666', '21668', '21690',
	// Somerset County: Crisfield, Deal Island, Ewell, Manokin, Marion Station, Princess Anne, Rehobeth, Tylerton, Upper Fairmount, Westover
	'21817', '21821', '21824', '21836', '21838', '21853', '21857', '21866', '21867', '21871',
	'21890',
	// Talbot County: Bozman, Claiborne, Cordova, Easton, Mcdaniel, Neavitt, Newcomb, Oxford, Royal Oak, Saint Michaels, Sherwood, Tilghman, Trappe, Wittman, Wye Mills
	'21601', '21612', '21624', '21625', '21647', '21652', '21653', '21654', '21662', '21663',
	'21665', '21671', '21673', '21676', '21679',
	// Wicomico County: Allen, Bivalve, Delmar, Fruitland, Hebron, Mardela Springs, Nanticoke, Parsonsburg, Pittsville, Powellville, Quantico, Salisbury, Sharptown, Tyaskin, Willards
	'21801', '21802', '21803', '21804', '21810', '21814', '21826', '21830', '21837', '21840',
	'21849', '21850', '21852', '21856', '21861', '21865', '21874', '21875',
	// Worcester County: Berlin, Bishopville, Eden, Girdletree, Newark, Ocean City, Pocomoke City, Showell, Snow Hill, Stockton, Whaleyville
	'21811', '21813', '21822', '21829', '21841', '21842', '21843', '21851', '21862', '21863',
	'21864', '21872'
]);

// ---------- Chat assistant ----------

/** The chat assistant on every page (Gemini on Vertex AI, `src/lib/server/assistant/`). */
export const assistant = {
	/** Gemini model and location; GEMINI_MODEL overrides the model. gemini-3.x is served from `global`. */
	model: 'gemini-3.5-flash-lite',
	location: 'global',
	maxOutputTokens: 800,
	temperature: 0.3,
	/** A conversation is sent whole each turn; past this many messages the visitor starts a new one. */
	maxMessages: 40,
	/** Longest message a visitor can send, in characters. */
	maxMessageChars: 1000,
	/** Tool calls (estimate, ZIP check, booking) the model may chain before it must answer. */
	maxToolRounds: 5,
	/** Usage limits, per Cloud Run instance (at most 3): visitor requests per minute per IP, Gemini calls per day. */
	requestsPerMinute: 10,
	dailyModelCalls: 500
};

/**
 * What the assistant tells customers about how LessPane works. ASSUMED: reasonable values for a small
 * owner-operated window cleaner, to be confirmed by the owner; every one of them is listed in
 * docs/assistant-questions.md. Prices are not here: they come from `pricing` above.
 */
export const policies = {
	who: 'a small, local, owner-operated window cleaning business on Maryland\'s Eastern Shore',
	hours: 'Visits run Monday to Saturday. Mornings are 8am to 12pm and afternoons 12pm to 5pm; we text or email the day before with a tighter arrival time.',
	confirmation: 'A request is not final until we confirm it, usually within one business day, by text if a phone number was given, otherwise by email.',
	payment: 'No deposit and nothing up front. Pay when the job is done, by card, check or cash. The price quoted is the price charged unless the home turns out to be quite different from what was described (for example many more windows); then we agree any change before starting.',
	changes: 'Customers can change the day or cancel for free, any time before the visit day, with the private link in their confirmation email. No cancellation fee.',
	weather: 'Light rain does not hurt the result, so outside cleaning goes ahead in drizzle. Heavy rain, storms, high wind or freezing temperatures mean we reschedule at no charge and get in touch to pick a new day.',
	guarantee: 'Streak-free guarantee: if any window is not right, tell us within 3 days and we come back and re-clean it free.',
	insured: 'We carry general liability insurance.',
	homeAccess: 'For outside-only cleaning nobody needs to be home, as long as gates are unlocked and pets are inside. For inside cleaning an adult needs to be home.',
	preparation: 'Before inside cleaning, clear sills and move fragile things away from windows; we move light furniture only if asked. Outside, unlock gates and keep pets indoors.',
	duration: 'A typical home takes 1 to 3 hours outside only, and roughly half as long again with inside cleaning.',
	frequency: 'Most homes need cleaning twice a year (spring and fall). Waterfront homes on the bays and the ocean, where salt spray builds up, look best with three or four visits a year.',
	notOffered: 'We do not clean gutters, solar panels, skylights reached from the roof, or buildings over three stories, and we do not do pressure washing or commercial storefronts yet. For those, suggest the customer emails us and we can point them to someone.'
};
