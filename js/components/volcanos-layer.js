import React, { Component } from 'react'
import pureRender from 'pure-render-decorator'
import { MapLayer } from 'react-leaflet'
import { volcanoCanvasLayer } from '../custom-leaflet/volcano-canvas-layer'
import points from '../data/volcanos.js'


let _cachedPoints
function getPoints(map) {
  if (!_cachedPoints) {
    _cachedPoints = [];
    if (points) {
      for (var i = 0; i < points.length; i++)
      {
        let lat = points[i][0]
        let lng = points[i][1]
        let date = points[i][2]
        let pos = {
          position: { lng: lng, lat: lat },
          date: date
        }
        _cachedPoints.push(pos);
      }
    }
  }
  return _cachedPoints
}

@pureRender
export default class VolcanoLayer extends MapLayer {
  componentWillMount() {
    super.componentWillMount();
    this.leafletElement = volcanoCanvasLayer()
    this.setLeafletElementProps()
  }

  componentDidUpdate() {
   this.setLeafletElementProps()
  }

  setLeafletElementProps() {
    const { volcanoPoints, map } = this.props
    this.leafletElement.setVolcanoPoints(getPoints(map))
  }

  render() {
    return null
  }
}
