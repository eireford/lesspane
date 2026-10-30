<!-- Dirt effects shared by every picture of a window. Render once per page; others use url(#…). -->
<svg class="defs" width="0" height="0" aria-hidden="true">
	<defs>
		<!-- Dust and road film: a soft brown haze with blotchy darker patches -->
		<filter id="grime" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
			<feFlood flood-color="#7f7462" flood-opacity="0.48" result="film" />
			<!-- Stretched vertically, so the dirt runs in rain streaks -->
			<feTurbulence type="fractalNoise" baseFrequency="0.035 0.16" numOctaves="4" seed="4" result="noise" />
			<feColorMatrix
				in="noise"
				type="matrix"
				values="0 0 0 0 0.33  0 0 0 0 0.29  0 0 0 0 0.23  2.4 0 0 0 -0.85"
				result="blotches"
			/>
			<feMerge>
				<feMergeNode in="film" />
				<feMergeNode in="blotches" />
			</feMerge>
			<feComposite in2="SourceAlpha" operator="in" />
		</filter>
		<!-- Hard-water spots: scattered pale mineral specks -->
		<filter id="mineral" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
			<feTurbulence type="turbulence" baseFrequency="0.45" numOctaves="1" seed="9" result="noise" />
			<feColorMatrix
				in="noise"
				type="matrix"
				values="0 0 0 0 0.96  0 0 0 0 0.95  0 0 0 0 0.9  0 0 0 7 -4.4"
			/>
			<feComposite in2="SourceAlpha" operator="in" />
		</filter>
		<radialGradient id="smear">
			<stop offset="0" stop-color="#f1ede4" stop-opacity="0.45" />
			<stop offset="1" stop-color="#f1ede4" stop-opacity="0" />
		</radialGradient>
		<pattern id="mesh" width="2.5" height="2.5" patternUnits="userSpaceOnUse">
			<path d="M0 0H2.5M0 0V2.5" stroke="#2c2c28" stroke-width="0.5" opacity="0.45" />
		</pattern>
	</defs>
</svg>

<style>
	.defs {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
	}
</style>
