import { Selection, BaseType, select, event as currentEvent } from 'd3-selection';
import { line, curveLinearClosed } from 'd3-shape';

import { RGBColor, Scale } from '@colormap/core';

import { ISample, Vec2, IAxis } from '../types';
import { DataProvider } from '../data-provider';
import { rgbToString } from '../utils/colors';

/**
 * Composition plot type enum.
 * 
 * @public
 * 
 */
export enum PlotTypes {
  Unary,
  BinaryHorizontal,
  BinaryVertical,
  TernaryUp,
  TernaryDown
}

/**
 * Sample shape enum.
 * 
 * @public
 * 
 */
export enum SampleShape {
  Hexagon,
  Square,
  Circle
}

/**
 * Struct representing a vertex on a composition plot.
 * 
 * @public
 * 
 */
export interface IVertex {
  position: Vec2;
  labelPosition?: Vec2;
}

/**
 * Type describing a function that returns vertices
 * 
 * @public
 * 
 */
export type VerticesFn = () => IVertex[];

/**
 * Type describing a function that returns the position of a given sample
 * 
 * @public
 * 
 */
export type SamplePositionFn = (sample: ISample) => Vec2

/**
 * Helper function that returns a {@link VerticesFn} for a set of predefined plot layouts.
 * 
 * @param plotType - The layout of the composition plot
 * @param origin - The origin of the plot
 * @param size - The length of the plot edge
 * @param fontSize - The size of the vertex labels
 * @returns A VerticesFn
 * 
 * @public
 * 
 */
export function verticesFnFactory(plotType: PlotTypes, origin: Vec2, size: number, fontSize: number) : VerticesFn {
  switch (plotType) {
    case PlotTypes.Unary : {
      return () => [
        {
          position: [origin[0], origin[1]],
          labelPosition: [origin[0] - 1.25 * fontSize, origin[1] + fontSize * 0.4]
        }
      ]
    }

    case PlotTypes.BinaryHorizontal : {
      return () => [
        {
          position: [origin[0], origin[1]],
          labelPosition: [origin[0] - fontSize, origin[1] + fontSize * 0.4]
        },
        {
          position: [origin[0] + size, origin[1]],
          labelPosition: [origin[0] + size + fontSize, origin[1] + fontSize * 0.4]
        }
      ]
    }

    case PlotTypes.TernaryUp : {
      const height = Math.round(size * Math.sin(2 * Math.PI / 6));
      const positions : Vec2[] = [
        [origin[0], origin[1] + height],
        [origin[0] + size, origin[1] + height],
        [origin[0] + size / 2, origin[1]]
      ]
      return () => [
        {
          position: positions[0],
          labelPosition: [positions[0][0], positions[0][1] + fontSize]
        },
        {
          position: positions[1],
          labelPosition: [positions[1][0], positions[1][1] + fontSize]
        },
        {
          position: positions[2],
          labelPosition: [positions[2][0], positions[2][1] - 0.5 * fontSize]
        }
      ]
    }

    case PlotTypes.TernaryDown : {
      const height = Math.round(size * Math.sin(2 * Math.PI / 6));
      const positions : Vec2[] = [
        [origin[0], origin[1]],
        [origin[0] + size, origin[1]],
        [origin[0] + size / 2, origin[1] + height]
      ]
      return () => [
        {
          position: positions[0],
          labelPosition: [positions[0][0], positions[0][1] - 0.5 * fontSize]
        },
        {
          position: positions[1],
          labelPosition: [positions[1][0], positions[1][1] - 0.5 * fontSize]
        },
        {
          position: positions[2],
          labelPosition: [positions[2][0], positions[2][1] + fontSize]
        }
      ]
    }

    default: {
      console.warn(`verticesFnFactory not yet implemented for the ${plotType.toString()} case.`);
      return () => [];
    }
  }
}

