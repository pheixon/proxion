const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8'), context);
module.exports = context.window.SITE_CONFIG.sanity;
