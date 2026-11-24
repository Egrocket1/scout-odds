import assert from 'node:assert/strict';
import { ask, parseOdds } from './odds.mjs';

const limit = parseOdds('under 60 cents');
for (const cents of [59, 60]) {
  const quote = ask({yes_ask: cents, yes_ask_size_fp: 5}, 'yes', limit);
  assert.equal(quote.eligible, cents < 60);
  console.log(cents, 'cents:', quote.eligible ? 'within limit' : 'excluded');
}
assert.equal(ask({yes_ask: 59, yes_ask_size_fp: 0}, 'yes', limit), null);
