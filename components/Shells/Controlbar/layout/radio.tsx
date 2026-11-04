'use client'


export const RadioLayout: React.FC = () => {
	return (<div className="menu-float__layout menu-float__layout--radio is-closed"
	             style={{opacity: 1, visibility: 'inherit'}}>
		<div className="menu-float__content">
			<div className="menu-float__item">
				<div className="menu-float__radio-container">
					<div className="reel">
						<div className="radio song-container marquee__inner" aria-hidden="true"
						     style={{opacity: 1, visibility: 'inherit'}}>
							<div className="songName bricks-lazy-hidden"
							     style={{opacity: 1, visibility: 'inherit', width: 108}}>
								<div style={{
									position: 'absolute',
									display: 'block',
									left: 0,
									top: 0,
									width: 65,
									height: 32,
								}}>
									HIDEAWAY
								</div>
								­{' '}
								<div style={{
									position: 'absolute',
									display: 'block',
									left: 67,
									top: 0,
									width: 42,
									height: 32,
								}}>
									RADIO
								</div>
							</div>
							<div className="songName"
							     style={{opacity: 1, visibility: 'inherit', width: 108}}>
								<div style={{
									position: 'absolute',
									display: 'block',
									left: 115,
									top: 0,
									width: 65,
									height: 32,
								}}>
									HIDEAWAY
								</div>
								­{' '}
								<div style={{
									position: 'absolute',
									display: 'block',
									left: 182,
									top: 0,
									width: 42,
									height: 32,
								}}>
									RADIO
								</div>
							</div>
							<div className="songName"
							     style={{opacity: 1, visibility: 'inherit', width: 108}}>
								<div style={{
									position: 'absolute',
									display: 'block',
									left: 231,
									top: 0,
									width: 65,
									height: 32,
								}}>
									HIDEAWAY
								</div>
								­{' '}
								<div style={{
									position: 'absolute',
									display: 'block',
									left: 298,
									top: 0,
									width: 42,
									height: 32,
								}}>
									RADIO
								</div>
							</div>
						</div>
					</div>
					<div className="artist-container" style={{opacity: 1, visibility: 'inherit'}}>
						TUNE IN
					</div>
				</div>
			</div>
			<div className="control">
				<div className="play control--item" aria-label="Play / Pause">
					<svg xmlns="http://www.w3.org/2000/svg" width={17} height={17}
					     viewBox="0 0 45 45">
						{' '}
						<path
							d="m16.95,7.79l17.2,14.57c.7.6.7,1.68,0,2.27l-17.2,14.57c-.97.82-2.45.13-2.45-1.14V8.93c0-1.27,1.48-1.96,2.45-1.14Z"
							fill="currentColor" strokeWidth={0} />
					</svg>
				</div>
			</div>
		</div>
	</div>)
}
