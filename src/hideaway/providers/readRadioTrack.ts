"use server"
import {parseFile} from "music-metadata";

export async function readRadioTrack({url}: { url: string }) {
	const metadata = await parseFile(url, {
		duration: true,
	})
	return metadata || null
}