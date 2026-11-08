"use server";
import {getPayload} from "@/lib/payload";
import {DateTime} from "luxon";

/***
 * What we get from fetch:
 * @example
 * (응답) [{"result":1,"cur_unit":"AED","ttb":"288.78","tts":"294.61","deal_bas_r":"291.7","bkpr":"291","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"291","kftc_deal_bas_r":"291.7","cur_nm":"아랍에미리트 디르함"},"result":1,"cur_unit":"ATS","ttb":"0","tts":"0","deal_bas_r":"93.52","bkpr":"0","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"0","kftc_deal_bas_r":"93.52","cur_nm":"오스트리아 실링"},{"result":1,"cur_unit":"AUD","ttb":"827.91","tts":"844.64","deal_bas_r":"836.28","bkpr":"836","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"836","kftc_deal_bas_r":"836.28","cur_nm":"호주 달러"},{"result":1,"cur_unit":"BEF","ttb":"0","tts":"0","deal_bas_r":"31.9","bkpr":"0","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"0","kftc_deal_bas_r":"31.9","cur_nm":"벨기에 프랑"},{"result":1,"cur_unit":"BHD","ttb":"2,811.48","tts":"2,868.27","deal_bas_r":"2,839.88","bkpr":"2,839","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"2,839","kftc_deal_bas_r":"2,839.88","cur_nm":"바레인 디나르"},{"result":1,"cur_unit":"CAD","ttb":"844.72","tts":"861.79","deal_bas_r":"853.26","bkpr":"853","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"853","kftc_deal_bas_r":"853.26","cur_nm":"캐나다 달러"},{"result":1,"cur_unit":"CHF","ttb":"1,088.44","tts":"1,110.43","deal_bas_r":"1,099.44","bkpr":"1,099","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"1,099","kftc_deal_bas_r":"1,099.44","cur_nm":"스위스 프랑"},{"result":1,"cur_unit":"CNH","ttb":"162.01","tts":"165.28","deal_bas_r":"163.65","bkpr":"163","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"163","kftc_deal_bas_r":"163.65","cur_nm":"위안화"},{"result":1,"cur_unit":"DEM","ttb":"0","tts":"0","deal_bas_r":"657.98","bkpr":"0","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"0","kftc_deal_bas_r":"657.98","cur_nm":"독일 마르크"},{"result":1,"cur_unit":"DKK","ttb":"171.14","tts":"174.59","deal_bas_r":"172.87","bkpr":"172","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"172","kftc_deal_bas_r":"172.87","cur_nm":"덴마아크 크로네"},{"result":1,"cur_unit":"ESP(100)","ttb":"0","tts":"0","deal_bas_r":"773","bkpr":"0","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"0","kftc_deal_bas_r":"773","cur_nm":"스페인 페세타"},{"result":1,"cur_unit":"EUR","ttb":"1,274.04","tts":"1,299.77","deal_bas_r":"1,286.91","bkpr":"1,286","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"1,286","kftc_deal_bas_r":"1,286.91","cur_nm":"유로"},{"result":1,"cur_unit":"FIM","ttb":"0","tts":"0","deal_bas_r":"216.44","bkpr":"0","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"0","kftc_deal_bas_r":"216.44","cur_nm":"핀란드 마르카"},{"result":1,"cur_unit":"FRF","ttb":"0","tts":"0","deal_bas_r":"196.18","bkpr":"0","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"0","kftc_deal_bas_r":"196.18","cur_nm":"프랑스 프랑"},{"result":1,"cur_unit":"GBP","ttb":"1,432.82","tts":"1,461.77","deal_bas_r":"1,447.3","bkpr":"1,447","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"1,447","kftc_deal_bas_r":"1,447.3","cur_nm":"영국 파운드"},{"result":1,"cur_unit":"HKD","ttb":"135.75","tts":"138.5","deal_bas_r":"137.13","bkpr":"137","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"137","kftc_deal_bas_r":"137.13","cur_nm":"홍콩 달러"},{"result":1,"cur_unit":"IDR(100)","ttb":"7.82","tts":"7.97","deal_bas_r":"7.9","bkpr":"7","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"7","kftc_deal_bas_r":"7.9","cur_nm":"인도네시아 루피아"},{"result":1,"cur_unit":"ITL(100)","ttb":"0","tts":"0","deal_bas_r":"66.46","bkpr":"0","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"0","kftc_deal_bas_r":"66.46","cur_nm":"이태리 리라"},{"result":1,"cur_unit":"JPY(100)","ttb":"941.53","tts":"960.56","deal_bas_r":"951.05","bkpr":"951","yy_efee_r":"0.96833","ten_dd_efee_r":"0.0242","kftc_bkpr":"951","kftc_deal_bas_r":"951.05","cur_nm":"일본 옌"},{"result":1,"cur_unit":"KRW","ttb":"0","tts":"0","deal_bas_r":"1","bkpr":"1","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"1","kftc_deal_bas_r":"1","cur_nm":"한국 원"},{"result":1,"cur_unit":"KWD","ttb":"3,509.87","tts":"3,580.78","deal_bas_r":"3,545.33","bkpr":"3,545","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"3,545","kftc_deal_bas_r":"3,545.33","cur_nm":"쿠웨이트 디나르"},{"result":1,"cur_unit":"MYR","ttb":"262.09","tts":"267.38","deal_bas_r":"264.74","bkpr":"264","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"264","kftc_deal_bas_r":"264.74","cur_nm":"말레이지아 링기트"},{"result":1,"cur_unit":"NLG","ttb":"0","tts":"0","deal_bas_r":"583.97","bkpr":"0","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"0","kftc_deal_bas_r":"583.97","cur_nm":"네델란드 길더"},{"result":1,"cur_unit":"NOK","ttb":"129.44","tts":"132.05","deal_bas_r":"130.75","bkpr":"130","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"130","kftc_deal_bas_r":"130.75","cur_nm":"노르웨이 크로네"},{"result":1,"cur_unit":"NZD","ttb":"752.76","tts":"767.97","deal_bas_r":"760.37","bkpr":"760","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"760","kftc_deal_bas_r":"760.37","cur_nm":"뉴질랜드 달러"},{"result":1,"cur_unit":"SAR","ttb":"282.84","tts":"288.55","deal_bas_r":"285.7","bkpr":"285","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"285","kftc_deal_bas_r":"285.7","cur_nm":"사우디 리얄"},{"result":1,"cur_unit":"SEK","ttb":"129.3","tts":"131.91","deal_bas_r":"130.61","bkpr":"130","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"130","kftc_deal_bas_r":"130.61","cur_nm":"스웨덴 크로나"},{"result":1,"cur_unit":"SGD","ttb":"793.06","tts":"809.09","deal_bas_r":"801.08","bkpr":"801","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"801","kftc_deal_bas_r":"801.08","cur_nm":"싱가포르 달러"},{"result":1,"cur_unit":"THB","ttb":"32.57","tts":"33.22","deal_bas_r":"32.9","bkpr":"32","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"32","kftc_deal_bas_r":"32.9","cur_nm":"태국 바트"},{"result":1,"cur_unit":"USD","ttb":"1,056.23","tts":"1,077.56","deal_bas_r":"1,066.9","bkpr":"1,066","yy_efee_r":"2.69465","ten_dd_efee_r":"0.07485","kftc_bkpr":"1,071","kftc_deal_bas_r":"1,071.4","cur_nm":"미국 달러"},{"result":1,"cur_unit":"XOF","ttb":"0","tts":"0","deal_bas_r":"1.9618","bkpr":"0","yy_efee_r":"0","ten_dd_efee_r":"0","kftc_bkpr":"0","kftc_deal_bas_r":"1.9618","cur_nm":"씨에프에이 프랑(비씨에이오)"}]


 */