/**
 * Helper function that returns a {@link SamplePositionFn} for a set of predefined plot layouts.
 * 
 * @param plotType - The layout of the composition plot
 * @param verticesFn - The VerticesFn of the plot
 * @param scales - The scaling function mapping composition fraction to edge fraction
 * @param edge - The size of the plot edge
 * @param dp - The DataProvider of the plot
 * @returns A SamplePositionFn
 * 
 * @public
 *  
 */
export function samplePositionFnFactory(plotType: PlotTypes, verticesFn: VerticesFn, scales: Scale[], edge: number, dp: DataProvider) : SamplePositionFn {
  const vertices = verticesFn();
  switch (plotType) {
    case PlotTypes.Unary : {
      return () => vertices[0].position;
    }

    case PlotTypes.BinaryHorizontal : {
      return (sample) => {
        let pos: [number, number] = [0, 0];
        const composition = dp.getActiveAxes().map(element => DataProvider.getSampleElementFraction(sample, element));
        let frac = composition.map((val, i) => scales[i](val));
        pos[0] = 1 - frac[0];
        pos[0] *= edge;
        pos[0] += vertices[0].position[0];
        pos[1] += vertices[0].position[1];
        return pos;
      }
    }

    case PlotTypes.TernaryUp : {
      return (sample) => {
        let pos: [number, number] = [0, 0];
        const composition = dp.getActiveAxes().map(element => DataProvider.getSampleElementFraction(sample, element));
        let frac = composition.map((val, i) => scales[i](val));
        pos[0] = 0.5 * ((2 * frac[1] + frac[2]) / (frac[0] + frac[1] + frac[2]));
        pos[1] = 0.5 * Math.sqrt(3) * frac[2] / (frac[0] + frac[1] + frac[2]);
        pos[0] *= edge;
        pos[1] *= edge;
        pos[0] += vertices[0].position[0];
        // pos[1] += vertices[0].position[1];
        pos[1] = -pos[1] + vertices[0].position[1];
        return pos;
      }
    }

    case PlotTypes.TernaryDown : {
      return (sample) => {
        let pos: [number, number] = [0, 0];
        const composition = dp.getActiveAxes().map(element => DataProvider.getSampleElementFraction(sample, element));
        let frac = composition.map((val, i) => scales[i](val));
        pos[0] = 0.5 * ((2 * frac[1] + frac[2]) / (frac[0] + frac[1] + frac[2]));
        pos[1] = 0.5 * Math.sqrt(3) * frac[2] / (frac[0] + frac[1] + frac[2]);
        pos[0] *= edge;
        pos[1] *= edge;
        pos[0] += vertices[0].position[0];
        pos[1] += vertices[0].position[1];
        return pos;
      }
    }

    default: {
      console.warn(`samplePositionFnFactory not yet implemented for the ${plotType} case.`);
      return () => vertices[0].position;
    }
  }
}

/**
 * A class in charge of drawing a composition plot into an SVG element.
 * 
 * This class is fairly general, and relies on the following in order to
 * customize the layout and appearance of the plot:
 *   - a color function
 *   - an opacity function
 *   - a vertices function
 *   - a sample position function
 *   - etc.
 * 
 * @public
 * 
 */
class BasePlot {

  id: string;
  svg: HTMLElement;
  dp: DataProvider;
  rootGroup: Selection<BaseType, {}, null, undefined>;
  gridGroup: Selection<BaseType, {}, null, undefined>;
  dataGroup: Selection<BaseType, {}, null, undefined>;
  dataTooltip: Selection<BaseType, unknown, HTMLElement, unknown>;
  sampleShape: SampleShape = SampleShape.Hexagon;
  compositionSpace: string[] | undefined;

  colorFn: (sample: ISample, dp: DataProvider) => RGBColor = () => [0.5, 0.5, 0.5];
  opacityFn: (sample: ISample, dp: DataProvider) => number = () => 1;

  verticesFn: VerticesFn = () => [];
  samplePositionFn: SamplePositionFn = () => [0, 0];

  borderColorFn: (sample: ISample, dp: DataProvider) => RGBColor = () => [1, 1, 1];
  borderWidthFn: (sample: ISample, dp: DataProvider) => number = () => 0;

