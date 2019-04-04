export { TernaryPlot } from './plots/ternary';
export { QuaternaryPlot } from './plots/quaternary';
export { Spectrum } from './plots/spectrum';
export { HeatMap } from './plots/heatmap';
export { MultidimensionalPlot } from './plots/multidimensional';
export { DataProvider, HeatMapDataProvider } from './data-provider';
export {
  ICompositionToPositionProvider,
  NearestCompositionToPositionProvider,
  AnaliticalCompositionToPositionProvider
} from './data-provider/multidimensional';
import * as colors from './utils/colors';
import * as spline from './utils/spline';
export { colors, spline };
