import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseMission } from '../src/mission.js';
import { buildConfiguration } from '../src/configuration.js';
import { applyWaiver, assertIcdChangeAllowed, validateWaiver } from '../src/icd.js';

async function loadConfig() {
  const raw = await readFile(new URL('../fixtures/mission.json', import.meta.url), 'utf8');
  return buildConfiguration(parseMission(raw));
}

test('冻结后的豁免必须给出适用载荷、截止条件和复验要求', async () => {
  const config = await loadConfig();
  const base = {
    id: 'WV-02',
    applicable_payloads: ['SAT-4'],
    cutoff: '2026-10-01T00:00:00Z',
    re_verification: '复测分离插头导通'
  };
  assert.equal(validateWaiver(base, config).valid, true);
  assert.equal(validateWaiver({ ...base, applicable_payloads: [] }, config).valid, false);
  assert.equal(validateWaiver({ ...base, cutoff: '' }, config).valid, false);
  assert.equal(validateWaiver({ ...base, re_verification: '' }, config).valid, false);
  assert.equal(validateWaiver({ ...base, applicable_payloads: ['SAT-99'] }, config).valid, false);
  // 已过截止条件的豁免无效。
  const expired = validateWaiver(base, config, '2026-10-02T00:00:00Z');
  assert.equal(expired.valid, false);
});

test('冻结后的变更必须引用覆盖该载荷的有效豁免', async () => {
  const config = await loadConfig();
  // 无豁免：拒绝。
  assert.throws(
    () => assertIcdChangeAllowed(config.icd, { payload_id: 'SAT-6' }, config),
    /豁免/
  );
  // WV-01 覆盖 SAT-6：放行。
  assertIcdChangeAllowed(config.icd, { payload_id: 'SAT-6', waiver_id: 'WV-01' }, config);
  // WV-01 不覆盖 SAT-5：拒绝。
  assert.throws(
    () => assertIcdChangeAllowed(config.icd, { payload_id: 'SAT-5', waiver_id: 'WV-01' }, config),
    /不适用/
  );
});

test('豁免只在冻结后登记且要素齐全', async () => {
  const config = await loadConfig();
  const waiver = {
    id: 'WV-03',
    applicable_payloads: ['SAT-2'],
    cutoff: '2026-10-05T00:00:00Z',
    re_verification: '复测分离螺母预紧力'
  };
  const next = applyWaiver(config.icd, waiver, config);
  assert.equal(next.waivers.length, 2);
  assert.throws(
    () => applyWaiver({ ...config.icd, status: 'draft' }, waiver, config),
    /未冻结/
  );
  assert.throws(
    () => applyWaiver(config.icd, { ...waiver, id: 'WV-04', cutoff: '' }, config),
    /豁免无效/
  );
});