  labelColorFn: (element: string) => RGBColor = () => [0, 0, 0];

  sampleRadius: number = 10;
  spacing: number[];
  range: number[][];
  enableTooltip: boolean = true;

  onSelect: (sample: ISample) => void;

  mouseDown: boolean = false;

  /**
   * The constructor of the BasePlot
   * 
   * @param svg - The SVG element that will be used for rendering
   * @param dp  - The DataProvider containing samples and figures of merit
   * @param id - An arbitrary unique ID
   * 
   * @public
   * 
   */
  constructor(svg: HTMLElement, dp: DataProvider, id: string ) {
    this.id = id;
    this.svg = svg;
    this.dp = dp;

    select(svg).selectAll(`.${id}`).remove();
    this.rootGroup = select(svg)
      .append('g')
      .classed(`${id}`, true);

    this.dataGroup = this.rootGroup
      .append('g')
      .classed('data', true);

    this.gridGroup = this.rootGroup
      .append('g')
      .classed('grid', true)
      .style('pointer-events', 'none');

    select(this.svg.parentElement).selectAll('.tooltip')
      .data([1])
      .enter()
      .append("div")
      .attr('class', 'tooltip')
      .style('opacity', 0.9)
      .style('display', 'none')
      .style('position', 'fixed')
      .style('text-align', 'center')
      .style('background-color', 'lightsteelblue')
      .style('border-radius', '0.5rem')
      .style('pointer-events', 'none')
      .style('padding', '0.5rem')
      .style('font-family', 'sans-serif')
      .style('font-size', 'small');

    this.dataTooltip = select(this.svg.parentElement).selectAll('.tooltip');

    this.svg.addEventListener(
      'mousedown', () => {
        this.mouseDown = true;

        const mouseUpListener = () => {
          window.removeEventListener('mouseup', mouseUpListener);
          this.mouseDown = false;
        };

        window.addEventListener('mouseup', mouseUpListener);
      }
    );
    // dragging randomly gets in the way
    this.svg.addEventListener('dragstart', (e) => {e.preventDefault()});
  }

  /**
   * Set the color function
   * 
   * @param fn - Returns a fill color for a given sample
   * 
   * @public
   * 
   */
  setColorFn(fn: (sample: ISample, dp: DataProvider) => RGBColor) {
    this.colorFn = fn;
  }

  /**
   * Set the opacity function
   * 
   * @param fn - Returns a fill opacity for a given sample
   * 
   * @public
   * 
   */
  setOpacityFn(fn: (sample: ISample, dp: DataProvider) => number) {
    this.opacityFn = fn;
  }

  /**
   * Set the border color function
   * 
   * @param fn - Returns a border color for a given sample
   * 
   * @public
   * 
   */
  setBorderColorFn(fn: (sample: ISample, dp: DataProvider) => RGBColor) {
    this.borderColorFn = fn;
  }

  /**
   * Set the border width function
   * 
   * @param fn - Returns a border width for a given sample
   * 
   * @public
   * 
   */
  setBorderWidthFn(fn: (sample: ISample, dp: DataProvider) => number) {
    this.borderWidthFn = fn;
  }

  /**
   * Set the label color function
   * 
   * @param fn - Returns a label color for a given vertex
   * 
   * @public
   * 
   */
  setLabelColorFn(fn: (element: string) => RGBColor) {
    this.labelColorFn = fn;
  }

  /**
   * Set the composition space of this plot
   * 
   * The composition space is the list of elements that
   * a sample can be expected to have in its composition
   * 
   * @param compositionSpace - A list of chemical elements
   * 
   * @public
   * 
   */
  setCompositionSpace(compositionSpace: string[]) {
    this.compositionSpace = compositionSpace;
  }

  /**
   * Remove all the graphical elements associated with this plot from the SVG element
   * 
   * @public
   * 
   */
  release() {
    select(this.svg).selectAll(`.${this.id}`).remove();
  }

