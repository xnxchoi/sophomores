import {Media} from '@/payload-types'
import {stringify} from 'qs-esm'
import {getClientSideURL} from '@/utilities/getURL'

export const saveImageInfo = async (props: {
	imageID: Media['id']; darkmode: boolean;
}) => {
	const {imageID, darkmode} = props
	const stringifiedQuery = stringify({
		where: {
			id: {
				equals: imageID,
			},
		},
	}, {addQueryPrefix: true})

	try {
		const req = await fetch(`${getClientSideURL()}/api/media/${stringifiedQuery}`, {
			method: 'PATCH', credentials: 'include', headers: {
				'Content-Type': 'application/json',
			}, body: JSON.stringify({
				darkmode,
			}),
		})
		if (!req.ok) {
			throw new Error('Error saving image info')
		}

	} catch (err) {
		console.log(err)
	}
}