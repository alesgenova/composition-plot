import { Selection, BaseType, select } from 'd3-selection';
import { line, curveLinearClosed } from 'd3-shape';

import { ColorMap, RGBColor, createColorMap, linearScale } from '@colormap/core';

import { IAxis, ISample } from '../types';
import { ScaleLinear, scaleLinear } from 'd3-scale';
import { DataProvider } from '../data-provider';
import { rgbToString } from '../utils/colors';

/**
 * Legacy class to draw ternary composition plots.
 * 
 * Use {@link BasePlot} for new projects
 */
class TernaryPlot {

  name: string;
  svg: HTMLElement;
  dp: DataProvider;
  upsideDown: boolean;
  vertices: [number, number][];
  rootGroup: Selection<BaseType, {}, null, undefined>;
  gridGroup: Selection<BaseType, {}, null, undefined>;
  dataGroup: Selection<BaseType, {}, null, undefined>;
  dataTooltip: Selection<BaseType, {}, null, undefined>;
  scales: ScaleLinear<number, number>[];
  edge: number;
  colors: RGBColor[] = [[0.5, 0.5, 0.5]];
  dataRange: [number, number] = [0, 1];
  colorMap: ColorMap = () => ([0.5, 0.5, 0.5]);
  inverted: boolean = false;
  selectedSamples: Set<string> = new Set();
  opacityFn: (sample: ISample) => number = () => 1;
  textColor: RGBColor = [0, 0 ,0];

  spacing: number[];
  range: number[][];

  onSelect: Function;
  onDeselect: Function;

  mouseDown: boolean = false;

  constructor(svg: HTMLElement, dp: DataProvider, name: string, upsideDown: boolean = false ) {
    this.name = name;
    this.svg = svg;
    this.dp = dp;
    this.upsideDown = upsideDown;
    this.vertices = [
      [0, 0],
      [0, 0],
      [0, 0]
    ];

    select(svg).selectAll(`.${name}`).remove();
    this.rootGroup = select(svg)
      .append('g')
      .classed(`${name}`, true);

    this.dataGroup = this.rootGroup
      .append('g')
      .classed('data', true);

    this.gridGroup = this.rootGroup
      .append('g')
      .classed('grid', true)
      .style('pointer-events', 'none');

    this.dataTooltip = select(this.svg.parentElement)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style('position', 'absolute')
      .style('text-align', 'center')
      .style('background-color', 'lightsteelblue')
      .style('border-radius', '0.5rem')
      .style('pointer-events', 'none')
      .style('padding', '0.5rem')
      .style('font-family', 'sans-serif')
      .style('font-size', 'small');

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

  setPosition(x0: number, y0: number, length: number) {
    // In an svg there can be several ternary plots,
    const height = Math.round(length * Math.sin(2 * Math.PI / 6));

    this.edge = length;

    if (this.upsideDown) {
      this.vertices[0] = [x0, y0];
      this.vertices[1] = [x0 + length, y0];
      this.vertices[2] = [x0 + length / 2, y0 + height];
    } else {
      this.vertices[0] = [x0, y0 + height];
      this.vertices[1] = [x0 + length, y0 + height];
      this.vertices[2] = [x0 + length / 2, y0];
    }
    this.render();
  }

  setSize(left: number, right: number) {
    // In an svg there can be several ternary plots,
    // set the left/right boundaries of this plot
    const h = this.svg.parentElement.clientHeight;
    
    // Base and height of triangle
    const base = right - left;
    const height = base * Math.sin(2 * Math.PI / 6);

    this.edge = base;

    if (this.upsideDown) {
      this.vertices[0] = [left, (h - height) / 2];
      this.vertices[1] = [right, (h - height) / 2];
      this.vertices[2] = [left + base / 2, h - (h - height) / 2];
    } else {
      this.vertices[0] = [left, h - (h - height) / 2];
      this.vertices[1] = [right, h - (h - height) / 2];
      this.vertices[2] = [left + base / 2, (h - height) / 2];
    }
    this.render();
  }

  setOpacityFn(opacityFn: (sample: ISample) => number) {
    this.opacityFn = opacityFn;
  }

  setTextColor(color: RGBColor) {
    this.textColor = color;
  }

  render() {
    this.drawGrid();
    this.drawData();
  }

  drawGrid() {
    this.gridGroup.selectAll('circle').remove();

    let circles = this.gridGroup
      .selectAll('circle')
      .data(this.vertices);

    // Update
    circles
      .attr('fill', `rgb(${this.textColor[0] * 255}, ${this.textColor[1] * 255}, ${this.textColor[2] * 255})`)
      .attr('cx', (d) => {return d[0]})
      .attr('cy', (d) => {return d[1]})
      .attr('r', 3)
        

    // Enter
    circles
      .enter()
      .append('circle')
      .attr('fill', `rgb(${this.textColor[0] * 255}, ${this.textColor[1] * 255}, ${this.textColor[2] * 255})`)
      .attr('cx', (d) => {return d[0]})
      .attr('cy', (d) => {return d[1]})
      .attr('r', 3)

    const axes: IAxis[] = [this.dp.getAxis(0), this.dp.getAxis(1), this.dp.getAxis(2)];
    if (!axes[0]) {
      return;
    }

    this.gridGroup.selectAll('text').remove();

    const fontSize = 16;

    let labels = this.gridGroup
      .selectAll('text')
      .data(this.vertices);

    labels
      .enter()
      .append('text')
      .attr('x', (d) => d[0])
      .attr('y', (d, i) => {
        if (
          (this.upsideDown && (i !== 2)) ||
          (!this.upsideDown && i === 2)
        ) {
          return d[1] - fontSize;
        } else {
          return d[1] + 2 * fontSize;
        }
      })
      .attr('text-anchor', 'middle')
      .attr('font-family', 'sans-serif')
      .attr('font-size', `${fontSize}px`)
      .attr('fill', `rgb(${this.textColor[0] * 255}, ${this.textColor[1] * 255}, ${this.textColor[2] * 255})`)
      .text((d, i) => {d; return this.dp.getAxisLabel(i)});

    this.gridGroup.selectAll('path').remove();

    let outlineFn = line()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveLinearClosed)
    
    this.gridGroup
      .append('path')
        .datum(this.vertices)
        .attr('d', outlineFn)
        .attr('fill', 'none')
        .attr('stroke', rgbToString(this.textColor[0], this.textColor[1], this.textColor[2], 0.7))
        .attr('stroke-width', 1.5);


    let gridlineFn = line()
      .x((d) => d[0])
      .y((d) => d[1]);

    // Add major grid lines
    for (let i = 0; i < 3; ++ i) {
      const delta = axes[i].range[1] - axes[i].range[0];
      const spacing = axes[i].spacing;
      const n = Math.round(delta / spacing);

      for (let j = 1; j < n; ++j) {
        let points: [number, number, number][] = [
          [axes[0].range[0], axes[1].range[0], axes[2].range[0]],
          [axes[0].range[0], axes[1].range[0], axes[2].range[0]],
        ];
        let frac = j * axes[i].spacing;
        for (let k = 0; k < 2; ++k) {
          points[k][i] = axes[i].range[1] - frac;
          let l = (i + k + 1) % 3;
          let ratio = (axes[i].range[1] - axes[i].range[0]) / (axes[l].range[1] - axes[l].range[0]);
          points[k][l] = axes[l].range[0] + frac / ratio;
        }
        let points2d = points.map(val => this.cartToxy(val));
        this.gridGroup
          .append('path')
          .datum(points2d)
          .attr('d', gridlineFn)
          .attr('stroke', rgbToString(this.textColor[0], this.textColor[1], this.textColor[2], 0.2))
      }
    }
    
    // Add minor grid lines
  }

