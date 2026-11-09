import {randomNumber} from "./randomNumber"
import {init} from "@paralleldrive/cuid2"
import {cache} from "react";

const extractKeywords = (input: string) => {
	const needles = ['a', 'an', 'the',]
	const considered = ['across', 'after', 'upon', 'versus', 'against', 'but', 'by', 'for', 'from',
		'in', 'of', 'on', 'per', 'than', 'to', 'and', 'or', 'but', 'as', 'at', 'until', 'up', 'via',
		'long', 'along', 'amid', 'among', 'anti', 'before', 'aboard', 'about', 'around', 'behind',
		'below', 'beneath', 'beside', 'besides', 'between', 'beyond', 'concerning', 'considering',
		'despite', 'down', 'during', 'except', 'excepting', 'without', 'excluding', 'following',
		'inside', 'into', 'like', 'minus', 'near', 'opposite', 'outside', 'over', 'plus',
		'regarding', 'round', 'save', 'since', 'through', 'toward', 'towards', 'under',
		'underneath', 'unlike', 'with', 'within']
	const needlesString = needles.join('|')

	const pattern = new RegExp(`(?:(?:\\b(?:${needlesString})\\b(?:\\W(?:${needlesString})\\b)*))`,
		'g')
	const haystack = input.replace(pattern, ' ').split(' ')
	const keywords = haystack.filter(word => !considered.includes(word))
	const rest = haystack.filter(word => considered.includes(word))
	let toReturn = ''
	if (keywords.length > 0) {
		const randomIndex = randomNumber(0, keywords.length - 1)
		if (keywords.length > 1) {
			let anotherIndex = randomNumber(0, keywords.length - 1)
			while (anotherIndex === randomIndex) {
				anotherIndex = randomNumber(0, keywords.length - 1)
			}
			toReturn += keywords.slice(randomIndex, randomIndex + 1).
				join(' ') + '-' + keywords.slice(anotherIndex, anotherIndex + 1).join(' ')
		} else {
			toReturn += keywords[randomIndex]! + '-' + rest[randomNumber(0, rest.length - 1)]!
		}
	}
	if (toReturn.length === 0) {
		if (rest.length > 0) {
			toReturn += rest[randomNumber(0, rest.length - 1)]!
		}
	}
	return toReturn
}
export const createCuid = init({
	length: 12,
})