  /**
   * Redraw all the graphical elements in the SVG
   * 
   * @public
   * 
   */
  render() {
    this.drawGrid();
    this.drawData();
  }

  /**
   * Draw the graphical elements associated to the plot grid
   * 
   */
  drawGrid() {
    const vertices = this.verticesFn();

    const circles = this.gridGroup
      .selectAll('circle')
      .data([]);

    // Update
    circles
      .attr('cx', (d) => {return d.position[0]})
      .attr('cy', (d) => {return d.position[1]})
      .attr('r', 3)

    // Enter
    circles
      .enter()
      .append('circle')
      .attr('cx', (d) => {return d.position[0]})
      .attr('cy', (d) => {return d.position[1]})
      .attr('r', 3)

    // Exit
    circles
      .exit()
      .remove()

    const outlines = this.gridGroup.selectAll('path').data([0]);

    const positions = vertices.map(v => v.position);

    let outlineFn = line()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveLinearClosed)

    // Update
    outlines
      .datum(positions)
      .attr('d', outlineFn)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(0, 0, 0, 0.7')
      .attr('stroke-width', 1.5);

    // Enter
    outlines
      .enter()
      .append('path')
        .datum(positions)
        .attr('d', outlineFn)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(0, 0, 0, 0.7')
        .attr('stroke-width', 1.5);

    // Exit
    outlines
      .exit()
      .remove();

    const axisLabels = vertices.filter(vert => vert.labelPosition).map((vert, i) => (
      {
        position: vert.labelPosition,
        label: this.dp.getAxisLabel(i)
      }
    ));

    const fontSize = 16;

    const labels = this.gridGroup
      .selectAll('text')
      .data(axisLabels);

    // Update
    labels
      .attr('x', (d) => d.position[0])
      .attr('y', (d) => d.position[1])
      .attr('text-anchor', 'middle')
      .attr('font-family', 'sans-serif')
      .attr('font-size', `${fontSize}px`)
      .attr('fill', (d) => rgbToString(...this.labelColorFn(d.label)))
      .style('user-select', 'none')
      .style('pointer-events',  'none')
      .text((d) => d.label);

    // Enter
    labels
      .enter()
      .append('text')
      .attr('x', (d) => d.position[0])
      .attr('y', (d) => d.position[1])
      .attr('text-anchor', 'middle')
      .attr('font-family', 'sans-serif')
      .attr('font-size', `${fontSize}px`)
      .attr('fill', (d) => rgbToString(...this.labelColorFn(d.label)))
      .style('user-select', 'none')
      .style('pointer-events',  'none')
      .text((d) => d.label);

    // Exit
    labels
      .exit()
      .remove()
  }

  /**
   * Draw the graphical elements associated to the samples and figures of merit
   * 
   */
  drawData() {
    let filter: (sample: ISample) => boolean;
    if (this.compositionSpace) {
      const compositionSet = new Set(this.compositionSpace);
      filter = (sample: ISample) : boolean => {
        for (let [element, fraction] of Object.entries(sample.composition)) {
          if (!compositionSet.has(element) && fraction > Number.EPSILON) {
            return false;
          }
        }
        return true;
      }
    } else {
      filter = () => true;
    }
    const samples = this.dp.getSamples(filter);

    let hexFn = line()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveLinearClosed);

    const fillFn = (_d, i) => {
      const [r, g, b] = this.colorFn(samples[i], this.dp);
      const opacity = this.opacityFn(samples[i], this.dp);
      return rgbToString(r, g, b, opacity);
    }

    const strokeFn = (_d, i) => {
      const [r, g, b] = this.borderColorFn(samples[i], this.dp);
      return rgbToString(r, g, b);
    }

    const strokeWidthFn = (_d, i) => {
      return this.borderWidthFn(samples[i], this.dp);
    }

  const onMouseOver = (_d, i, _hexagons) => {
      if (this.enableTooltip && !this.mouseDown) {
        const x = currentEvent.clientX;
        const y = currentEvent.clientY;
        let tooltipHtml = "";
        Object.entries(samples[i].composition).forEach(([el, frac]) => {
          if (frac > Number.EPSILON) {
            tooltipHtml += `${this.dp.getAxisLabel(el)}: ${frac.toFixed(2)}<br>`;
          }
        });

        const activeScalar = this.dp.getActiveScalar();
        const scalarValue = DataProvider.getSampleScalar(samples[i], activeScalar);
        if (Number.isFinite(scalarValue)) {
          tooltipHtml += `${activeScalar.replace('\\u002', '.')}: ${scalarValue.toFixed(2)}<br>`;
        }

        this.dataTooltip.html(tooltipHtml);
        this.dataTooltip
          .style('left', `${x+10}px`)
          .style('top', `${y-10}px`)
          .style('transform', `translateY(-100%)`)
          .style('display', 'block');
      }
    }

    const onMouseOut = () => {
      this.dataTooltip
      .style('display', 'none');
    }

    const onMouseDown = (_d, i) => {
      if (this.onSelect) {
        this.onSelect(samples[i]);
      }
    }

    const hexagons = this.dataGroup
      .selectAll('path')
      .data(samples);

    let pathFn;
    switch(this.sampleShape) {
      case SampleShape.Square: {
        pathFn = this._polygonFn(4, 1);
        break;
      }
      case SampleShape.Circle: {
        pathFn = this._polygonFn(18);
        break;
      }
      case SampleShape.Hexagon:
      default: {
        pathFn = this._polygonFn(6, 1);
      }
    }

    // Enter
    hexagons
      .enter()
        .append('path')
        .datum((d) => pathFn(d))
        .attr('d', hexFn)
        .attr('fill', fillFn)
        .attr('stroke', strokeFn)
        .attr('stroke-width', strokeWidthFn)
        .on('mouseenter', onMouseOver)
        .on('mouseout', onMouseOut)
        .on('mousedown', onMouseDown);

    // Update
    hexagons
      .datum((d) => pathFn(d))
      .attr('d', hexFn)
      .attr('fill', fillFn)
      .attr('stroke', strokeFn)
      .attr('stroke-width', strokeWidthFn)
      .on('mouseenter', onMouseOver)
      .on('mouseout', onMouseOut)
      .on('mousedown', onMouseDown);

    //Remove
    hexagons
      .exit()
      .remove();
  }

