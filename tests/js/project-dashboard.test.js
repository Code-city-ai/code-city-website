import assert from 'node:assert/strict';
import test from 'node:test';
import { curveGeometry, money, numberOrNull, percent } from '../../src/admin/projects/data.js';
test('unavailable data is never rendered as a zero balance or return', () => {
  for (const value of [null, undefined, '', ' ', false, [], 'bad', Infinity]) {
    assert.equal(numberOrNull(value),null); assert.equal(money(value),'—'); assert.equal(percent(value),'—');
  }
  assert.equal(money('0'),'$0.00'); assert.equal(percent('-2.1'),'-2.10%');
});
test('unknown currency is not labelled USD; geometry preserves negative and flat returns', () => {
  assert.equal(money(42,null),'42');
  assert.equal(curveGeometry([{ cumulative_pnl:null }]).path,'');
  const curve=curveGeometry([{cumulative_pnl:'0'},{cumulative_pnl:'-20'},{cumulative_pnl:'30'}]);
  assert.equal(curve.min,-20); assert.equal(curve.max,30);
  assert.ok(curve.points[1].y>curve.points[2].y);
  assert.ok(!curveGeometry([{cumulative_pnl:'0'},{cumulative_pnl:'0'}]).path.includes('NaN'));
});