  drawData() {
    const axes: IAxis[] = [
      this.dp.getAxis(0),
      this.dp.getAxis(1),
      this.dp.getAxis(2),
      this.dp.getAxis(3)
    ];
    if (!axes[0]) {
      return;
    }

    let points3d = this.dp.samples.map((sample: ISample): [number, number, number] => {
      return [
        DataProvider.getSampleElementFraction(sample, axes[0].element),
        DataProvider.getSampleElementFraction(sample, axes[1].element),
        DataProvider.getSampleElementFraction(sample, axes[2].element)
      ]
    });

    let hexFn = line()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveLinearClosed);

    const fillFn = (_d, i) => {
      const [r, g, b] = this.colorMap(
        DataProvider.getSampleScalar(this.dp.samples[i], this.dp.getActiveScalar())
      );
      const a = this.opacityFn(this.dp.samples[i]);
      return rgbToString(r, g, b, a);
    }

    const onMouseOver = (d, i) => {
      if (this.mouseDown) {
        if (DataProvider.isSelected(this.dp.samples[i], this.selectedSamples)) {
          if (this.onDeselect) {
            this.onDeselect(this.dp.samples[i]);
          }
        } else {
          if (this.onSelect) {
            this.onSelect(this.dp.samples[i]);
          }
        }
      }
      // d is the datum, i is the index in the data
      let [x, y] = d[0];

      this.dataTooltip.html(`
        ${this.dp.getAxisLabel(0)}: ${points3d[i][0].toFixed(2)}<br>
        ${this.dp.getAxisLabel(1)}: ${points3d[i][1].toFixed(2)}<br>
        ${this.dp.getAxisLabel(2)}: ${points3d[i][2].toFixed(2)}<br>
        ${this.dp.getAxisLabel(3)}: ${axes[3] ? DataProvider.getSampleElementFraction(this.dp.samples[i], axes[3].element).toFixed(2) : ''}<br>
        ${this.dp.getActiveScalar().replace('\\u002', '.')}: ${DataProvider.getSampleScalar(this.dp.samples[i], this.dp.getActiveScalar()).toFixed(2)}<br>
      `)
      this.dataTooltip
        .style('opacity', 0.9)
        .style('left', `${x+10}px`)
        .style('top', `${y-10}px`)
        .style('transform', `translateY(-100%)`);
    }

