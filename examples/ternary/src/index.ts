import { ISample } from 'composition-plot';
import { DataProvider } from 'composition-plot/dist/data-provider';
import { BasePlot, verticesFnFactory, samplePositionFnFactory, PlotTypes } from 'composition-plot/dist/plots/common';
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
    const compositionSpace = ['A', 'B', 'C'];
    samples = filterSamples(samples, compositionSpace, 1e-5);
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
    const verticesFn = verticesFnFactory(PlotTypes.TernaryUp, [margin, margin], edge, fontSize);
    const scales = compositionSpace.map(_ => linearScale([0,1], [0,1]));
    const samplePositionFn = samplePositionFnFactory(PlotTypes.TernaryUp, verticesFn, scales, 250, dp);

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

    const plot = new BasePlot(container, dp, 'foo');
    plot.verticesFn = verticesFn;
    plot.samplePositionFn = samplePositionFn;
    plot.setColorFn(colorFn);
    plot.setSampleRadius(hexagonRadius);
    plot.render();
  });
}

main();