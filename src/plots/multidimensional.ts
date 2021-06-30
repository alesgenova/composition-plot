import { linearScale, RGBColor } from '@colormap/core';

import { DataProvider, ICompositionToPositionProvider } from '../data-provider/multidimensional';

import 'vtk.js';
import { hexTorgb } from '../utils/colors';
import { ISample, Vec2 } from '../types';
declare const vtk: any;

/**
 * Creates a new vtkCamera object
 * 
 * @returns A new instance of a vtkCamera
 * 
 * @public
 * 
 */
function makeCamera() {
  return vtk.Rendering.Core.vtkCamera.newInstance();
}

/**
 * Class that creates a multidimensional composition plot (2,3,4,5,6,7,8-dimensional) in 3D
 * 
 * The position of the samples is affected as follows:
 * - 2-d: Line
 * - 3-d: Triangle
 * - 4-d: Tetrahedron
 * - 5,6,7,8-d: Predefined tabulated positions
 * 
 * @public
 *  
 */
class MultidimensionalPlot {
  div: HTMLElement;
  dp: DataProvider;
  range: Vec2;
  colors: RGBColor[];
  compositionToPosition: ICompositionToPositionProvider;
  compositionSpace: string[] | undefined;
  inverted: boolean;
  viewer;
  polyData;
  renderer;
  renderWindow;
  mapper;
  actor;
  lut;
  linesPolyData;
  linesMapper;
  linesActor;
  labelWidgets = [];
  radiusFn: (sample: ISample) => number = () => 1.5;

  /**
   * The constructor of MultidimensionalPlot
   * 
   * @param div - The container that will include all graphical elements
   * @param dp - The DataProvider with the samples and figures of merit
   * @param compositionToPosition - The object in charge of determining the position of the samples in 3D
   */
  constructor(
    div: HTMLElement, dp: DataProvider, compositionToPosition: ICompositionToPositionProvider
  ) {
    this.div = div;
    this.dp = dp;
    this.compositionToPosition = compositionToPosition;
    this.range = [0, 1];
    this.colors = [[0, 0, 0], [1, 1, 1]];
    this.inverted = false;

    this.viewer = vtk.Rendering.Misc.vtkGenericRenderWindow.newInstance();
    this.viewer.setBackground(0.9, 0.9, 0.9);
    this.viewer.setContainer(this.div);
    this.viewer.resize();
    this.renderer = this.viewer.getRenderer();
    this.renderWindow = this.viewer.getRenderWindow();
    this.polyData = vtk.Common.DataModel.vtkPolyData.newInstance();
    this.mapper = vtk.Rendering.Core.vtkSphereMapper.newInstance();
    this.actor = vtk.Rendering.Core.vtkActor.newInstance();
    this.lut = vtk.Rendering.Core.vtkColorTransferFunction.newInstance();

    this.mapper.setUseLookupTableScalarRange(true);
    this.mapper.setInputData(this.polyData);
    this.mapper.setScaleArray('sizes');
    this.mapper.setLookupTable(this.lut);
    this.actor.setMapper(this.mapper);
    this.renderer.addActor(this.actor);

    this.linesPolyData = vtk.Common.DataModel.vtkPolyData.newInstance();
    this.linesMapper = vtk.Rendering.Core.vtkMapper.newInstance();
    this.linesActor = vtk.Rendering.Core.vtkActor.newInstance();

    this.linesMapper.setInputData(this.linesPolyData);
    this.linesActor.setMapper(this.linesMapper);
    this.linesActor.getProperty().setColor([0, 0, 0]);
    this.renderer.addActor(this.linesActor);
    
    (window as any).widget3d = this;

    this.resize();
  }

  /**
   * Resize the 3D canvas to span the container size
   * 
   * @public
   * 
   */
  resize() {
    const {width, height} = this.div.getBoundingClientRect();
    this.viewer.getOpenGLRenderWindow().setSize(width, height);
    this.renderWindow.render();
  }

