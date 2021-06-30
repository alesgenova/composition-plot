
/**
 * @packageDocumentation Framework agnostic library to create quaternary composition plots.
 */

export { TernaryPlot } from './plots/ternary';
export { QuaternaryPlot } from './plots/quaternary';
export { Spectrum } from './plots/spectrum';
export { HeatMap } from './plots/heatmap';
export { FastHeatMap } from './plots/fast-heatmap';
export { MultidimensionalPlot, makeCamera } from './plots/multidimensional';
export { ColorMapLegend, CategoryLegend } from './plots/legend';
export { DataProvider, HeatMapDataProvider } from './data-provider';
export { InfoProvider } from './data-provider/info';
export { ISample } from './types';
export { combinations } from './utils/combinations';
export {
  ICompositionToPositionProvider,
  NearestCompositionToPositionProvider,
  AnalyticalCompositionToPositionProvider,
  DataProvider as MultidimensionalDataProvider
} from './data-provider/multidimensional';
export {
  BasePlot, IVertex, verticesFnFactory,
  VerticesFn, PlotTypes, samplePositionFnFactory,
  QuaternaryShellPlot, SampleShape
} from './plots/common';
export { PeriodicTable, Element, TableLayout } from './plots/periodic-table';

import {
  presets,
  getLineColor,
  rgbToHex,
  hexTorgb,
  rgbToString,
} from './utils/colors';

import {
  splineEval,
} from './utils/spline';

const colors = {
  presets,
  getLineColor,
  rgbToHex,
  hexTorgb,
  rgbToString,
}

export { colors };

const spline = {
  splineEval
};

export { spline };
export { samplesToLines, downloadLinesAsCSV } from './utils/csv';
