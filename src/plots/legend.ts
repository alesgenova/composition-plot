import { Vec2, Vec3 } from "../types";
import { linearScale, createColorMap, Scale } from '@colormap/core';
import { select } from 'd3-selection';

export class BaseLegend {
  colors: Vec3[];
  direction: 'horizontal' | 'vertical';
  container: HTMLDivElement
  image: HTMLImageElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  imageData: ImageData;
  nPoints: number;
  fontSize: number = 0.8;
  wrapper: HTMLDivElement;
  opacity: number;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.colors = [[0, 0, 0], [1, 1, 1]];
    this.nPoints = 128;
    this.opacity = 1;
    this.direction = 'vertical';
    this.wrapper = document.createElement('div');
    this.wrapper.style.width = '100%';
    this.wrapper.style.height = '100%';
    this.wrapper.style.position = 'relative';
    this.image = document.createElement('img');
    this.canvas = document.createElement('canvas');
    this.setDirection('vertical');
    this.context = this.canvas.getContext('2d')!;
    this.wrapper.appendChild(this.image);
    this.container.appendChild(this.wrapper);
  }

  /**
   * Set the colors that will be displayed by the legend
   * 
   * @param colors - The colors
   * 
   * @public
   * 
   */
  setColors(colors: Vec3[]) {
    this.colors = [...colors];
  }

  /**
   * Set the orientation of the legend bar (horizontal/vertical)
   * 
   * @param direction - The direction
   * 
   * @public
   * 
   */
  setDirection(direction: 'horizontal' | 'vertical') {
    this.direction = direction;
    if (direction === 'horizontal') {
      this.canvas.width = this.nPoints;
      this.canvas.height = 1;
      this.image.style.position = 'absolute';
      this.image.style.width = '100%';
      this.image.style.height = '1rem';
      this.image.style.bottom = '0';
      this.container.style.paddingBottom = '0';
      this.container.style.paddingTop = '0';
      this.container.style.paddingLeft = `${0.5 * this.fontSize}rem`;
      this.container.style.paddingRight = `${0.5 * this.fontSize}rem`;
      this.imageData = new ImageData(this.nPoints, 1);
    } else {
      this.canvas.height = this.nPoints;
      this.canvas.width = 1;
      this.image.style.position = 'absolute';
      this.image.style.width = '1rem';
      this.image.style.height = '100%';
      this.container.style.paddingLeft = '0';
      this.container.style.paddingRight = '0';
      this.container.style.paddingTop = `${0.5 * this.fontSize}rem`;
      this.container.style.paddingBottom = `${0.5 * this.fontSize}rem`;
      this.imageData = new ImageData(1, this.nPoints);
    }
  }

  /**
   * Set the global opacity of the legend bar
   * 
   * @param opacity - The global opacity
   * 
   * @public
   * 
   */
  setOpacity(opacity: number) {
    this.opacity = opacity;
  }
}

/**
 * Concrete class that draws a legend bar for a colormap a continuous range
 * 
 * @public
 * 
 */
export class ColorMapLegend extends BaseLegend {
  range: Vec2;
  digits: number;
  inverted: boolean;

  /**
   * The ColorMapLegend constructor
   * 
   * @param container - The div element that will be used as parent for the graphical elements
   * 
   * @public
   */
  constructor(container: HTMLDivElement) {
    super(container);
    this.range = [0, 1];
    this.nPoints = 128;
    this.digits = 1;
    this.inverted = false;
    this.draw();
  }

  /**
   * Set the numerical range
   * 
   * @param range - The range spanned by the legend
   * 
   * @public
   */
  setRange(range: Vec2) {
    this.range = [range[0], range[1]];
  }

  /**
   * Set the number of decimal digits used in the tick labels
   * 
   * @param digits - The range number of decimal digits
   * 
   * @public
   */
  setDigits(digits: number) {
    this.digits = digits;
  }

  /**
   * Set wheter the direction of the legend should be MAX -> MIN
   * 
   * @param inverted - Invert the legend direction
   * 
   * @public
   */
  setInverted(inverted: boolean) {
    this.inverted = inverted;
  }

  /**
   * Re-draw the graphical elements
   * 
   * @public
   */
  draw() {
    this.drawMap();
    this.drawTicks();
  }

  private drawMap() {
    let scale: Scale;
    if (this.inverted) {
      if (this.direction === 'horizontal') {
        scale = linearScale([0, this.nPoints -1], [1, 0]);
      } else {
        scale = linearScale([0, this.nPoints -1], [0, 1]);
      }
    } else {
      if (this.direction === 'horizontal') {
        scale = linearScale([0, this.nPoints -1], [0, 1]);
      } else {
        scale = linearScale([0, this.nPoints -1], [1, 0]);
      }
    }
    
    const colorMap = createColorMap(this.colors, scale);

    for (let i = 0; i < this.nPoints; ++i) {
      colorMap(i).concat(this.opacity)
        .map(v => v * 255)
        .forEach((c, j) => {
          this.imageData.data[i * 4 + j] = c;
        });
    }

    this.context.putImageData(this.imageData, 0, 0);
    this.image.src = this.canvas.toDataURL();
  }

