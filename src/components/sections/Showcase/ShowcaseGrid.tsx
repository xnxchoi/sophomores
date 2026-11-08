import './_showcase.scss'

export const ShowcaseGrid = () => {
	return (
		<div className="showcaseGrid list-none p-0 m-0 grow grid" style={{
			boxFlex: 1,
			msFlexPositive: 1,

			gridColumnGap: '20px',
			gridRowGap: '20px',
		}}></div>
	)
}
