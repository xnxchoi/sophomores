'use client'
import {Media} from '@/payload-types'
import {saveImageInfo} from '@/utilities/updatePictureDarkmode'

export const assessImageBrightness = async (pic: Partial<Media> & Pick<Media, 'width' | 'height' | 'id' | 'url'>) => {
	const src = pic.url
	if (!src) throw new Error('No picture url')
	const dark = false
	const w = pic.width, h = pic.height
	if (!w || !h) {
		throw new Error('No picture dimensions')
	}
	const img = document.createElement('img')
	img.src = src
	img.style.display = 'none'
	document.body.appendChild(img)
	let colorSum = 0
	img.onload = function () {
		// create canvas
		const canvas = document.createElement('canvas')
		canvas.width = w
		canvas.height = h

		const ctx = canvas.getContext('2d')!
		ctx.drawImage(img, 0, 0)

		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
		const data = imageData.data
		let r, g, b, avg

		for (let x = 0, len = data.length; x < len; x += 4) {
			r = data[x]
			g = data[x + 1]
			b = data[x + 2]
			avg = Math.floor((r + g + b) / 3)
			colorSum += avg
		}
		const brightness = Math.floor(colorSum / (w * h))
		saveImageInfo({darkmode: brightness < 128, imageID: pic.id}).catch(console.error)
	}
}

function getImageLightness(picture: Media, imageSrc: string, callback: (number) => void) {
	if (typeof picture.height !== 'number' || typeof picture.width !== 'number') {
		return
	}
	const w = picture.width, h = picture.height
	const img = document.createElement('img')
	img.src = imageSrc
	img.style.display = 'none'
	document.body.appendChild(img)
	let colorSum = 0

	img.onload = function () {
		// create canvas
		const canvas = document.createElement('canvas')
		canvas.width = w
		canvas.height = h

		const ctx = canvas.getContext('2d')!
		ctx.drawImage(img, 0, 0)

		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
		const data = imageData.data
		let r, g, b, avg

		for (let x = 0, len = data.length; x < len; x += 4) {
			r = data[x]
			g = data[x + 1]
			b = data[x + 2]
			avg = Math.floor((r + g + b) / 3)
			colorSum += avg
		}

		const brightness = Math.floor(colorSum / (w * h))
		callback(brightness)
	}
}
