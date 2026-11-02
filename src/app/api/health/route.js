import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

// build-info.json only exists in dist/, where the build step generates it.
async function loadCommit() {
  try {
    const file = await readFile(path.join(process.cwd(), 'build-info.json'), 'utf8');
    return JSON.parse(file).commit;
  } catch {
    return 'local';
  }
}

export async function GET() {
  return Response.json({ status: 'ok', commit: await loadCommit() });
}
