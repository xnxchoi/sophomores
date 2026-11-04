export const isInternalLink = (href: string) => {
	const domain = process.env.NEXT_PUBLIC_SERVER_URL

	// Regex to match relative links or absolute links for your domain and its subdomains (including www.)
	const internalLinkRegex = new RegExp(
		`^(\\/|https?:\\/\\/(?:www\\.|[a-zA-Z0-9-]+\\.)?${domain.replace(
			/\./g,
			'\\.',
		)}(\\/|$))`, 'i', // Case insensitive
	)
	return internalLinkRegex.test(href)
}
