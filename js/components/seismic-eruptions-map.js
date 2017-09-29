import React, { PureComponent } from 'react'
import { Map, TileLayer } from 'react-leaflet'
import { Circle } from 'leaflet'
import EarthquakesCanvasLayer from './earthquakes-canvas-layer'
import EarthquakePopup from './earthquake-popup'
import VolcanoPopup from './volcano-popup'
import {PlatesLayerSimple, PlatesLayerComplex} from './plates-layer'
import { PlatesArrowsLayer } from './plates-arrows-layer'
import PlateMovementLayer from './plate-movement-layer'
import CrossSectionDrawLayer from './cross-section-draw-layer'
import addTouchSupport from '../custom-leaflet/touch-support'
import { mapLayer } from '../map-layer-tiles'
import log from '../logger'
import config from '../config'

import '../../css/leaflet/leaflet.css'
import '../../css/seismic-eruptions-map.less'

const INITIAL_BOUNDS = [
  [config.minLat, config.minLng],
  [config.maxLat, config.maxLng]
]

// It delays download of earthquakes data on map moveend event, so user can pan or zoom map
// a few times quickly before the download starts.
const BOUNDS_UPDATE_DELAY = 600 // ms
// When zoom level is >= than this value, plate boundaries will be rendered using more detailed data.
const COMPLEX_BOUNDARIES_MIN_ZOOM_LEVEL = 4

// Leaflet map doesn't support custom touch events by default.
addTouchSupport()

export default class SeismicEruptionsMap extends PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      selectedEarthquake: null,
      selectedVolcano: null
    }
    this.handleEarthquakeClick = this.handleEarthquakeClick.bind(this)
    this.handleEarthquakePopupClose = this.handleEarthquakePopupClose.bind(this)
    this.handleVolcanoClick = this.handleVolcanoClick.bind(this)
    this.handleVolcanoPopupClose = this.handleVolcanoPopupClose.bind(this)
    this.handleMapViewportChanged = this.handleMapViewportChanged.bind(this)
  }

  get map () {
    return this.refs.map.leafletElement
  }

  get mapRegion () {
    const bounds = this.map.getBounds()
    return [bounds.getSouthWest(), bounds.getNorthWest(), bounds.getNorthEast(), bounds.getSouthEast()]
      .map(p => [p.lat, p.lng])
  }

  get mapZoom () {
    return this.map.getZoom()
  }

  latLngToPoint (latLng) {
    return this.map.latLngToContainerPoint(latLng)
  }

  componentDidMount () {
    // Make sure that SVG overlay layer exists from the very beginning. It's created dynamically when the first
    // SVG object is added to the map. It solves / simplifies some issues. For example we don't want earthquakes
    // to be clickable when we enter cross-section drawing mode. The simplest solution is to set Canvas z-index
    // lower than SVG z-index, but it won't work if the SVG layer hasn't been created yet.
    createSVGOverlayLayer(this.map)
    // Initially Leaflet always triggers mapmove event, as probably real bounds are a bit different than
    // provided bounds (due to screen size etc.). That is causing mark2DViewModified to be called and reset view icon
    // being shown. This is unwanted, as there has been no user interaction. Mark this view unmodified again.
    const { mark2DViewModified, setMapRegion } = this.props
    mark2DViewModified(false)
    setMapRegion(this.mapRegion, this.mapZoom)

    this.map.on('click', (e) => {
      // TOOD: remove, it can be useful to tweak position of plate arrows.
      console.log('lat:', e.latlng.lat, 'lng:', e.latlng.lng)
    })
  }

  handleMapViewportChanged () {
    const { mark2DViewModified } = this.props
    mark2DViewModified(true)

    this._mapBeingDragged = false

    clearTimeout(this._boundsUpdateTimeoutID)
    this._boundsUpdateTimeoutID = setTimeout(() => {
      const { layers, setMapRegion } = this.props
      setMapRegion(this.mapRegion, this.mapZoom, layers.get('earthquakes'))

      const bounds = this.map.getBounds()
      log('MapRegionChanged', {
        minLat: bounds.getSouthWest().lat,
        minLng: bounds.getSouthWest().lng,
        maxLat: bounds.getNorthEast().lat,
        maxLng: bounds.getNorthEast().lng,
        zoom: this.mapZoom
      })
    }, BOUNDS_UPDATE_DELAY)
  }

  handleEarthquakeClick (event, earthquake) {
    // Do not open earthquake popup if click was part of the map dragging action.
    if (this._mapBeingDragged) return
    this.setState({selectedEarthquake: earthquake})
    log('EarthquakeClicked', earthquake)
  }

  handleEarthquakePopupClose () {
    this.setState({selectedEarthquake: null})
  }

  handleVolcanoPopupClose () {
    this.setState({selectedVolcano: null})
  }

  handleVolcanoClick (event, volcano) {
    if (this._mapBeingDragged) return
    this.setState({selectedVolcano: volcano})
    log('Volcano Clicked', volcano)
  }

  fitBounds (bounds = INITIAL_BOUNDS) {
    const { mark2DViewModified } = this.props
    this.map.fitBounds(bounds)
    mark2DViewModified(false)
    log('ResetMapClicked')
  }

  renderBaseLayer () {
    // #key attribute is very important here. #subdomains is not a dynamic property, so we can't reuse the same
    // component instance when we switch between maps with subdomains and without.
    const { layers } = this.props
    const layer = mapLayer(layers.get('base'))
    return <TileLayer key={layers.get('base')} url={layer.url} subdomains={layer.subdomains} attribution={layer.attribution} />
  }

  render () {
    const { mode, earthquakes, volcanoes, layers, crossSectionPoints, mapRegion, setCrossSectionPoint } = this.props
    const { selectedEarthquake, selectedVolcano } = this.state
    return (
      <div className={`seismic-eruptions-map mode-${mode}`}>
        <Map ref='map' className='map' onViewportChanged={this.handleMapViewportChanged}
          bounds={INITIAL_BOUNDS} minZoom={2} maxZoom={13}>
          {this.renderBaseLayer()}
          {layers.get('plates') && (mapRegion.get('zoom') > COMPLEX_BOUNDARIES_MIN_ZOOM_LEVEL ? <PlatesLayerComplex /> : <PlatesLayerSimple />)}
          {layers.get('platearrows') && <PlatesArrowsLayer />}
          {layers.get('platemovement') && <PlateMovementLayer />}
          {mode !== '3d' &&
            /* Performance optimization. Update of this component is expensive. Remove it when the map is invisible. */
            <EarthquakesCanvasLayer earthquakes={earthquakes} volcanoes={volcanoes}
              earthquakeClick={this.handleEarthquakeClick} volcanoClick={this.handleVolcanoClick} />
          }
          {mode === '2d' && selectedEarthquake &&
            <EarthquakePopup earthquake={selectedEarthquake} onPopupClose={this.handleEarthquakePopupClose} />
          }
          {mode === '2d' && selectedVolcano &&
            <VolcanoPopup volcano={selectedVolcano} onPopupClose={this.handleVolcanoPopupClose} />
          }
          {mode === 'cross-section' &&
            <CrossSectionDrawLayer crossSectionPoints={crossSectionPoints} setCrossSectionPoint={setCrossSectionPoint} />
          }
        </Map>
      </div>
    )
  }
}

function createSVGOverlayLayer (map) {
  map.addLayer(new Circle([0, 0], 0, {opacity: 0, fillOpacity: 0}))
}
