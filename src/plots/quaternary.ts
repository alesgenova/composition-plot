import { ISample, IAxis } from '../types';
import { TernaryPlot } from './ternary';
import { presets } from '../utils/colors';
import { DataProvider } from '../data-provider';
import { select } from 'd3-selection';

/**
 * Legacy class to draw quaternary composition plots.
 * 
 * Use {@link QuaternaryShellPlot} for new projects
 */
class QuaternaryPlot {
  svg: HTMLElement;
  dp: DataProvider;
  selectedScalar: string;
  scalarIdx: number;
  edgeUnit: number;
  colorMap: [number, number, number][];
  colorMapRange: [number, number];
  shells: TernaryPlot[][] = [];
  nShells: number = 0;
  selectedSamples: Set<string>;
  onSelect: Function = () => {};
  onDeselect: Function = () => {};
  textColor: [number, number, number] = [0, 0, 0];

  constructor(svg: HTMLElement, dp: DataProvider, edgeUnit: number = 250) {
    this.svg = svg;
    this.dp = dp;
    this.edgeUnit = edgeUnit;
  }

  initShells(spacing: number) {
    // Initialize 4 ternary plots per shell
    const nShells = Math.floor(1 / (3 * spacing));
    if (nShells === this.nShells) {
      return;
    }
    this.nShells = nShells;
    const nPlots = 4;
    this.shells = [];

    const margin = 50;
    let startX = 0;
    let rowStartY = 0;
    let rowHeight = Math.round(this.edgeUnit * Math.sin(2 * Math.PI / 6));
    const maxWidth = 1200;

    let sizeX = 0;
    let sizeY = rowHeight;

    select(this.svg).selectAll().remove();

    for (let i = 0; i < nShells; ++i) {
      let constValue = i * spacing;
      let edge = Math.round(this.edgeUnit * (1 - constValue * 4));
      if (edge <= 0) {
        continue;
      }

      let plots: TernaryPlot[] = [];
      const shellWidth = 2.5 * edge;
      const shellHeight = Math.round(edge * Math.sin(2 * Math.PI / 6));
      if (startX + shellWidth > maxWidth) {
        startX = 0;
        rowStartY += rowHeight + 2 * margin;
        rowHeight = shellHeight;
        sizeY += 2 * margin + rowHeight;
      }

      sizeX = Math.max(sizeX, startX + shellWidth);

      let startY = margin + rowStartY + Math.floor(0.5 * (rowHeight - shellHeight));

      for (let j = 0; j < nPlots; ++j) {
        const dp = new DataProvider(3);
        const plot = new TernaryPlot(this.svg, dp, `face${i}-${j}`, j % 2 !== 0);
        plot.setTextColor(this.textColor);
        let left = margin + startX + j * (edge / 2);
        plot.setPosition(left, startY, edge);
        plots.push(plot);
      }

      startX += 2 * edge + 2 * spacing * this.edgeUnit;
      this.shells.push(plots);
    }

    sizeX += 2 * margin;
    sizeY += 2 * margin;

    this.svg.setAttribute('width', sizeX.toString());
    this.svg.setAttribute('height', sizeY.toString());

    this.setCallBacks(this.onSelect, this.onDeselect);
  }

  dataUpdated() {
    const spacing = this.dp.getAxis(0).spacing;
    this.initShells(spacing);
    this.setShellsData(spacing);
    this.render();
  }

  setColorMap(map: [number, number, number][], range: [number, number] = null) {
    if (!map) {
      map = presets.bwr;
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

  setInverted(inverted: boolean) {
    const fn = (plot: TernaryPlot) => {
      plot.setInverted(inverted);
    }
    this.broadCast(fn);
  }

  setShellsData(spacing: number) {
    for (let i = 0; i < this.shells.length; ++i) {
      let constValue = i * spacing;
      this._setShellData(this.shells[i], constValue);
    }
  }

  setCallBacks(onSelect: Function, onDeselect: Function) {
    this.onSelect = onSelect;
    this.onDeselect = onDeselect;

    const fn = (plot: TernaryPlot) => {
      plot.onSelect = onSelect;
      plot.onDeselect = onDeselect;
    }
    this.broadCast(fn);
  }

  setSelectedSamples(selectedSamples: Set<string>) {
    this.selectedSamples = selectedSamples;
    const fn = (plot: TernaryPlot) => {
      plot.setSelectedSamples(this.selectedSamples);
    }
    this.broadCast(fn);
    this.render();
  }

  setOpacityFn(opacityFn: (sample: ISample) => number) {
    const fn = (plot: TernaryPlot) => {
      plot.setOpacityFn(opacityFn);
    }
    this.broadCast(fn);
    this.render();
  }

  setTextColor(color: [number, number, number]) {
    this.textColor = color;
    const fn = (plot: TernaryPlot) => {
      plot.setTextColor(color);
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
    const allAxes = this.dp.getAxes(true);
    const activeAxes = new Set(this.dp.getActiveAxes());

    const filters = Object.values(allAxes).map(axis => {
      if (activeAxes.has(axis.element)) {
        return {...axis, range: [constValue, 1]} as IAxis;
      } else {
        return {...axis, range: (val, eps) => val < eps } as any as IAxis;
      }
    });
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
        [perm[2]]: { ...axes[perm[2]], range: [constValue, 1 - 3 * constValue]},
        [perm[3]]: { ...axes[perm[3]], range: [constValue, constValue]}
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
