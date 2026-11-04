const originalWarn = console.warn
console.warn = (message) => {
	if (message.includes('rafz whilst frameLoop is not set as demand')) {
		return
	}
	originalWarn(message)
}
