export function storageAvailable(type: 'sessionStorage' | 'localStorage') {
	let storage
	try {
		storage = window[type]
		const x = '__storage_test__'
		storage.setItem(x, x)
		storage.removeItem(x)
		return true
	} catch (e) {
		if (e instanceof DOMException) {
			let b = e.name === 'QuotaExceededError'
			if (b) {
				if (storage) {
					if (storage.length !== 0) {
						return true
					}
				}
			}
		}
		//return (e instanceof DOMException && e.name === 'QuotaExceededError' && storage && storage.length !== 0)
		return false
	}
}