  /**
   * Set the background color of the 3D canvas
   * 
   * @param color - The background color
   * 
   * @public
   * 
   */
  setBackground(color: RGBColor | string) {
    if (Array.isArray(color)) {
      this.viewer.setBackground(...color);
    } else {
      this.viewer.setBackground(...hexTorgb(color.replace('#', '')));
    }
    this.renderWindow.render();
  }

  /**
   * Set the function that determines the radius of each sample
   * 
   * @param radiusFn 
   * 
   * @public
   */
  setRadiusFn(radiusFn: (sample: ISample) => number) {
    this.radiusFn = radiusFn;
    this.updateSizesArray();
  }

  /**
   * Set a specific vtkCamera object to be used
   * 
   * This is useful if there are multiple composition plots that need to have their camera sychronized
   * 
   * @param camera - The vtkCamera object to be used (can be shared) 
   * @param resetCamera - Reset the camera zoom to include the whole scene
   * @param watchModified - Whether to re-render each time the camera object is modified 
   * 
   * @public
   * 
   */
  setCamera(camera, resetCamera = false, watchModified = false) {
    this.renderer.setActiveCamera(camera);

    if (resetCamera) {
      this.renderer.resetCamera();
    }

    if (watchModified) {
      camera.onModified(() => {
        this.renderWindow.render();
      });
    }

    this.renderWindow.render();
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
   * Change the way samples are mapped to the 3D space based on their composition
   * 
   * @param compositionToPosition - The object in charge of determining the position of the samples in 3D
   * 
   * @public
   * 
   */
  setCompositionToPosition(compositionToPosition: ICompositionToPositionProvider) {
    this.compositionToPosition = compositionToPosition;
  }

  /**
   * Get the vtkCamera object of this composition plot
   * 
   * @returns a vtkCamera object
   * 
   * @public
   * 
   */
  getCamera() {
    return this.renderer.getActiveCamera();
  }

  /**
   * The data in the DataProvider have changed, redraw the entire plot
   * 
   * @public
   * 
   */
  dataUpdated() {
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
    const nSamples = samples.length;
    const coords = new Float32Array(3 * nSamples);
    const scalars = {};
    const scalarKeys = this.dp.getScalars();
    for (let key of scalarKeys) {
      scalars[key] = new Float32Array(nSamples);
    }

    let elements: string[] = this.compositionSpace ? [...this.compositionSpace] : this.dp.getElements();

    if (elements.length < this.compositionToPosition.getDimensions()) {
      let extra = this.compositionToPosition.getDimensions() - elements.length;
      for (let i = 0; i < extra; ++i ) {
        elements.push('');
      }
    } else if (elements.length > this.compositionToPosition.getDimensions()) {
      return;
      // throw new Error(`The composition space ${elements} is larger than 8`);
    }

    for (let i = 0; i < nSamples; ++i) {
      let sample = samples[i];
      let composition = elements.map(key => sample.composition[key] || 0.0);
      let position = this.compositionToPosition.getPosition(composition);
      coords[3 * i] = position[0];
      coords[3 * i + 1] = position[1];
      coords[3 * i + 2] = position[2];
      for (let key of scalarKeys) {
        scalars[key][i] = DataProvider.getSampleScalar(sample, key) || 0.0;
      }
    }
    this.polyData.getPoints().setData(coords);
    for (let key of scalarKeys) {
      this.polyData.getPointData().addArray(
        vtk.Common.Core.vtkDataArray.newInstance({name: key, values: scalars[key]})
      );
    }

    this.addLabels();
    this.addLines();

    this.polyData.getPointData().setActiveScalars(this.dp.getActiveScalar());
    this.updateSizesArray();
    this.polyData.modified();
    this.renderer.resetCamera();
    this.renderWindow.render();
  }

  /**
   * Rerender after the sample radius function has been modified
   */
  updateSizesArray() {
    const samples = this.dp.getSamples();
    const nSamples = samples.length;
    const sizes = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; ++i) {
      let sample = samples[i];
      sizes[i] = this.radiusFn(sample);
    }
    this.polyData.getPointData().addArray(
      vtk.Common.Core.vtkDataArray.newInstance({name: 'sizes', values: sizes})
    );
    this.polyData.modified();
    this.renderWindow.render();
  }

