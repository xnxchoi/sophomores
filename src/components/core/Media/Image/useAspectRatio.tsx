"use client";

import {cssVariables} from "@/cssVariables";
import {useRPStore} from "@/providers/RP_Pro";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useShallow} from "zustand/shallow";
import type {AspectRatio, ViewportSizes} from "../types";
import {useMotionValue} from "motion/react";

export const useAspectRatio = (aspect: AspectRatio) => {

	const baseValue = useMemo(() =>
			typeof aspect === "number" ? aspect : aspect.base
		, [aspect])

	const mappedValues = useMemo(() => {
		const map = new Map<ViewportSizes | "default", number>();
		switch (typeof aspect) {
			case "number":
				map.set("default", aspect);
				break;
			case "object":
				Object.entries(aspect).forEach(([key, value]) => {
					key === "base" ? map.set("default", value) : map.set(key as ViewportSizes, value);
				})
				break;
		}
		return map;
	}, [aspect])
	const viewportSizes = useMemo(() => {
		const breakP: [ViewportSizes, number][] = [];
		Object.entries(cssVariables.breakpoints).forEach(([k, v]) => {
			const r = k as ViewportSizes;
			if (mappedValues.has(r)) {
				const t = [r, v] as [ViewportSizes, number];
				breakP.push(t);
			}
		});
		return breakP.toSorted(([a, b], [c, d]) => b - d)
	}, [mappedValues])

	const viewportWidthToAspectValue = useCallback((size: ViewportSizes) => {
		if (viewportSizes.length === 0) return baseValue
		const width = cssVariables.breakpoints[size];
		//filter for only the viewport sizes that are larger or equal to the current width
		//find the smallest viewport size of the filtered list that is largerthan the current width
		const targetArrray = viewportSizes.filter(([name, viewsize]) => width <= viewsize).toSorted(([a, b], [c, d]) => b - d);
		if (targetArrray.length < 1) return baseValue;
		const targetSize = targetArrray[0]![0];
		return mappedValues.get(targetSize) || baseValue;
	}, [baseValue, mappedValues, viewportSizes])

	const viewportSize = useRPStore(useShallow((r) => r.viewportSize));

	const [aspectRatio, setAr] = useState(baseValue);
	const paddingTop = useMotionValue(
		`${aspectRatio ? (1 / aspectRatio) * 100 : 0}%`
	);
	useEffect(() => {
		if (viewportSizes.length > 0) {
			const newVal = viewportWidthToAspectValue(viewportSize)
			setAr(newVal)
			paddingTop.set(
				`${newVal ? (1 / newVal) * 100 : 0}%`
			);
        }
	}, [paddingTop, viewportSize, viewportSizes, viewportWidthToAspectValue])

	return {aspectRatio, paddingTop}
};
