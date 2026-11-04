export const SpecSetter = () => {
	return <>
		<TopFrame />
	</>
}
const TopFrame = () => {
	return (
		<div
			className="items-end flex flex-none flex-nowrap gap-[20px] h-min justify-center overflow-visible p-0 relative w-full z-[1]">
			<div
				className="items-start justify-center flex flex-none flex-nowrap flex-col overflow-hidden h-min z-[1] relative w-full p-0"
				style={{
					alignContent: 'flex-start',
					gap: '81px',
				}}>
				<div
					className="items-center flex flex-none flex-col flex-nowrap gap-[10px] h-[1px] w-[1px] overflow-visible justify-center relative p-0" />
			</div>
		</div>
	)
}
