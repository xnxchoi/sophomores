"use server";
import {getPayload} from "@/lib/payload";
import {DateTime} from "luxon";

export const getWorkDay = async () => {
	const date = await getNonHoliday(DateTime.now().setZone("Asia/Seoul"));
	return date.toFormat("yyyyMMdd");
};
const getNonHoliday = async (dateInput: DateTime) => {
	let date = dateInput;
	let holidays = await getHolidays(date);
	let lastDate = date;
	console.log(holidays);
	if (holidays === -1) {
		throw new Error("holiday api call failed");
	}
	let isHoliday = holidays.some(
		(holiday) => holiday.date === date.toFormat("yyyyMMdd"),
	);
	let maxTry = 10;
	while (isHoliday && maxTry > 0) {
		date =
			holidays === -1 ? date.minus({months: 1}) : date.minus({days: 1});
		if (lastDate.month !== date.month || lastDate.year !== date.year) {
			holidays = await getHolidays(date);
		}
		lastDate = date;
		isHoliday =
			holidays === -1
				? true
				: (maxTry--,
					holidays.some(
						(holiday) => holiday.date === date.toFormat("yyyyMMdd"),
					));
	}
	if (maxTry === 0 && isHoliday) {
		throw new Error(
			"we're experiencing a problem with the api, please try again later",
		);
	}
	return date;
};
const getHolidays = async (
	date: DateTime,
): Promise<Array<{ date: string; name: string }> | -1> => {
	const year = date.year;
	const month = date.month;
	let sonth = `${month}`;

	if (month < 10) {
		sonth = `0${month}`;
	} else {
		sonth = `${month}`;
	}
	const period = parseInt(`${year}${sonth}`, 10);

	const payload = await getPayload();
	let holidays: Array<{ date: string; name: string }> | -1 = await payload.find({
		collection: "holidays",
		where: {
			period: {
				equals: period,
			},
		},
		limit: 1,
		select: {
			dates: true,
		},
	}).then((res) => res.docs.reduce((acc, doc) => [...acc, ...doc.dates], [])).catch((err) => {
		console.error(err);
		return -1;
	});
	if (holidays === -1) {
		const res = await fetch(
			`${process.env.NEXT_PUBLIC_HOLIDAY_API_URL}?ServiceKey=${encodeURIComponent(
				process.env.HOLIDAY_API_KEY)}&solYear=${year}&solMonth=${sonth}&_type=json&numOfRows=100`,
		);
		if (res.ok) {
			const data = (await res.json()) as {
				resultCode: string;
				resultMsg: string;
				Item: Array<{
					locDate: string | number;
					seq: number;
					dateKind: string;
					isHoliday: any;
					dateName: string;
				}>;
				totalCount: number;
				pageNo: number;
				numOfRows: number;
			};
			console.log(data);

			const holidates =
				data.Item.flatMap((item) =>
					item.isHoliday === "Y"
						? [
							{
								date: `${item.locDate}`,
								name: item.dateName,
							},
						]
						: [],
				) || [];
			holidays = await payload.create({
				collection: "holidays",
				data: {
					period,
					dates: holidates,
					country: "KR",
				},
			}).then((res) => res.dates);
		} else {
			return -1;
		}
	}
	return holidays;
};
