const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// Runs after `next build`. The standalone server doesn't include its static
// assets, so they have to be copied in next to it.
fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, '.next', 'standalone'), dist, { recursive: true });
fs.cpSync(path.join(root, '.next', 'static'), path.join(dist, '.next', 'static'), { recursive: true });

// GitLab and GitHub Actions each set their own variable; neither exists when building locally.
const buildInfo = {
  commit: process.env.CI_COMMIT_SHORT_SHA || process.env.GITHUB_SHA?.slice(0, 7) || 'local',
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(dist, 'build-info.json'), JSON.stringify(buildInfo, null, 2));

console.log('Build complete:', buildInfo);
