'use server'
import configPromise from '@payload-config'
import {getPayload, Where} from 'payload'
import type {Config} from '@/payload-types'

export type Collection = keyof Config['collections']

export async function getDocument(collection: Collection, slug: string, depth = 0) {
	const id = slug.includes('-') ? slug.split('-')[1] : slug
	const payload = await getPayload({config: configPromise})
	if (collection === 'users') {
		const user = await payload.find({
			collection: 'users',
			where: {
				or: [
					{
						id: {
							equals: id
						}
					},
					{
						slug: {
							equals: slug
						}
					}
				]
			}
		}).then(r => r.docs[0] ?? null).catch(e => (console.error(e), null))
		return user
	} else {
		const page = await payload.find({
			collection,
			depth,
			where: {
				or: [
					{
						id: {
							equals: id
						}
					},
					{
						slug: {
							equals: slug
						}
					}
				]
			}
		}).then(r => r.docs[0] ?? null).catch(e => (console.error(e), null))
		return page
	}


}


