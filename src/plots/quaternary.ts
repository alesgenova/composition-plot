import { ISample, IAxis } from '../types';
import { TernaryPlot } from './ternary';
import { redWhiteBlue } from '../utils/colors';
import { DataProvider } from '../data-provider';

class QuaternaryPlot {
  svg: HTMLElement;
  dp: DataProvider;
  selectedScalar: string;
  scalarIdx: number;
  edgeUnit: number = 350;
  colorMap: [number, number, number][];
  colorMapRange: [number, number];
  shells: TernaryPlot[][] = [];

  constructor(svg: HTMLElement, dp: DataProvider) {
    this.svg = svg;
    this.dp = dp;
    this.initShells();
  }

  initShells() {
    // Initialize 3 shells, 4 ternary plots per shell
    const nShells = 3;
    const nPlots = 4;
    this.shells = [];

    let start = 50;
    const spacing = 0.1;

    for (let i = 0; i < nShells; ++i) {
      let constValue = i * spacing;
      let edge = Math.floor(this.edgeUnit * (1 - constValue * 4));
      let plots: TernaryPlot[] = [];

      for (let j = 0; j < nPlots; ++j) {
        const dp = new DataProvider(3);
        const plot = new TernaryPlot(this.svg, dp, `lulzi${i}`, j % 2 !== 0);
        let left = start + j * (edge / 2);
        let right = left + edge;
        plot.setSize(left, right);
        plots.push(plot);
      }
      start += 2 * edge + 0.2 * this.edgeUnit;
      this.shells.push(plots);
    }
  }

  dataUpdated() {
    this.setShellsData();
    this.setColorMap(this.colorMap, null);
  }

  setColorMap(map: [number, number, number][], range: [number, number] = null) {
    if (!map) {
      map = redWhiteBlue;
    }
    if (!range) {
      range = this.dp.getScalarRange(this.selectedScalar);
    }
    const scalar = this.dp.getActiveScalar();
    this.colorMapRange = range;
    this.colorMap = map;
    const fn = (plot: TernaryPlot) => {
      plot.dp.setActiveScalar(plot.dp.getDefaultScalar(scalar));
      plot.setColorMap(this.colorMap, this.colorMapRange);
    }
    this.broadCast(fn);
  }

  setShellsData() {

    const spacing = 0.1;
    for (let i = 0; i < this.shells.length; ++i) {
      let constValue = i * spacing;
      this._setShellData(this.shells[i], constValue);
    }
  }

  setCallBacks(onSelect: Function, onDeselect: Function) {
    const fn = (plot: TernaryPlot) => {
      plot.onSelect = onSelect;
      plot.onDeselect = onDeselect;
    }
    this.broadCast(fn);
  }

  render() {
    const fn = (plot: TernaryPlot) => {
      plot.render();
    }
    this.broadCast(fn);
  }

  _setShellData(plots: TernaryPlot[], constValue: number) {
    const axes = this.dp.getAxes();
    const filters = Object.values(axes).map(axis => ({...axis, range: [constValue, 1]}) as IAxis);
    const [Aidx, Bidx, Cidx, Didx] = Object.keys(axes);

    let shellData: ISample[] = this.dp.slice(filters);

    const permutations = [
      [Aidx, Bidx, Cidx, Didx],
      [Cidx, Didx, Bidx, Aidx],
      [Bidx, Aidx, Didx, Cidx],
      [Didx, Cidx, Aidx, Bidx],
    ]

    for (let i = 0; i < permutations.length; ++i) {
      let perm = permutations[i];
      const filters: any[] = [
        {element: perm[3], range: [constValue, constValue]}
      ]
      if (i > 0) {
        filters.push(
          {element: perm[1], range: (val, eps) => Math.abs(val - constValue) > eps}
        );
      }
      let slicedSamples: ISample[] = DataProvider.filterSamples(shellData, filters);
      plots[i].dp.setData(slicedSamples, false);
      plots[i].dp.setAxisOrder(perm);
      const newAxes: {[element: string]: IAxis} = {
        [perm[0]]: { ...axes[perm[0]], range: [constValue, 1 - 3 * constValue]},
        [perm[1]]: { ...axes[perm[1]], range: [constValue, 1 - 3 * constValue]},
        [perm[2]]: { ...axes[perm[2]], range: [constValue, 1 - 3 * constValue]}
      }
      plots[i].dp.setAxes(newAxes);
      plots[i].dp.setActiveScalar(this.dp.getActiveScalar());
      plots[i].dataUpdated();
    }
  }

  // Helper function to broadcast an action to all the the ternary plots composing the
  // quaternary plot
  broadCast(fn: Function) {
    for (let shell of this.shells) {
      for (let plot of shell) {
        fn(plot);
      }
    }
  }
}

export { QuaternaryPlot }
