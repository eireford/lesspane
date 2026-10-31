import type { Stories } from './config';

/** x, y, width, height on the 400×300 sketch canvas. */
export type Rect = [number, number, number, number];

export type HouseSketch = {
	id: string;
	/** Screen-reader name; the page shows the drawing, not the words. */
	name: string;
	/** Used for pricing: upper floors cost more to reach. */
	stories: Stories;
	/** Outline strokes: ground, walls, roof, chimneys, porch. Closed paths (ending in Z) get roof shading. */
	lines: string[];
	door: Rect;
	/** In wiping order: ground floor first, so a low squeegee count cleans the easy ones. */
	windows: Rect[];
};

export const SKETCH_W = 400;
export const SKETCH_H = 300;
const GROUND = 'M16 272 H384';

// Simple line drawings of common house types. Order is the order the house card shows them.
export const houses: HouseSketch[] = [
	{
		id: 'colonial',
		name: 'Two-story colonial with a centered front door',
		stories: 2,
		lines: [
			GROUND,
			'M70 272 V122 H330 V272',
			'M60 124 L110 76 H290 L340 124 Z',
			'M114 80 V56 H128 V70 M272 70 V56 H286 V80',
			'M176 210 L200 196 L224 210'
		],
		door: [186, 212, 28, 60],
		windows: [
			[88, 214, 34, 44], [140, 214, 34, 44], [226, 214, 34, 44], [278, 214, 34, 44],
			[88, 142, 34, 44], [140, 142, 34, 44], [186, 144, 28, 38], [226, 142, 34, 44], [278, 142, 34, 44]
		]
	},
	{
		id: 'farmhouse',
		name: 'Farmhouse with a front gable, porch and side wing',
		stories: 2,
		lines: [
			GROUND,
			'M70 272 V122 H230 V272',
			'M60 124 L150 56 L240 124 Z',
			'M230 272 V176 H340 V272',
			'M226 178 L288 136 L350 178 Z',
			'M64 205 H236',
			'M80 205 V272 M220 205 V272'
		],
		door: [155, 218, 30, 54],
		windows: [
			[90, 220, 36, 44], [250, 196, 34, 40], [296, 196, 34, 40],
			[94, 140, 34, 46], [172, 140, 34, 46], [137, 82, 26, 28]
		]
	},
	{
		id: 'cottage',
		name: 'Small cottage with a steep roof and chimney',
		stories: 1,
		lines: [
			GROUND,
			'M110 272 V170 H290 V272',
			'M100 172 L200 95 L300 172 Z',
			'M246 136 V108 H264 V150',
			'M54 272 q8 -22 18 -6 q8 -16 18 4 q6 -10 10 2',
			'M304 272 q6 -18 15 -5 q8 -14 16 3 q6 -8 9 2',
			'M188 272 L178 296 M212 272 L222 296'
		],
		door: [185, 214, 30, 58],
		windows: [
			[128, 192, 38, 44], [234, 192, 38, 44], [189, 130, 22, 24]
		]
	},
	{
		id: 'bungalow',
		name: 'Craftsman bungalow with a deep porch and a dormer',
		stories: 1,
		lines: [
			GROUND,
			'M80 272 V178 H320 V272',
			'M70 180 L130 122 H270 L330 180 Z',
			'M80 205 H320',
			'M96 205 V272 M304 205 V272',
			'M180 160 V138 L200 124 L220 138 V160'
		],
		door: [200, 218, 30, 54],
		windows: [
			[110, 218, 36, 40], [150, 218, 36, 40], [252, 218, 40, 40], [188, 140, 24, 18]
		]
	},
	{
		id: 'cape-cod',
		name: 'Cape Cod with two dormers',
		stories: 2,
		lines: [
			GROUND,
			'M90 272 V192 H310 V272',
			'M80 194 L132 120 H268 L320 194 Z',
			'M134 178 V146 L154 130 L174 146 V178',
			'M226 178 V146 L246 130 L266 146 V178',
			'M282 124 V96 H298 V124'
		],
		door: [186, 212, 28, 60],
		windows: [
			[104, 210, 34, 42], [142, 210, 34, 42], [224, 210, 34, 42], [262, 210, 34, 42],
			[142, 148, 24, 24], [234, 148, 24, 24]
		]
	},
	{
		id: 'modern',
		name: 'Modern house with stacked boxes and big glass',
		stories: 2,
		lines: [
			GROUND,
			'M60 272 V190 H300 V272',
			'M140 190 V110 H360 V190 H300',
			'M128 110 H372',
			'M48 190 H140'
		],
		door: [178, 204, 24, 68],
		windows: [
			[74, 204, 88, 52], [214, 204, 72, 52], [156, 124, 122, 50], [290, 124, 56, 50]
		]
	},
	{
		id: 'ranch',
		name: 'Single-story ranch with a garage',
		stories: 1,
		lines: [
			GROUND,
			'M40 272 V198 H360 V272',
			'M30 200 L90 158 H310 L370 200 Z',
			'M250 272 V214 H340 V272',
			'M250 229 H340 M250 244 H340 M250 258 H340'
		],
		door: [150, 220, 26, 52],
		windows: [
			[58, 216, 40, 34], [102, 216, 40, 34], [192, 216, 44, 34]
		]
	},
	{
		id: 'victorian',
		name: 'Three-story Victorian with a turret and porch',
		stories: 3,
		lines: [
			GROUND,
			'M110 272 V102 H300 V272',
			'M100 104 L205 40 L310 104 Z',
			'M70 272 V92 H120',
			'M64 94 L95 28 L126 94 Z',
			'M95 28 V16',
			'M100 222 H320',
			'M120 222 V272 M310 222 V272'
		],
		door: [222, 230, 28, 42],
		windows: [
			[140, 232, 30, 34], [82, 226, 26, 34],
			[140, 170, 30, 38], [240, 170, 30, 38], [82, 168, 26, 34],
			[140, 114, 30, 36], [240, 114, 30, 36], [82, 112, 26, 34], [193, 66, 24, 28]
		]
	},
	{
		id: 'townhouse',
		name: 'Narrow three-story townhouse with a stoop',
		stories: 3,
		lines: [
			GROUND,
			'M130 272 V72 H270 V272',
			'M120 72 H280 M124 64 H276 M124 64 V72 M276 64 V72',
			'M206 272 V264 H258 V272 M210 264 V258 H254 V264'
		],
		door: [214, 204, 36, 54],
		windows: [
			[150, 210, 36, 46], [150, 150, 36, 46], [214, 150, 36, 46], [150, 90, 36, 46], [214, 90, 36, 46]
		]
	}
];
