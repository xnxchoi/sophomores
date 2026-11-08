"use client";

/**
 * Live tuning panel for the beat detector.
 *
 * Mount anywhere on a page (typically the Radio page) during development
 * to get a Leva panel for adjusting the audio analysis in real time. Slider
 * changes write directly to the shared `beatDetectorParams` object that the
 * audio RAF loop reads each tick — no re-renders required, no store wiring.
 *
 * Hide via Leva's default keybind (` h `) or by removing the mount.
 */

import { folder, useControls } from "leva";

import { beatDetectorParams } from "./beatDetectorParams";

export function BeatDetectorControls(): null {
  useControls(
    "Beat Detector",
    {
      "Frequency band": folder(
        {
          lowCutHz: {
            label: "Low cut (Hz)",
            value: beatDetectorParams.lowCutHz,
            min: 20,
            max: 2000,
            step: 5,
            onChange: (v: number) => {
              beatDetectorParams.lowCutHz = v;
            }
          },
          highCutHz: {
            label: "High cut (Hz)",
            value: beatDetectorParams.highCutHz,
            min: 50,
            max: 6000,
            step: 10,
            onChange: (v: number) => {
              beatDetectorParams.highCutHz = v;
            }
          }
        },
        { collapsed: false }
      ),
      "Volume / threshold": folder(
        {
          absoluteFloor: {
            label: "Absolute floor",
            value: beatDetectorParams.absoluteFloor,
            min: 0,
            max: 1,
            step: 0.005,
            onChange: (v: number) => {
              beatDetectorParams.absoluteFloor = v;
            }
          },
          gate: {
            label: "Transient gate",
            value: beatDetectorParams.gate,
            min: 0,
            max: 0.5,
            step: 0.005,
            onChange: (v: number) => {
              beatDetectorParams.gate = v;
            }
          },
          amplify: {
            label: "Amplify",
            value: beatDetectorParams.amplify,
            min: 1,
            max: 25,
            step: 0.1,
            onChange: (v: number) => {
              beatDetectorParams.amplify = v;
            }
          }
        },
        { collapsed: false }
      ),
      "Adaptive baseline": folder(
        {
          baselineRiseAlpha: {
            label: "Rise alpha",
            value: beatDetectorParams.baselineRiseAlpha,
            min: 0,
            max: 0.3,
            step: 0.005,
            onChange: (v: number) => {
              beatDetectorParams.baselineRiseAlpha = v;
            }
          },
          baselineFallAlpha: {
            label: "Fall alpha",
            value: beatDetectorParams.baselineFallAlpha,
            min: 0,
            max: 0.5,
            step: 0.005,
            onChange: (v: number) => {
              beatDetectorParams.baselineFallAlpha = v;
            }
          }
        },
        { collapsed: true }
      ),
      Analyser: folder(
        {
          analyserSmoothing: {
            label: "Smoothing",
            value: beatDetectorParams.analyserSmoothing,
            min: 0,
            max: 0.95,
            step: 0.01,
            onChange: (v: number) => {
              beatDetectorParams.analyserSmoothing = v;
            }
          }
        },
        { collapsed: true }
      )
    },
    { collapsed: false }
  );
  return null;
}