  /**
   * Set a callback function that will be invoked when a sample is clicked
   * 
   * @param fn - A callback function to be invoken upon selection of a sample 
   * 
   * @public
   * 
   */
  setSelectCallback(fn: (sample: ISample) => void) {
    this.onSelect = fn;
  }

  /**
   * Set the radius of a sample circle/hexagon/square
   * 
   * @param radius - The sample radius
   * 
   * @public
   * 
   */
  setSampleRadius(radius: number) {
    this.sampleRadius = radius;
  }

  /**
   * Set the shape that will be used to draw samples
   * 
   * @param shape - The shape of the sample (circle, hex, ...) 
   * 
   * @public
   * 
   */
  setSampleShape(shape: SampleShape) {
    this.sampleShape = shape;
  }

  /**
   * Enable/disable the tooltip that is displayed when hovering a sample
   * 
   * @param enable
   * 
   * @public
   * 
   */
  setEnableTooltip(enable: boolean) {
    this.enableTooltip = enable;
  }


  _polygonFn = (nPoints: number, phase: number = 0) => {
    return (sample: ISample) : [number, number][] => {
      let radius = this.sampleRadius;
      radius *= 0.99;
      let center = this.samplePositionFn(sample);
      let points: [number, number][] = [];
      for (let i = 0; i < nPoints; ++i) {
        let xy: [number, number] = [
          radius * Math.cos(Math.PI * (2 * i + phase) / nPoints) + center[0],
          radius * Math.sin(Math.PI * (2 * i + phase) / nPoints) + center[1],
        ]
        points.push(xy);
      }
      return points;
    }
  }

  dataUpdated() {
    this.render();
  }
}

