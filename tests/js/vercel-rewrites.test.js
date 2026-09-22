import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = JSON.parse(
  await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'),
);

test('every canonical Trade City entry path proxies to the existing Cloud Run mount', () => {
  const destination = 'https://tradecity-backend-hoh5niianq-uc.a.run.app/trade-city/';
  const rewrites = new Map(config.rewrites.map((rewrite) => [rewrite.source, rewrite.destination]));

  assert.equal(rewrites.get('/trade-city'), destination);
  assert.equal(rewrites.get('/trade-city/'), destination);
  assert.equal(
    rewrites.get('/trade-city/:path*'),
    'https://tradecity-backend-hoh5niianq-uc.a.run.app/trade-city/:path*',
  );
  assert.equal(config.rewrites.filter(({ source }) => source === '/trade-city/').length, 1);
});
