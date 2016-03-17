import Immutable, { Map, Set } from 'immutable'
import {
  REQUEST_DATA, RECEIVE_DATA, RECEIVE_EARTHQUAKES, RECEIVE_REGION, RECEIVE_ERROR, INVALIDATE_DATA,
  SET_MIN_MAG, SET_MAX_MAG, SET_MIN_TIME, SET_MAX_TIME
} from '../actions'

function dataStatus(state = Map(), action) {
  switch (action.type) {
    case INVALIDATE_DATA:
      return state.set('didInvalidate', true)
    case REQUEST_DATA:
      return state.set('isFetching', true)
    case RECEIVE_DATA:
      return state.set('isFetching', false)
                  .set('didInvalidate', false)
                  .set('error', null)
                  .set('lastUpdated', action.receivedAt)
    case RECEIVE_ERROR:
      return state.set('isFetching', false)
                  .set('didInvalidate', false)
                  .set('error', action.response)
                  .set('lastUpdated', action.receivedAt)
    default:
      return state
  }
}

function region(state = Map(), action) {
  switch (action.type) {
    case RECEIVE_REGION:
      const data = action.response
      const bounds = [
        [data.minLatitude, data.minLongitude],
        [data.maxLatitude, data.maxLongitude]
      ]
      return state.set('bounds', bounds)
                  .set('restricted', data.restrictedView)
    default:
      return state
  }
}

function data(state = null, action) {
  switch (action.type) {
    case RECEIVE_EARTHQUAKES:
      // Don't use ImmutableJS - this data is too big and it would also affect filtering time.
      return swapCoords(action.response)
    default:
      return state
  }
}

const INITIAL_FILTERS = Map({
  minMag: 0,
  maxMag: 10,
  minTime: -Infinity,
  maxTime: Infinity
})
function filters(state = INITIAL_FILTERS, action) {
  switch (action.type) {
    case RECEIVE_EARTHQUAKES:
      const times = action.response.features.map(eq => eq.properties.time)
      return state.set('minTime', Math.min(...times))
                  .set('maxTime', Math.max(...times))
    case SET_MIN_MAG:
      return state.set('minMag', action.value)
    case SET_MAX_MAG:
      return state.set('maxMag', action.value)
    case SET_MIN_TIME:
      return state.set('minTime', action.value)
    case SET_MAX_TIME:
      return state.set('maxTime', action.value)
    default:
      return state
  }
}

const INITIAL_STATE = Map({
  filteredEarthquakes: []
})
export default function reducer(state = INITIAL_STATE, action) {
  const oldData = state.get('data')
  const newData = data(oldData, action)
  const oldFilters = state.get('filters')
  const newFilters = filters(oldFilters, action)
  // We can use simple comparison as we use ImmutableJS structures.
  const filtersOrDataUpdated = oldData !== newData || oldFilters !== newFilters
  return state.set('dataStatus', dataStatus(state.get('dataStatus'), action))
              .set('region', region(state.get('region'), action))
              .set('data', newData)
              .set('filters', newFilters)
              // Update filtered earthquakes only if data or filters have been changed.
              // Otherwise, reuse old data. It ensures that we won't update React components when it's not needed.
              .set('filteredEarthquakes', newData && filtersOrDataUpdated ? calcEarthquakes(newData, newFilters) : state.get('filteredEarthquakes'))
}

const calcEarthquakes = (data, filters) => {
  const minMag = filters.get('minMag')
  const maxMag = filters.get('maxMag')
  const minTime = filters.get('minTime')
  const maxTime = filters.get('maxTime')
  console.time('eq filtering')
  // Two important notes:
  // - Make sure that result is always a new Array instance, so pure components can detect it's been changed.
  // - Yes, I don't copy and do mutate data.features elements. It's been done due to performance reasons.
  const result = data.features.map(eq => {
    const props = eq.properties
    eq.visible = props.mag > minMag &&
                 props.mag < maxMag &&
                 props.time > minTime &&
                 props.time < maxTime
    return eq
  })
  console.timeEnd('eq filtering')
  return result
}

const swapCoords = (data) => {
  data.features.forEach(eq => {
    const tmp = eq.geometry.coordinates[0]
    eq.geometry.coordinates[0] = eq.geometry.coordinates[1]
    eq.geometry.coordinates[1] = tmp
  })
  return data
}
