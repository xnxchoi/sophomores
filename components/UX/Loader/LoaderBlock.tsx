import {cn} from '@/lib/utils'
import {ComponentProps} from 'react'

type LoaderBlockProps = ComponentProps<'div'>
export const LoaderBlock = (props: LoaderBlockProps) => {
	const {className, ...rest} = props
	return (
		<div className={cn(
			className,
			"after:clip-sun after:animate-spinner relative after:absolute after:top-[50%] after:left-[50%] after:block after:h-[3.2rem] after:w-[3.2rem] after:origin-[0_0] after:transform-[translate(-50%,-50%)] after:bg-foreground after:opacity-20 after:content-[\"\"]",
		)}
		     {...rest}
		></div>
	)
}
