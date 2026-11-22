import {setTimeout} from 'node:timers/promises';

const origin = 'https://adigunelectrocad.hephzibahbehulah.com';
const expected = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(expected ?? '')) throw new Error('Expected source commit SHA required');
const request = (path, init) => fetch(origin + path, {
  redirect:'error',
  signal:AbortSignal.timeout(8_000),
  ...init,
});

for (let attempt = 0; attempt < 8; attempt++) {
  try {
    const release = await request('/release.json?verify=' + expected);
    if (!release.ok || (await release.json()).sourceCommit !== expected) throw new Error('Release marker differs from the expected commit');
    const home = await request('/?verify=' + expected);
    if (!home.ok || !home.headers.get('content-type')?.includes('text/html')) throw new Error('Editor entrypoint is unavailable');
    const endpoint = await request('/api/account', {headers:{Origin:origin}});
    if (endpoint.status !== 405 || (await endpoint.json()).error !== 'method-not-allowed') {
      throw new Error('The product account endpoint did not respond as expected');
    }
    console.log('Verified ElectroCAD ' + expected + ', editor and account routing');
    break;
  } catch (error) {
    if (attempt === 7) throw error;
    await setTimeout(6_000);
  }
}
