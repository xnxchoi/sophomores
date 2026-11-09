import {capitalize, startCase} from "lodash-es";
import {isHangul} from "@/hideaway/utilities/rp_utils";

export const sanitizeNameValues = (input: string) => {
	const nameRegex =
		/^(?!.*(--|''|’’|\s{2,}|-'|'–|–'| -| -|' |' ))(?![-'’ ])[\p{L}]+(?:[-'’ ][\p{L}]+)*(?<![-'’ ])$/iu;
	const toReturn = input.normalize("NFKC") // Normalize unicode
		.replace(/[^\p{L}\s\-’']/gu, "") // Remove non-letter, non-punctuation
		.replace(
			/[\-’']+/g,
			(match) => (match.length > 1 && match.slice(0, 1)) || match,
		) // Collapse repeated hyphens/apostrophes
		.replace(/(\s+)/g, " ") // Collapse multiple spaces
		.replace(/(^[\-’'\s]+|[\-’'\s]+$)/g, " ") // Trim leading/trailing special chars
		.replace(/([\-’'] )|( [\-’'])/g,
			(match) => match.trim()) // Disallow space-hyphen or hyphen-space
		.replace(/(--|''|’’)/g, " ") // Remove forbidden combos
		.replace(/(?<=\p{L})[-’'\s]{2,}(?=\p{L})/gu, " "); // Collapse excessive spacing or punctuation inside

	return isHangul(toReturn) ? toReturn : startCase(toReturn);

};

export function sanitizeName(input: string): string {
	return input.normalize('NFKC')
		// 1. Remove disallowed characters (keep letters, space, hyphen, apostrophes)
		.replace(/[^\p{L}\s\-’']/gu, '')

		// 2. Collapse repeated separators
		.replace(/[-’']{2,}/g,
			match => ((match && match.length > 1) ? match.at(0)! : ''))  // '--' → '-', "''" → "'"
		.replace(/\s{2,}/g, ' ')                   // Multiple spaces → one space

		// 3. Disallow invalid space/punctuation combos (e.g. " -", "- ")
		.replace(/(?: ?[-’'] ?)+/g, match => {
			// Normalize all such groups to one separator with no surrounding space
			const char = match.trim().charAt(0);
			return ` ${char} `;
		})

		// 4. Collapse multiple internal separators to single instances
		.replace(/ +([-’']) +/g, ' $1 ')           // preserve spacing around valid separators
		.replace(/\s{2,}/g, ' ')                   // remove any double spaces again

		// 5. Trim outer spaces and separators
		.replace(/^[-’'\s]+|[-’'\s]+$/g, '')

		// 6. Remove forbidden inner patterns
		.replace(/(--|''|’’)/g, '');
}

export function sanitizeNameLite(input: string): string {
	return input.normalize("NFKC") // Normalize unicode
		.replace(/[^\p{L}\s\-’']/gu, "") // Remove non-letter, non-punctuation
		.replace(
			/[\-’']+/g,
			(match) => (match.length > 1 && match.slice(0, 1)) || match,
		) // Collapse repeated hyphens/apostrophes
		.replace(/\s+/g, " ") // Collapse multiple spaces
}
