import type { Stories } from './config';

/** A window on a photo: x, y, width, height in the photo's own pixels. */
export type Rect = [number, number, number, number];

export type HousePhoto = {
	src: string;
	width: number;
	height: number;
	alt: string;
	/** Visible windows, measured by hand on the 1280px image. */
	windows: Rect[];
	credit: { author: string; license: string; licenseUrl: string; source: string };
};

// Freely licensed photos from Wikimedia Commons, stored in static/photos at 1280px wide.
// The dirt is drawn over them in the browser; the image files are unmodified.
export const housePhotos: Record<Stories, HousePhoto> = {
	1: {
		src: '/photos/house-1-story.jpg',
		width: 1280,
		height: 960,
		alt: 'A blue Cape Cod style house with a bay window, rhododendrons and a lawn',
		windows: [
			[324, 409, 20, 97],
			[348, 409, 21, 97],
			[375, 409, 27, 97],
			[411, 409, 29, 97],
			[449, 409, 36, 97],
			[727, 397, 72, 88],
			[816, 397, 85, 88],
			[1143, 149, 19, 144],
			[1120, 400, 20, 91]
		],
		credit: {
			author: 'Famartin',
			license: 'CC BY-SA 4.0',
			licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
			source:
				'https://commons.wikimedia.org/wiki/File:2015-05-17_14_26_04_A_Cape_Cod_style_house_on_Terrace_Boulevard_in_Ewing,_New_Jersey.jpg'
		}
	},
	2: {
		src: '/photos/house-2-story.jpg',
		width: 1280,
		height: 720,
		alt: 'Meredith House, a two-story brick house with dormers in Cambridge, Maryland',
		windows: [
			[511, 144, 43, 83],
			[853, 127, 48, 83],
			[491, 296, 61, 95],
			[664, 291, 64, 99],
			[849, 288, 68, 101],
			[485, 452, 60, 109],
			[849, 453, 68, 113]
		],
		credit: {
			author: 'Preservation Maryland',
			license: 'CC BY-SA 2.0',
			licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
			source: 'https://commons.wikimedia.org/wiki/File:LaGrange,_house_(21577881026).jpg'
		}
	},
	3: {
		src: '/photos/house-3-story.jpg',
		width: 1280,
		height: 855,
		alt: 'Lednum House, a three-story brick house with black shutters in Easton, Maryland',
		windows: [
			[355, 213, 47, 123],
			[488, 191, 51, 124],
			[632, 165, 53, 125],
			[864, 200, 27, 140],
			[1013, 293, 20, 113],
			[341, 433, 47, 117],
			[476, 416, 49, 128],
			[623, 404, 59, 135],
			[860, 429, 33, 141]
		],
		credit: {
			author: 'Bmzuckerman',
			license: 'CC BY 4.0',
			licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
			source:
				'https://commons.wikimedia.org/wiki/File:Add-ons_-_Early_Victorian_(Italianate_on_Federal)_-_Easton,_MD_-_Lednum_House_(1).jpg'
		}
	}
};