  addLabels() {
    this.removeLabels();
    const elements = this.compositionSpace || this.dp.getElements();
    const composition = new Array(elements.length);
    for (let i = 0; i < elements.length; ++i) {
      for (let j = 0; j < this.compositionToPosition.getDimensions(); ++j) {
        composition[j] = 0.0;
      }
      composition[i] = 1.0;
      let position = this.compositionToPosition.getPosition(composition)
        .map(val => 1.2 * val);
      const labelWidget = vtk.Interaction.Widgets.vtkLabelWidget.newInstance();
      labelWidget.setInteractor(this.renderWindow.getInteractor());
      labelWidget.setEnabled(1);
      labelWidget.setProcessEvents(false);
      labelWidget.getWidgetRep().setLabelText(elements[i]);
      labelWidget.getWidgetRep().setWorldPosition(position);
      this.labelWidgets.push(labelWidget);
    }
  }

  addLines() {
    const elements = this.compositionSpace || this.dp.getElements();
    const composition = new Array(elements.length);

    this.removeLines();

    if (elements.length > 4) {
      return;
    }

    const points = new Float32Array(elements.length * 3);
    const lines = new Uint32Array(3 * elements.length * (elements.length - 1) / 2);

    for (let i = 0; i < elements.length; ++i) {
      for (let j = 0; j < this.compositionToPosition.getDimensions(); ++j) {
        composition[j] = 0.0;
      }
      composition[i] = 1.0;
      let position = this.compositionToPosition.getPosition(composition);
      points[i * 3] = position[0];
      points[i * 3 + 1] = position[1];
      points[i * 3 + 2] = position[2];
    }

    let k = 0;
    for (let i = 0; i < elements.length - 1; ++i) {
      for (let j = i + 1; j < elements.length; ++j) {
        lines[3 * k] = 2;
        lines[3 * k + 1] = i;
        lines[3 * k + 2] = j;
        ++k;
      }
    }

    this.linesPolyData.getPoints().setData(points);
    this.linesPolyData.getLines().setData(lines);
    this.linesPolyData.modified();
  }

  removeLabels() {
    for (let labelWidget of this.labelWidgets) {
      labelWidget.setEnabled(0);
    }
  }

  removeLines() {
    this.linesPolyData.getPoints().setData(new Float32Array(0));
    this.linesPolyData.getLines().setData(new Uint32Array(0));
  }

  /**
   * Rerender after the active figure of merit has changed
   */
  activeScalarsUpdated() {
    this.polyData.getPointData().setActiveScalars(this.dp.getActiveScalar());
    this.polyData.modified();
    this.renderWindow.render();
  }

  /**
   * Set the colormap used to color samples based on a figure of merit
   * 
   * @param map - The array of colors representing the map
   * @param range - The range of the map
   * 
   * @public
   * 
   */
  setColorMap(map: RGBColor[], range: Vec2) {
    this.lut.removeAllPoints();
    this.range = range;
    this.colors = map;

    let mapRange: Vec2;
    if (this.inverted) {
      mapRange = [range[1], range[0]];
    } else {
      mapRange = [range[0], range[1]];
    }

    let scale = linearScale([0, map.length], mapRange);

    for (let i = 0; i < map.length; ++i) {
      let x = scale(i);
      this.lut.addRGBPoint(x, ...map[i]);
    }
    this.renderWindow.render();
  }

  /**
   * Invert the direction of the colormap
   * 
   * @param inverted - Whether to invert
   * 
   * @public
   * 
   */
  setInverted(inverted: boolean) {
    this.inverted = inverted;
    this.setColorMap(this.colors, this.range);
  }
}

export { MultidimensionalPlot, makeCamera };
