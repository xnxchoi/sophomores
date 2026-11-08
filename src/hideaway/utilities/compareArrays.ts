export const arraysEqualContents = <T>(array1: T[], array2: T[]) => {
	const arr1Set = new Set(array1);
	const arr2Set = new Set(array2);
	const arraysAreDifferent = (
		arr1Set.size === arr2Set.size &&
		array1.every(item => arr2Set.has(item))

	);
	return arraysAreDifferent;
}