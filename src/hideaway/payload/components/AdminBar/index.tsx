'use client'

import './index.scss'

import {useRouter, useSelectedLayoutSegments} from 'next/navigation'

import React, {useState} from 'react'

import {cn} from '@/lib/utils'
import {getClientSideURL} from '@/hideaway/utilities/getURL'
import type {PayloadAdminBarProps} from '@payloadcms/admin-bar'
import {PayloadAdminBar} from '@payloadcms/admin-bar'

const baseClass = 'admin-bar'

const collectionLabels = {
	pages: {
		plural: 'Pages', singular: 'Page',
	}, posts: {
		plural: 'Posts', singular: 'Post',
	},

}

const Title: React.FC = () => <span>Dashboard</span>

export const AdminBar: React.FC<{
	adminBarProps?: PayloadAdminBarProps
}> = (props) => {
	const {adminBarProps} = props || {}
	const segments = useSelectedLayoutSegments()
	const [show, setShow] = useState(false)
	const collection = (collectionLabels[segments?.[1] as keyof typeof collectionLabels] ? segments[1] : 'pages') as keyof typeof collectionLabels
	const router = useRouter()

	const onAuthChange = React.useCallback((user) => {
		setShow(user?.id)
	}, [])

	return (<div className={cn(baseClass, 'py-2', {
		block: show, hidden: !show,
	})}>
		<div className="container">
			<PayloadAdminBar
				{...adminBarProps} className="py-2" classNames={{
				controls: 'font-medium', logo: '', user: '',
			}} cmsURL={getClientSideURL()} collectionSlug={collection} collectionLabels={{
				plural: collectionLabels[collection]?.plural || 'Pages',
				singular: collectionLabels[collection]?.singular || 'Page',
			}} logo={<Title />} onAuthChange={onAuthChange} onPreviewExit={() => {
				fetch('/next/exit-preview').then(() => {
					router.push('/')
					router.refresh()
				})
			}} style={{
				backgroundColor: 'transparent', padding: 0, position: 'relative', zIndex: 'unset',
			}} />
		</div>
	</div>)
}