    const onMouseOut = () => {
      this.dataTooltip
        .style('opacity', 0);
    }

    const onMouseDown = (d, i) => {
      d;
      if (DataProvider.isSelected(this.dp.samples[i], this.selectedSamples)) {
        if (this.onDeselect) {
          this.onDeselect(this.dp.samples[i]);
        }
      } else {
        if (this.onSelect) {
          this.onSelect(this.dp.samples[i]);
        }
      }
    }

    const hexagons = this.dataGroup
      .selectAll('path')
      .data(points3d);

    // Enter
    hexagons
      .enter()
        .append('path')
        .datum((d) => this._makeHexagon(d))
        .attr('d', hexFn)
        .attr('fill', fillFn)
        .attr('stroke', 'red')
        .attr('stroke-width', (d, i) => {
          d;
          return DataProvider.isSelected(this.dp.samples[i], this.selectedSamples) ? 2 : 0
        })
        .on('mouseover', onMouseOver)
        .on('mouseout', onMouseOut)
        .on('mousedown', onMouseDown);

    // Update
    hexagons
      .datum((d) => this._makeHexagon(d))
      .attr('d', hexFn)
      .attr('fill', fillFn)
      .attr('stroke-width', (d, i) => {
        d;
        return DataProvider.isSelected(this.dp.samples[i], this.selectedSamples) ? 2 : 0
      })
      .on('mouseover', onMouseOver)
      .on('mouseout', onMouseOut)
      .on('mousedown', onMouseDown);

    //Remove
    hexagons
      .exit()
      .remove();
  }

  setColorMap(colors: RGBColor[], range: [number, number]) {
    this.colors = colors;
    this.dataRange = range;
    let mapRange : [number, number];

    if (this.inverted) {
      mapRange = [1, 0];
    } else {
      mapRange = [0, 1];
    }

    const scale = linearScale(this.dataRange, mapRange);
    this.colorMap = createColorMap(this.colors, scale);
    this.drawData();
  }

  setInverted(inverted: boolean) {
    this.inverted = inverted;
    this.setColorMap(this.colors, this.dataRange);
  }

  setSelectedSamples(selectedSamples: Set<string>) {
    this.selectedSamples = selectedSamples;
  }

  _makeHexagon(cart: [number, number, number]) : [number, number][] {
    const axis = this.dp.getAxis(0);
    const delta = axis.range[1] - axis.range[0];
    let radius = 1 / Math.sqrt(3) * this.edge * axis.spacing / delta;
    radius *= 0.99;
    let center = this.cartToxy(cart);
    let points: [number, number][] = [];
    for (let i = 0; i < 6; ++i) {
      let xy: [number, number] = [
        radius * Math.cos(Math.PI * (2 * i + 1) / 6) + center[0],
        radius * Math.sin(Math.PI * (2 * i + 1) / 6) + center[1],
      ]
      points.push(xy);
    }
    return points;
  }

  dataUpdated() {
    this.scales = [];
    const axes: IAxis[] = [this.dp.getAxis(0), this.dp.getAxis(1), this.dp.getAxis(2)];
    for (let i = 0; i < 3; ++i) {
      const range = axes[i] ? axes[i].range : [0, 1];
      this.scales.push(scaleLinear().domain(range).range([0, 1]));
    }
  }

  cartToxy(cart: [number, number, number]) : [number, number] {
    let xy: [number, number] = [0, 0];

    let frac = [0, 0, 0];
    for (let i = 0; i < 3; ++i) {
      frac[i] = this.scales[i](cart[i]);
    }

    xy[0] = 0.5 * ((2 * frac[1] + frac[2]) / (frac[0] + frac[1] + frac[2]));
    xy[1] = 0.5 * Math.sqrt(3) * frac[2] / (frac[0] + frac[1] + frac[2]);

    xy[0] *= this.edge;
    xy[1] *= this.edge;

    xy[0] += this.vertices[0][0];

    if (this.upsideDown) {
      xy[1] += this.vertices[0][1];
    } else {
      xy[1] = -xy[1] + this.vertices[0][1];
    }
    return xy;
  }
}

export { TernaryPlot };
