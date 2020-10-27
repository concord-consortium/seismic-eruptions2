import { CanvasLayer } from './canvas-layer'
import { DomUtil } from 'leaflet'
import TopView from '../3d/top-view'

export const SpritesLayer = CanvasLayer.extend({
  initialize: function (options) {
    CanvasLayer.prototype.initialize.call(this, options)
    this.draw = this.draw.bind(this)
    this.onEarthquakeClick = function (event, earthquakeData) {}
    this.onVolcanoClick = function (event, volcanoData) { }
    this.onEruptionClick = function (event, eruptionData) { }
  },

  initCanvas: function () {
    this.externalView = new TopView()
    CanvasLayer.prototype.initCanvas.call(this, this.externalView.canvas)
    DomUtil.addClass(this._canvas, 'earthquakes-canvas-layer')
  },

  setData: function (earthquakes, volcanoes, eruptions) {
    this._earthquakesToProcess = earthquakes
    this._volcanoesToProcess = volcanoes
    this._eruptionsToProcess = eruptions
    this.scheduleRedraw()
  },

  draw: function () {
    if (this._earthquakesToProcess && this._volcanoesToProcess && this._eruptionsToProcess) {
      this.externalView.setProps({
        earthquakes: this._earthquakesToProcess,
        volcanoes: this._volcanoesToProcess,
        eruptions: this._eruptionsToProcess,
        latLngToPoint: this.latLngToPoint
      })
      this._volcanoesToProcess = null
      this._earthquakesToProcess = null
      this._eruptionsToProcess = null
    }
    const transitionInProgress = this.externalView.render()
    if (transitionInProgress) {
      this.scheduleRedraw()
    }
  },

  onMouseMove (event, pos) {
    if (this.externalView.spriteAt(pos.x, pos.y)) {
      this._canvas.style.cursor = 'pointer'
    } else {
      this._canvas.style.cursor = 'inherit'
    }
  },

  onMouseClick (event, pos) {
    const sprite = this.externalView.spriteAt(pos.x, pos.y)
    if (sprite && sprite.type === 'earthquake') {
      this.onEarthquakeClick(event, sprite.data)
    } else if (sprite && sprite.type === 'volcano') {
      this.onVolcanoClick(event, sprite.data)
    } else if (sprite && sprite.type === 'eruption') {
      this.onEruptionClick(event, sprite.data)
    }
  }
})

export function spritesLayer () {
  return new SpritesLayer()
}
