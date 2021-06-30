import {
  viridis,
  plasma,
  inferno,
  magma,
  cividis,
  jet,
  rainbow,
  Greys,
  Purples,
  Blues,
  Greens,
  Oranges,
  Reds,
  gnuplot,
  gnuplot2,
  bwr,
} from './presets';
import { RGBColor } from '@colormap/core';
import { isNil } from 'lodash-es';

export const presets = {
  viridis,
  plasma,
  inferno,
  magma,
  cividis,
  jet,
  rainbow,
  Greys,
  Purples,
  Blues,
  Greens,
  Oranges,
  Reds,
  gnuplot,
  gnuplot2,
  bwr,
};

export function* getLineColor(colors: RGBColor[]): Generator<RGBColor> {
  let i = 0;
  while(true) {
    let colorIndex = i % colors.length;
    yield colors[colorIndex];
    i++;
  }
}

export function rgbToHex(r: number, g: number, b: number) : string {
  const red = numToHex(Math.floor(r * 255));
  const green = numToHex(Math.floor(g * 255));
  const blue = numToHex(Math.floor(b * 255));
  return red + green + blue;
};

export function hexTorgb(hex: string) : [number, number, number] {
  if (hex.length !== 6) {
    return [0, 0, 0];
  }
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);
  return [r / 255, g / 255, b / 255];
}

function numToHex(n: number) : string {
  let hex = Number(n).toString(16);
  if (hex.length < 2) {
       hex = "0" + hex;
  }
  return hex;
};

export function rgbToString(r: number, g: number, b: number, a?: number) {
  if (isNil(a)) {
    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
  }
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
}
