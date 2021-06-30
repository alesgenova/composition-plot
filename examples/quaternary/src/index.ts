import { ISample } from 'composition-plot';
import { DataProvider } from 'composition-plot/dist/data-provider';
import { QuaternaryShellPlot } from 'composition-plot/dist/plots/common';
import {linearScale, createColorMap, RGBColor} from '@colormap/core';

function getSamples(): Promise<ISample[]> {
  return fetch('samples.json')
    .then(res => res.json())
    .then(samples => Object.values(samples));
}

function filterSamples(samples: ISample[], elements: string[], threshold: number): ISample[] {
  return samples.filter(sample => {
    const fraction = elements.reduce((fraction, element) => {
      return fraction + (sample.composition[element] || 0);
    }, 0);

    return Math.abs(fraction - 1) < threshold;
  });
}

function main() {
  getSamples().then(samples => {
    const compositionSpace = ['A', 'B', 'C', 'D'];
    samples = filterSamples(samples, compositionSpace, 1e-5);
    console.log(samples);
    const dp = new DataProvider(compositionSpace.length);
    dp.setData(samples);
    dp.setActiveAxes(compositionSpace);
    dp.setActiveScalar(compositionSpace[0]);

    const edge = 250;
    const fontSize = 16;
    const margin = 36;
    const spacing = 0.1;
    const hexagonRadius = 1 / Math.sqrt(3) * edge * spacing;

    const container = document.getElementById('plot-container') as HTMLElement;

    // Create a colormap
    const colors: RGBColor[] = [
      [1,0.9,0.9],
      [0.5, 0, 0.5],
      [1,0,0]
    ]
    const colorMap = createColorMap(colors, linearScale([0, 1], [0, 1]));
    const colorFn = (sample: ISample, dp: DataProvider) => {
      const scalar = DataProvider.getSampleScalar(sample, dp.getActiveScalar());
      return colorMap(scalar || 0);
    }

    const plot = new QuaternaryShellPlot(container, dp, 'foo');
    plot.setPlacement(0, 4, spacing, edge, [margin, margin], 1000, margin);
    plot.initialize();
    plot.setSampleRadius(hexagonRadius);
    plot.setColorFn(colorFn);
    plot.dataUpdated();
  });
}

main();