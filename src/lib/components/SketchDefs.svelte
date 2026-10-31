<!-- Pencil effects shared by every sketch on the page. Render once; drawings refer to them with url(#…). -->
<svg class="defs" width="0" height="0" aria-hidden="true">
	<defs>
		<!-- Wobble straight lines a little so they read as drawn by hand. Two seeds for a doubled stroke. -->
		<filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
			<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
		</filter>
		<filter id="pencil2" x="-5%" y="-5%" width="110%" height="110%">
			<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
		</filter>
		<!-- Watercolor: soft wobbly edges so fills look painted, not printed -->
		<filter id="wash" x="-5%" y="-5%" width="110%" height="110%">
			<feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="7" result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" result="d" />
			<feGaussianBlur in="d" stdDeviation="0.7" />
		</filter>
		<!-- Dirt: dense diagonal pencil hatching -->
		<pattern id="hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
			<line x1="0" y1="0" x2="0" y2="3.2" stroke="#5d564a" stroke-width="0.9" />
		</pattern>
		<!-- Roofs: light, wide hatching for a bit of shade -->
		<pattern id="shade" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-50)">
			<line x1="0" y1="0" x2="0" y2="6" stroke="#8a8478" stroke-width="0.7" />
		</pattern>
		<!-- Screens: fine cross-hatch -->
		<pattern id="mesh" width="3" height="3" patternUnits="userSpaceOnUse">
			<path d="M0 0H3M0 0V3" stroke="#5d564a" stroke-width="0.45" />
		</pattern>
		<!-- Hard water: little pencil rings -->
		<pattern id="spots" width="9" height="8" patternUnits="userSpaceOnUse">
			<circle cx="2.5" cy="2.5" r="1.1" fill="none" stroke="#5d564a" stroke-width="0.6" />
			<circle cx="7" cy="6" r="0.8" fill="none" stroke="#5d564a" stroke-width="0.6" />
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
