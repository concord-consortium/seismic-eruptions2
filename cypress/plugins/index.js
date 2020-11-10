// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************
const { addMatchImageSnapshotPlugin } = require('cypress-image-snapshot/plugin')

module.exports = (on, config) => {
  on('before:browser:launch', (browser, launchOptions) => {
    // Note that it needs to match or exceed viewportHeight and viewportWidth values specified in cypress.json.
    if (browser.name === 'electron') {
      launchOptions.preferences['width'] = 1280
      launchOptions.preferences['height'] = 1000
      launchOptions.preferences['resizable'] = false
    } else if (browser.name === 'chrome') {
      launchOptions.args.push('--window-size=1280,1000')
      launchOptions.args.push('--force-device-scale-factor=1')
    }
    return launchOptions
  })

  addMatchImageSnapshotPlugin(on, config)
}
