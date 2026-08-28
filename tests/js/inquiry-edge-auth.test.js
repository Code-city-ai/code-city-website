import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readProjectFile = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('public inquiry calls use a publishable key without pretending it is a JWT', async () => {
  const clientSource = await readProjectFile('src/lib/inquiries.js');

  assert.match(clientSource, /apikey:\s*anonKey/);
  assert.doesNotMatch(clientSource, /Authorization:\s*`Bearer\s+\$\{anonKey\}`/);
});

test('submit-inquiry verifies publishable keys inside the function', async () => {
  const [config, functionSource] = await Promise.all([
    readProjectFile('supabase/config.toml'),
    readProjectFile('supabase/functions/submit-inquiry/index.ts'),
  ]);

  assert.match(config, /\[functions\.submit-inquiry\]\s+verify_jwt\s*=\s*false/);
  assert.match(functionSource, /withSupabase\(\s*\{\s*auth:\s*'publishable',\s*cors:\s*'disabled'\s*\}/);
  assert.match(functionSource, /const supabase = context\.supabaseAdmin/);
  assert.doesNotMatch(functionSource, /createClient\(/);
});
