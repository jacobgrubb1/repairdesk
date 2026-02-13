const { execSync } = require('child_process');
const path = require('path');

process.chdir(path.join(__dirname, 'client'));
const vitePath = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
execSync(`"${process.execPath}" "${vitePath}"`, { stdio: 'inherit' });
