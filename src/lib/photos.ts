import type { Stories } from './config';

/** A window on a photo: x, y, width, height in the photo's own pixels. */
export type Rect = [number, number, number, number];

export type HouseStyle = 'modern' | 'classic' | 'cottage';

export type HousePhoto = {
	id: string;
	src: string;
	width: number;
	height: number;
	/** Used for pricing: upper floors cost more to reach. */
	stories: Stories;
	style: HouseStyle;
	/** Screen-reader name; the page itself shows the picture, not the words. */
	name: string;
	/** Visible windows, measured by hand on the 1280px image. */
	windows: Rect[];
	credit: { author: string; license: string; source: string };
};

const licenseUrls: Record<string, string> = {
	'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
	'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
	'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
	'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
	'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/'
};
export const licenseUrl = (license: string) => licenseUrls[license];

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

// Freely licensed photos from Wikimedia Commons, stored in static/photos at 1280px wide.
// The dirt is drawn over them in the browser; the image files are unmodified.
// Order is the order the house picker shows them.
export const houses: HousePhoto[] = [
	{
		id: 'modern-farmhouse',
		src: '/photos/modern-farmhouse.jpg',
		width: 1280,
		height: 853,
		stories: 2,
		style: 'modern',
		name: 'Modern farmhouse with board-and-batten siding, lit at dusk',
		windows: [
			[818, 238, 32, 44], [857, 238, 32, 44], [333, 390, 34, 62], [377, 390, 34, 62],
			[706, 384, 46, 86], [762, 384, 46, 86], [900, 388, 44, 84], [955, 388, 44, 84],
			[492, 550, 52, 92], [553, 550, 48, 92], [315, 578, 34, 64], [362, 578, 34, 64],
			[698, 556, 34, 58], [903, 556, 44, 86], [958, 556, 44, 86]
		],
		credit: { author: 'Vomcphoto', license: 'CC BY-SA 4.0', source: commons('GVP-Pearson-Model-Exterior-Dusk.jpg') }
	},
	{
		id: 'bungalow-picket',
		src: '/photos/bungalow-picket.jpg',
		width: 1280,
		height: 960,
		stories: 1,
		style: 'cottage',
		name: 'Craftsman bungalow behind a white picket fence',
		windows: [
			[698, 362, 40, 116], [746, 362, 36, 116], [792, 362, 38, 116], [838, 362, 34, 116],
			[360, 368, 25, 112], [395, 368, 43, 112]
		],
		credit: {
			author: 'David Sawyer',
			license: 'CC BY-SA 2.0',
			source: commons('American_craftsman_bungalow_in_San_Jose,_Ca_(1).jpg')
		}
	},
	{
		id: 'queen-anne-blue',
		src: '/photos/queen-anne-blue.jpg',
		width: 1280,
		height: 853,
		stories: 2,
		style: 'classic',
		name: 'Blue Queen Anne house with a shingled gable and front porch',
		windows: [
			[782, 198, 28, 80], [262, 240, 20, 80], [475, 360, 30, 95], [718, 358, 36, 120],
			[897, 385, 30, 112], [258, 395, 24, 80], [168, 582, 22, 118], [204, 582, 22, 118],
			[277, 578, 26, 118], [455, 570, 26, 128], [497, 570, 26, 95]
		],
		credit: { author: 'Zeete', license: 'CC BY-SA 4.0', source: commons('26_East_Avenue,_Blairstown,_NJ.jpg') }
	},
	{
		id: 'cape-cod',
		src: '/photos/cape-cod.jpg',
		width: 1280,
		height: 960,
		stories: 1,
		style: 'cottage',
		name: 'Blue Cape Cod house with a bay window and rhododendrons',
		windows: [
			[324, 409, 20, 97], [348, 409, 21, 97], [375, 409, 27, 97], [411, 409, 29, 97],
			[449, 409, 36, 97], [727, 397, 72, 88], [816, 397, 85, 88], [1143, 149, 19, 144],
			[1120, 400, 20, 91]
		],
		credit: {
			author: 'Famartin',
			license: 'CC BY-SA 4.0',
			source: commons('2015-05-17_14_26_04_A_Cape_Cod_style_house_on_Terrace_Boulevard_in_Ewing,_New_Jersey.jpg')
		}
	},
	{
		id: 'midcentury',
		src: '/photos/midcentury.jpg',
		width: 1280,
		height: 1048,
		stories: 2,
		style: 'modern',
		name: 'Mid-century modern house with walls of glass and azaleas',
		windows: [
			[333, 315, 38, 118], [375, 295, 55, 118], [437, 275, 45, 118], [497, 252, 50, 145],
			[555, 228, 82, 130], [645, 195, 70, 160], [470, 510, 55, 90], [680, 478, 80, 120],
			[770, 465, 95, 130], [880, 455, 115, 150], [1012, 430, 118, 190]
		],
		credit: { author: 'H49HHN', license: 'CC BY-SA 4.0', source: commons('2_springtime_in_Hollin_Hills.jpg') }
	},
	{
		id: 'georgian',
		src: '/photos/georgian.jpg',
		width: 1280,
		height: 960,
		stories: 2,
		style: 'classic',
		name: 'Brick Georgian house with dormers and an arched portico',
		windows: [
			[410, 300, 34, 70], [690, 232, 42, 82], [357, 465, 40, 85], [522, 442, 38, 80],
			[718, 413, 60, 107], [335, 647, 55, 90], [707, 640, 88, 145]
		],
		credit: { author: 'Corey Coyle', license: 'CC BY 3.0', source: commons('Agnes_Kelley_House_-_panoramio.jpg') }
	},
	{
		id: 'gothic-yellow',
		src: '/photos/gothic-yellow.jpg',
		width: 1280,
		height: 1034,
		stories: 2,
		style: 'classic',
		name: 'Yellow Gothic Revival house with gingerbread trim in Cape May',
		windows: [
			[483, 280, 45, 90], [184, 495, 48, 135], [320, 488, 52, 138], [468, 478, 58, 142],
			[630, 465, 60, 152], [807, 450, 65, 160], [1072, 282, 18, 105], [1122, 315, 18, 98],
			[1150, 505, 20, 155], [172, 760, 52, 140]
		],
		credit: {
			author: 'Bmzuckerman',
			license: 'CC BY 4.0',
			source: commons(
				'Add-ons_-_Early_Victorian_(Gothic_Revival_and_Italianate_on_19th_Century_Vernacular)_-_Cape_May,_NJ_-_Joseph_Q._Williams_House_(1).jpg'
			)
		}
	},
	{
		id: 'painted-lady',
		src: '/photos/painted-lady.jpg',
		width: 1280,
		height: 960,
		stories: 3,
		style: 'classic',
		name: 'Painted Lady Victorian with a mansard tower and wraparound porch',
		windows: [
			[735, 388, 20, 40], [548, 525, 40, 80], [657, 522, 20, 80], [732, 522, 38, 80],
			[810, 560, 25, 55], [890, 568, 28, 70], [410, 540, 22, 70], [315, 560, 38, 72],
			[434, 446, 12, 30]
		],
		credit: { author: 'Mwanner', license: 'CC BY-SA 3.0', source: commons('Painted_Lady_B%26B,_Westport,_NY.jpg') }
	},
	{
		id: 'meredith',
		src: '/photos/meredith.jpg',
		width: 1280,
		height: 720,
		stories: 2,
		style: 'classic',
		name: 'Meredith House, a brick house with dormers in Cambridge, Maryland',
		windows: [
			[511, 144, 43, 83], [853, 127, 48, 83], [491, 296, 61, 95], [664, 291, 64, 99],
			[849, 288, 68, 101], [485, 452, 60, 109], [849, 453, 68, 113]
		],
		credit: {
			author: 'Preservation Maryland',
			license: 'CC BY-SA 2.0',
			source: commons('LaGrange,_house_(21577881026).jpg')
		}
	},
	{
		id: 'bungalow-brick',
		src: '/photos/bungalow-brick.jpg',
		width: 1280,
		height: 960,
		stories: 1,
		style: 'cottage',
		name: 'Brick craftsman bungalow with a deep front porch',
		windows: [
			[536, 272, 62, 40], [283, 432, 50, 86], [412, 432, 52, 86], [552, 418, 52, 62]
		],
		credit: { author: 'Jacob Rose', license: 'CC BY-SA 4.0', source: commons('Craftsman_Bungalow_in_Central_Tacoma,_WA.jpg') }
	},
	{
		id: 'queen-anne-turret',
		src: '/photos/queen-anne-turret.jpg',
		width: 1280,
		height: 960,
		stories: 3,
		style: 'classic',
		name: 'Gray Queen Anne Victorian with a pointed turret',
		windows: [
			[510, 285, 25, 85], [555, 275, 40, 85], [620, 280, 30, 85], [500, 435, 30, 105],
			[545, 432, 50, 112], [612, 437, 35, 110], [372, 488, 30, 85], [775, 355, 18, 40],
			[805, 355, 18, 45], [832, 360, 15, 45], [815, 470, 22, 100], [1008, 535, 40, 95],
			[1003, 668, 38, 105], [1050, 668, 32, 105]
		],
		credit: { author: 'RococoLouise', license: 'CC BY-SA 4.0', source: commons('513_Summit_Queen_Anne.jpg') }
	},
	{
		id: 'lednum',
		src: '/photos/lednum.jpg',
		width: 1280,
		height: 855,
		stories: 3,
		style: 'classic',
		name: 'Lednum House, a three-story brick house with black shutters in Easton, Maryland',
		windows: [
			[355, 213, 47, 123], [488, 191, 51, 124], [632, 165, 53, 125], [864, 200, 27, 140],
			[1013, 293, 20, 113], [341, 433, 47, 117], [476, 416, 49, 128], [623, 404, 59, 135],
			[860, 429, 33, 141]
		],
		credit: {
			author: 'Bmzuckerman',
			license: 'CC BY 4.0',
			source: commons('Add-ons_-_Early_Victorian_(Italianate_on_Federal)_-_Easton,_MD_-_Lednum_House_(1).jpg')
		}
	}
];