  private drawTicks() {
    const nTicks = 5;
    const ticks : number[] = [];
    const scale = linearScale([0, nTicks - 1], this.range);
    for (let i = 0; i < nTicks; ++i) {
      ticks.push(scale(i));
    }

    const spans = select(this.wrapper).selectAll('span').data(ticks);

    const setupSpans = (selection: any) => {
      let bottom : any;
      let left: any;
      let transform: string;
      if (this.direction === 'horizontal') {
        left = (_d: number, i: number) => `${i / (nTicks - 1) * 100}%`;
        bottom = '1.5rem';
        transform = 'translateX(-50%)';
      } else {
        bottom = (_d: number, i: number) => `${i / (nTicks - 1) * 100}%`;
        left = '1.5rem';
        transform = 'translateY(50%)';
      }
      selection
        .text((d: number) => d.toFixed(this.digits))
        .style('position', 'absolute')
        .style('font-size', `${this.fontSize}rem`)
        .style('bottom', bottom)
        .style('transform', transform)
        .style('left', left);
    }

    // Enter
    setupSpans(spans.enter().append('span'));
    // Update
    setupSpans(spans);
    // Remove
    spans.exit().remove();
  }
}

/**
 * Concrete class that draws a legend for a discrete set of categories
 */
export class CategoryLegend extends BaseLegend {
  labels: string[];

  /**
   * The CategoryLegend constructor
   * 
   * @param container - The div element that will be used as parent for the graphical elements
   * 
   * @public
   */
  constructor(container: HTMLDivElement) {
    super(container);
    this.nPoints = 128;
    this.labels = ['0', '1'];
    this.image.style.setProperty('image-rendering', '-webkit-crisp-edges');
    this.image.style.setProperty('image-rendering', '-moz-crisp-edges');
    this.image.style.setProperty('image-rendering', 'pixelated');
    this.draw();
  }

  /**
   * Set the category labels
   * 
   * @param labels - The names of the categories
   * 
   * @public 
   */
  setLabels(labels: string[]) {
    this.labels = [...labels];
  }

  /**
   * Re-draw the graphical elements
   * 
   * @public
   */
  draw() {
    this.drawMap();
    this.drawTicks();
  }

  private drawMap() {
    const nLabels = this.labels.length;
    const nColors = this.colors.length;
    const nCategories = Math.max(nLabels, nColors);

    for (let i = 0; i < this.nPoints; ++i) {
      const iCategory = Math.floor(nCategories * i / this.nPoints);
      let label = '';
      let color = [1, 1, 1];

      if (iCategory < nLabels) {
        label = this.labels[iCategory];
      }
      label;

      if (iCategory < nColors) {
        color = [...this.colors[iCategory]];
      }

      color.concat(this.opacity)
        .map(v => v * 255)
        .forEach((c, j) => {
          this.imageData.data[i * 4 + j] = c;
        });
    }

    this.context.putImageData(this.imageData, 0, 0);
    this.image.src = this.canvas.toDataURL();
  }

  private drawTicks() {
    const nLabels = this.labels.length;
    const nColors = this.colors.length;
    const nCategories = Math.max(nLabels, nColors);

    const nTicks = nCategories;
    const ticks : string[] = [];
    for (let i = 0; i < nTicks; ++i) {
      ticks.push(this.labels[i] || '');
    }

    const spans = select(this.wrapper).selectAll('span').data(ticks);

    const setupSpans = (selection: any) => {
      let bottom : any;
      let left: any;
      let transform: string;
      if (this.direction === 'horizontal') {
        left = (_d: number, i: number) => `${(i + 0.5) / (nTicks) * 100}%`;
        bottom = '1.5rem';
        transform = 'translateX(-50%)';
      } else {
        bottom = (_d: number, i: number) => `${(1 - (i + 0.5) / (nTicks)) * 100}%`;
        left = '1.5rem';
        transform = 'translateY(50%)';
      }
      selection
        .text((d: string) => d)
        .style('position', 'absolute')
        .style('font-size', `${this.fontSize}rem`)
        .style('bottom', bottom)
        .style('transform', transform)
        .style('left', left);
    }

    // Enter
    setupSpans(spans.enter().append('span'));
    // Update
    setupSpans(spans);
    // Remove
    spans.exit().remove();
  }
}
