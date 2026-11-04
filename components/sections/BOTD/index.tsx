'use client'
import * as m from 'motion/react-m'

export const BOTD = () => {
	return <m.div initial={{opacity: 0, y: -20}}
	              whileInView={{opacity: 1, y: 0, transition: {duration: 0.3, ease: 'easeInOut'}}}
	              viewport={{once: true}}>
		<svg xmlns="http://www.w3.org/2000/svg" width="349" height="83" preserveAspectRatio="none">
			<path
				d="M348.832 82.06a19.997 19.997 0 0 1-9.801-8.503L302.118 9.96A20.001 20.001 0 0 0 284.82 0H20C8.954 0 0 8.954 0 20v72.007-9.947h348.832z"
				fill="var(--faded-fg)" fill-rule="evenodd"/>
		</svg>
	</m.div>
}