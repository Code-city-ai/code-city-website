import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readProjectFile = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('the single public team sign-in entry is at the top of the home hero', async () => {
  const [heroSource, layoutSource, appSource] = await Promise.all([
    readProjectFile('src/components/landing/Hero.jsx'),
    readProjectFile('src/Layout.jsx'),
    readProjectFile('src/App.jsx'),
  ]);

  assert.match(heroSource, /className="hero-team-signin" href="\/sign-in"/);
  assert.doesNotMatch(layoutSource, /Team sign-in|href="\/sign-in"/);
  assert.match(appSource, /pathname === '\/sign-in'/);
});
