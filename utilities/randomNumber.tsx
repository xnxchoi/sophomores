 export const randomNumber = (min: number, max: number): number => {
	let last = -1;
	const uInt32 = new Uint32Array(1);
	const rand = crypto.getRandomValues(uInt32)[0]!;
	const rnd = (min + ((max - min + 1) * rand) / 2 ** 32) | 0;
	if (rnd === last) {
		return randomNumber(min, max);
	} else {
		last = rnd;
		return rnd;
	}
};
