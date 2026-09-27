import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseMission, parseOutcome } from '../src/mission.js';
import { buildConfiguration } from '../src/configuration.js';
import { assessDelivery } from '../src/delivery.js';

async function loadConfig() {
  const raw = await readFile(new URL('../fixtures/mission.json', import.meta.url), 'utf8');
  return buildConfiguration(parseMission(raw));
}

test('整箭成功不能自动把缺少证据的单星标成已交付', async () => {
  const config = await loadConfig();
  const outcome = parseOutcome(
    await readFile(new URL('../fixtures/outcome.json', import.meta.url), 'utf8')
  );
  const result = assessDelivery(config, outcome);
  assert.equal(result.rocket_success, true);
  assert.equal(result.total, 9);
  // 九颗星都有分离确认，但 SAT-7 缺少入轨确认。
  assert.equal(result.delivered_count, 8);
  assert.equal(result.all_delivered, false);
  assert.equal(result.per_payload['SAT-7'].delivered, false);
  assert.deepEqual(result.per_payload['SAT-7'].missing_evidence, ['入轨确认']);
  assert.equal(result.per_payload['SAT-1'].delivered, true);
});

test('缺少分离确认同样不能交付', async () => {
  const config = await loadConfig();
  const outcome = {
    rocket_success: true,
    separation_confirmations: {},
    orbit_confirmations: Object.fromEntries(
      config.payloads.map((payload) => [payload.id, '2026-09-26T06:42:00Z'])
    )
  };
  const result = assessDelivery(config, outcome);
  assert.equal(result.delivered_count, 0);
  assert.deepEqual(result.per_payload['SAT-1'].missing_evidence, ['分离确认']);
});
