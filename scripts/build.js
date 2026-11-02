const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, 'src'), dist, { recursive: true });

// CI_COMMIT_SHORT_SHA is set by GitLab; it is undefined when building locally.
const buildInfo = {
  commit: process.env.CI_COMMIT_SHORT_SHA || 'local',
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(dist, 'build-info.json'), JSON.stringify(buildInfo, null, 2));

console.log('Build complete:', buildInfo);
