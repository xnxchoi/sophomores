import {v7 as uuidv7} from "uuid";

/**
 * Loops through the intersecting pixels of an image with text, and calculate the avarage brightness
 *
 * @param {object} imageData - data & pixels
 * @param {function} cb - Callback when the calculation is done
 */

let brightnessWorker: Worker;
const brightnessWorkerCB: Record<string, (mean: number) => void> = {};

export const calculateBrightness = ({data, pixels}: {
	data: ImageData["data"];
	pixels: number
}, cb: (mean: number) => void) => {
	if (!brightnessWorker) {
		brightnessWorker = new Worker("/scripts/brightness.worker.js");

		brightnessWorker.addEventListener("message", (event) => {
			const {mean, uid} = event.data || {};
			const action = brightnessWorkerCB[uid];

			if (!action) return;

			delete brightnessWorkerCB[uid];
			action(mean);
		});
	}

	const uid = uuidv7();
	brightnessWorkerCB[uid] = cb;
	brightnessWorker.postMessage({data, pixels, uid});
};