export interface ExchangeRate {
	result: number;
	cur_unit: string;
	ttb: string;
	tts: string;
	deal_bas_r: string;
	bkpr: string;
	yy_efee_r: string;
	ten_dd_efee_r: string;
	kftc_bkpr: string;
	kftc_deal_bas_r: string;
	cur_nm: string;
}

export const getExchangeRateExternal = async (date: string) => {
	const formattedDate = DateTime.fromISO(date).toFormat("yyyyMMdd");
	console.log(formattedDate);
	const fxURI = `${process.env.NEXT_PUBLIC_EXCHANGE_RATE_URL}?authkey=${encodeURIComponent(
		process.env.EXCHANGE_RATE_API_KEY)}&data=AP01&searchdate=${formattedDate}`;
	const response = await fetch(fxURI);
	if (!response.ok) {
		throw new Error("exchange rate api call failed");
	}
	const data = (await response.json()) as ExchangeRate[] | null;
	if (!data || data.length === 0) {
		throw new Error("exchange rate api call failed");
	}
	return data.map((item: ExchangeRate) => ({
		currency: item.cur_unit,
		rate: item.deal_bas_r,
		kr_nm: item.cur_nm,
	}));
};
export const getExchangeRate = async (date: string, currency: string) => {
	const rates = await getExchangeRates(date).catch((err) => {
		console.error(err);
		return [] as { currency: string; rate: string }[];
	});
	const returnRate = rates.find((r) => r.currency === currency)?.rate || null;
	if (!returnRate) {
		throw new Error(
			`We're sorry, the ${currency} exchange rate is not supported. This could be an error from ${date} being an invalid date, or a holiday; It could also be that the currency is not supported. Please try again with a different date or currency.`,
		);
	}
	return returnRate;
};
export const getExchangeRates = async (date: string) => {
	const payload = await getPayload();
	let data = await payload.find({
		collection: "exchange-rate",
		where: {
			date: {
				equals: date,
			},
		},
		limit: 1,
		select: {
			rates: true,
		},
	}).then(
		(res) =>
			(res?.totalDocs > 0 &&
				res.docs.at(0)!.rates.map((r) => ({
					currency: r.currency,
					rate: r.rate,
				}))) ||
			[],
	).catch((err) => {
		console.error(err);
		return [] as { currency: string; rate: string }[];
	});
	if (data.length === 0) {
		const externalData = await getExchangeRateExternal(date);
		const toCreate: { name: string; slug: string; kr_nm: string }[] = [];
		for (const rate of externalData) {
			const exists = await payload.count({
				collection: "currency",
				where: {
					name: {
						equals: rate.currency,
					},
				},
			}).then((res) => res.totalDocs > 0);
			if (!exists) {
				toCreate.push({
					name: rate.currency,
					slug: rate.currency,
					kr_nm: rate.kr_nm,
				});
			}
		}
		if (toCreate.length > 0) {
			for (const currency of toCreate) {
				await payload.create({
					collection: "currency",
					data: currency,
				}).catch((err) => {
					console.error(err);
				});
			}
		}
		data = await payload.create({
			collection: "exchange-rate",
			data: {
				date,
				rates: externalData.map((r) => ({
					currency: r.currency,
					rate: r.rate,
				})),
			},
		}).then((res) =>
			res.rates.map((r) => ({currency: r.currency, rate: r.rate})),
		).catch((err) => {
			console.error(err);
			return [] as { currency: string; rate: string }[];
		});
		if (data.length > 0) {
			return data;
		}
		throw new Error("exchange rate api call failed");
	}
	return data;
};
