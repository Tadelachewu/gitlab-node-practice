const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// Runs after `next build`. The standalone server doesn't include its static
// assets, so they have to be copied in next to it.
fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, '.next', 'standalone'), dist, { recursive: true });
fs.cpSync(path.join(root, '.next', 'static'), path.join(dist, '.next', 'static'), { recursive: true });

// BUILD_COMMIT is passed in by the Docker build; it is undefined when building locally.
const buildInfo = {
  commit: process.env.BUILD_COMMIT || 'local',
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(dist, 'build-info.json'), JSON.stringify(buildInfo, null, 2));

console.log('Build complete:', buildInfo);
