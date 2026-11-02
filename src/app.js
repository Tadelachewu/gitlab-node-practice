const http = require('node:http');

// build-info.json only exists in dist/, where the build step generates it.
function loadBuildInfo() {
  try {
    return require('./build-info.json');
  } catch {
    return { commit: 'local' };
  }
}

function createApp() {
  const buildInfo = loadBuildInfo();

  return http.createServer((req, res) => {
    const routes = {
      '/': { message: 'Hello from GitLab CI/CD!' },
      '/health': { status: 'ok', commit: buildInfo.commit },
    };
    const body = routes[req.url];

    res.writeHead(body ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body ?? { error: 'Not found' }));
  });
}

module.exports = { createApp };