/**
 * A class in charge of drawing a quaternary composition plot into an SVG element.
 * 
 * This class relies on multiple instances of the {@link BasePlot} class
 * to perform the actual drawing.
 * For each shell in the quaternary plot, 4 BasePlots will be created.
 * The QuaternaryShellPlot will be in charge of placing the plots appropriately on the
 * same SVG element, as well as broadcasting events to/from each plot.
 * 
 * @public
 * 
 */
class QuaternaryShellPlot {
  id: string;
  svg: HTMLElement;
  dp: DataProvider;
  plots: BasePlot[] = [];
  initialShell: number = 0;
  finalShell: number = 0;
  spacing: number = 0.1;
  edgeUnit: number = 100;
  origin: Vec2 = [0, 0];
  maxWidth: number = 1200;
  margin: number = 50;
  sampleRadius: number = 10;
  sampleShape: SampleShape = SampleShape.Hexagon;
  enableTooltip: boolean = true;
  avoidDuplicates: boolean = true;

  colorFn: (sample: ISample, dp: DataProvider) => RGBColor = () => [0.5, 0.5, 0.5];
  opacityFn: (sample: ISample, dp: DataProvider) => number = () => 1;
  labelColorFn: (element: string) => RGBColor = () => [0, 0, 0];
  borderColorFn: (sample: ISample, dp: DataProvider) => RGBColor = () => [1, 1, 1];
  borderWidthFn: (sample: ISample, dp: DataProvider) => number = () => 0;

  onSelect: (sample: ISample) => void = () => {};

  /**
   * The constructor of the QuaternaryShellPlot
   * 
   * @param svg - The SVG element that will be used for rendering
   * @param dp  - The DataProvider containing samples and figures of merit
   * @param id - An arbitrary unique ID
   * 
   * @public
   * 
   */
  constructor(svg: HTMLElement, dp: DataProvider, id: string ) {
    this.id = id;
    this.svg = svg;
    this.dp = dp;
  }

  /**
   * Initialize the placement of the quaternary plot
   * 
   * @param initialShell - The initial shell number that needs to be plotted 
   * @param finalShell  - The final shell number that needs to be plotted
   * @param spacing - The composition fraction between shells
   * @param edgeUnit - The legth of an edge spanning from 0 to 1 composition fraction
   * @param origin - The origin of the plot
   * @param maxWidth - The maximum width the plot can have before new shells are placed on a new row
   * @param margin - The margin between shells
   * 
   * @public
   * 
   */
  setPlacement(
    initialShell: number, finalShell: number, spacing: number, edgeUnit: number,
    origin: Vec2 = [50, 0], maxWidth: number = 1200, margin: number = 50
    ) {
      this.initialShell = initialShell;
      this.finalShell = finalShell;
      this.spacing = spacing;
      this.edgeUnit = edgeUnit;
      this.origin = origin;
      this.maxWidth = maxWidth;
      this.margin = margin;
  }

