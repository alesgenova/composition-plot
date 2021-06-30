import { ISample } from 'composition-plot';
import { MultidimensionalPlot } from 'composition-plot/dist/plots/multidimensional';
import {DataProvider as MultidimensionalDataProvider, AnalyticalCompositionToPositionProvider} from 'composition-plot/dist/data-provider/multidimensional';
import {RGBColor} from '@colormap/core';

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
    console.log(samples);
    const dp = new MultidimensionalDataProvider(compositionSpace.length);
    dp.setData(samples);
    // dp.setActiveScalar(compositionSpace[0]);
    const compositionToPosition = new AnalyticalCompositionToPositionProvider();

    const edge = 250;
    const fontSize = 16;
    const margin = 36;
    const spacing = 0.1;
    const hexagonRadius = 1 / Math.sqrt(3) * edge * spacing;

    const container = document.getElementById('root') as HTMLElement;

    // Create a colormap
    const colors: RGBColor[] = [
      [1,0.9,0.9],
      [0.5, 0, 0.5],
      [1,0,0]
    ];

    const plot = new MultidimensionalPlot(container, dp, compositionToPosition);
    plot.setCompositionSpace(compositionSpace);
    plot.setColorMap(colors, [0, 1]);
    plot.setBackground('#fafafa');
    plot.dataUpdated();
  });
}

main();