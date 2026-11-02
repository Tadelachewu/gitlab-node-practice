const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function withServer(run) {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    await run(`http://localhost:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET / returns the greeting', async () => {
  await withServer(async (url) => {
    const res = await fetch(url);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { message: 'Hello from GitLab CI/CD!' });
  });
});

test('GET /health reports ok', async () => {
  await withServer(async (url) => {
    const res = await fetch(`${url}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });
});

test('unknown routes return 404', async () => {
  await withServer(async (url) => {
    const res = await fetch(`${url}/nope`);
    assert.equal(res.status, 404);
  });
});