  /**
   * Allocates and places the various BasePlots.
   * 
   * @returns the estimated size of the total quaternary plot
   * 
   * @public
   * 
   */
  initialize() : Vec2 {
    this.release();

    // if (!this.dp.getAxis(0)) {
    //   return;
    // }
    // const spacing = this.dp.getAxis(0).spacing;
    const spacing = this.spacing;
    const finalShell = this.finalShell;
    const initialShell = this.initialShell;
    const edgeUnit = this.edgeUnit;
    const origin = this.origin;
    const maxWidth = this.maxWidth;
    const margin = this.margin;

    this.plots = [];
    const nShells = Math.min(finalShell - initialShell + 1, Math.floor(1 / (3 * spacing)));

    const nPlots = 4;

    let startX = origin[0];
    let rowStartY = origin[1];
    let rowHeight = 0;// Math.round(edgeUnit * Math.sin(2 * Math.PI / 6));

    let sizeX = 0;
    let sizeY = 0;

    for (let i = 0; i < nShells; ++i) {
      let constValue = (i + initialShell) * spacing;
      let edge = Math.round(edgeUnit * (1 - constValue * 4));
      if (edge <= 0) {
        continue;
      }

      const scales = [];
      for (let j = 0; j < 4; ++j) {
        scales.push((x: number) => (x - constValue) / (1 - 3 * constValue));
      }

      const shellWidth = 2.5 * edge;
      const shellHeight = Math.round(edge * Math.sin(2 * Math.PI / 6));
      if (i === 0) {
        startX = origin[0];
        rowHeight = shellHeight;
        sizeY += rowHeight;
      } else if (startX + shellWidth - origin[0] > maxWidth) {
        startX = origin[0];
        rowStartY += rowHeight + 2 * margin;
        rowHeight = shellHeight;
        sizeY += 2 * margin + rowHeight;
      }

      sizeX = Math.max(sizeX, startX + shellWidth - origin[0]);

      let startY = margin + rowStartY + Math.floor(0.5 * (rowHeight - shellHeight));

      for (let j = 0; j < nPlots; ++j) {
        const dp = new DataProvider(3);
        const plot = new BasePlot(this.svg, dp, `${this.id}_face${i}-${j}`);
        const plotType = j % 2 === 0 ? PlotTypes.TernaryUp : PlotTypes.TernaryDown;
        const verticesFn = verticesFnFactory(plotType, [startX + j * (edge / 2), startY], edge, 16);
        const samplePositionFn = samplePositionFnFactory(plotType, verticesFn, scales, edge, dp);
        plot.verticesFn = verticesFn;
        plot.samplePositionFn = samplePositionFn;
        plot.setSampleRadius(this.sampleRadius);
        plot.setSampleShape(this.sampleShape);
        plot.setEnableTooltip(this.enableTooltip);
        plot.setSelectCallback(this.onSelect);
        plot.setColorFn(this.colorFn);
        plot.setOpacityFn(this.opacityFn);
        plot.setBorderColorFn(this.borderColorFn);
        plot.setBorderWidthFn(this.borderWidthFn);
        plot.setLabelColorFn(this.labelColorFn);
        this.plots.push(plot);
      }

      startX += 2 * edge + 2 * spacing * edgeUnit;
    }

    sizeX += 2 * margin;
    sizeY += 2 * margin;

    return [sizeX, sizeY];
  }

  /**
   * Set a callback function that will be invoked when a sample is clicked
   * 
   * @param fn - A callback function to be invoken upon selection of a sample 
   * 
   * @public
   * 
   */
  setSelectCallback(fn: (sample: ISample) => void) {
    this.onSelect = fn;
    this.broadCast(plot => {
      plot.setSelectCallback(this.onSelect);
    });
  }

  /**
   * Set the color function
   * 
   * @param fn - Returns a fill color for a given sample
   * 
   * @public
   * 
   */
  setColorFn(fn: (sample: ISample, dp: DataProvider) => RGBColor) {
    this.colorFn = fn;
    this.broadCast(plot => {
      plot.setColorFn(this.colorFn);
    });
  }

  /**
   * Set the opacity function
   * 
   * @param fn - Returns a fill opacity for a given sample
   * 
   * @public
   * 
   */
  setOpacityFn(fn: (sample: ISample, dp: DataProvider) => number) {
    this.opacityFn = fn;
    this.broadCast(plot => {
      plot.setOpacityFn(this.opacityFn);
    });
  }

  /**
   * Set the border color function
   * 
   * @param fn - Returns a border color for a given sample
   * 
   * @public
   * 
   */
  setBorderColorFn(fn: (sample: ISample, dp: DataProvider) => RGBColor) {
    this.borderColorFn = fn;
    this.broadCast(plot => {
      plot.setBorderColorFn(this.borderColorFn);
    });
  }

  /**
   * Set the border width function
   * 
   * @param fn - Returns a border width for a given sample
   * 
   * @public
   * 
   */
  setBorderWidthFn(fn: (sample: ISample, dp: DataProvider) => number) {
    this.borderWidthFn = fn;
    this.broadCast(plot => {
      plot.setBorderWidthFn(this.borderWidthFn);
    });
  }

