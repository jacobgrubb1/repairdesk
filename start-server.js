const { execSync } = require('child_process');
const path = require('path');

process.chdir(path.join(__dirname, 'server'));
execSync(`"${process.execPath}" --watch src/index.js`, { stdio: 'inherit' });