  /**
   * Set the label color function
   * 
   * @param fn - Returns a label color for a given vertex
   * 
   * @public
   * 
   */
  setLabelColorFn(fn: (element: string) => RGBColor) {
    this.labelColorFn = fn;
    this.broadCast(plot => {
      plot.setLabelColorFn(this.labelColorFn);
    });
  }

  /**
   * Enable/disable the tooltip that is displayed when hovering a sample
   * 
   * @param enable
   * 
   * @public
   * 
   */
  setEnableTooltip(enable: boolean) {
    this.broadCast(plot => {
      plot.setEnableTooltip(enable);
    });
  }

  /**
   * Private method
   */
  setShellsData() {
    const nShells = Math.floor(this.plots.length / 4);
    for (let i = 0; i < nShells; ++i) {
      const constValue = (i + this.initialShell) * this.spacing;
      this._setShellData(this.plots.slice(i * 4, i * 4 + 4), constValue);
    }
  }

  /**
   * Remove all the graphical elements associated with this plot from the SVG element
   * 
   * @public
   * 
   */
  release() {
    this.broadCast((plot) => {
      plot.release();
    });
  }

  /**
   * Redraw all the graphical elements in the SVG
   * 
   * @public
   * 
   */
  render() {
    const fn = (plot: BasePlot) => {
      plot.render();
    }
    this.broadCast(fn);
  }

  /**
   * The data in the DataProvider have changed, redraw the entire plot
   * 
   * @public
   * 
   */
  dataUpdated() {
    this.initialize();
    this.setShellsData();
    this.render();
  }

  /**
   * Set the radius of a sample circle/hexagon/square
   * 
   * @param radius - The sample radius
   * 
   * @public
   * 
   */
  setSampleRadius(radius: number) {
    this.sampleRadius = radius;
    this.broadCast(plot => {
      plot.setSampleRadius(this.sampleRadius);
      plot.render();
    });
  }

  /**
   * Set the shape that will be used to draw samples
   * 
   * @param shape - The shape of the sample (circle, hex, ...) 
   * 
   * @public
   * 
   */
  setSampleShape(shape: SampleShape) {
    this.sampleShape = shape;
    this.broadCast(plot => {
      plot.setSampleShape(this.sampleShape);
      plot.render();
    });
  }

  /**
   * Private method
   * 
   * @param plots 
   * @param constValue
   */
  _setShellData(plots: BasePlot[], constValue: number) {
    const alreadyIncluded = new Set();
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
      if (this.avoidDuplicates) {
        slicedSamples = slicedSamples.filter(sample => !alreadyIncluded.has(sample._id));
      }
      slicedSamples.forEach(sample => {
        alreadyIncluded.add(sample._id);
      });

      plots[i].dp.setData(slicedSamples, false);
      plots[i].dp.setAxisOrder(perm);
      const newAxes: {[element: string]: IAxis} = {
        [perm[0]]: { ...axes[perm[0]], range: [constValue, 1 - 3 * constValue]},
        [perm[1]]: { ...axes[perm[1]], range: [constValue, 1 - 3 * constValue]},
        [perm[2]]: { ...axes[perm[2]], range: [constValue, 1 - 3 * constValue]},
        [perm[3]]: { ...axes[perm[3]], range: [constValue, constValue]}
      }
      plots[i].dp.setAxes(newAxes);
      plots[i].dp.setActiveAxes([perm[0], perm[1], perm[2]]);
      plots[i].dp.setActiveScalar(this.dp.getActiveScalar());
      plots[i].dataUpdated();
    }
  }

  /**
   * Broadcast a function call on each BasePlot held by this Quaternary plot
   * @param fn - The function that will be invoked for each plot
   */
  broadCast(fn: (plot: BasePlot) => void) {
    this.plots.forEach(plot => {
      fn(plot);
    });
  }
}

export { BasePlot, QuaternaryShellPlot };
