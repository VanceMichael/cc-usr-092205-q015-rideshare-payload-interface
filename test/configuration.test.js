import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseMission } from '../src/mission.js';
import {
  analyzeSeparationChange,
  buildConfiguration,
  sharedView
} from '../src/configuration.js';

async function loadConfig() {
  const raw = await readFile(new URL('../fixtures/mission.json', import.meta.url), 'utf8');
  return buildConfiguration(parseMission(raw));
}

test('整箭构型关联九颗星的接口数据', async () => {
  const config = await loadConfig();
  assert.equal(config.payloads.length, 9);
  for (const payload of config.payloads) {
    assert.ok(payload.interface.mass_kg > 0);
    assert.ok(payload.interface.envelope.radius_mm > 0);
    assert.ok(payload.interface.power.bus_voltage_v > 0);
    assert.ok(payload.interface.separation.time_s > 0);
    assert.ok(payload.interface.telemetry_windows.length > 0);
    assert.ok(payload.interface.no_fly_items.length > 0);
  }
  assert.ok(config.joint_tests.length > 0);
  assert.ok(config.sign_offs.length > 0);
});

test('分离参数变更标出其他星的包络、时序和遥测窗口影响', async () => {
  const config = await loadConfig();
  // SAT-3 在发射场把分离时刻从 580s 提前到 561s。
  const result = analyzeSeparationChange(config, 'SAT-3', { time_s: 561 });
  assert.equal(result.affected.length, 2);

  // 与 SAT-1 相距 21s：不触及包络和时序，但平移后的遥测窗口与之重叠。
  const sat1 = result.affected.find((item) => item.payload_id === 'SAT-1');
  assert.deepEqual(sat1.impacts, ['telemetry']);
  assert.equal(sat1.developer, '研制方甲');

  // 与 SAT-2 相距 1s：时序和包络同时受影响；测控站不同，遥测不争用。
  const sat2 = result.affected.find((item) => item.payload_id === 'SAT-2');
  assert.deepEqual(sat2.impacts, ['timing', 'envelope']);
  assert.equal(sat2.developer, '研制方乙');
});

test('仅调整分离方向且时序间隔充足时不产生跨星影响', async () => {
  const config = await loadConfig();
  const result = analyzeSeparationChange(config, 'SAT-5', { direction_deg: 150 });
  assert.equal(result.affected.length, 0);
});

test('研制方之间只共享接口边界', async () => {
  const config = await loadConfig();
  const view = sharedView(config, '研制方甲');
  const own = view.payloads.find((item) => item.id === 'SAT-1');
  const other = view.payloads.find((item) => item.id === 'SAT-2');
  assert.ok(own.internal);
  assert.equal(other.internal, undefined);
  assert.ok(other.interface.envelope);
  assert.ok(other.interface.separation);
  assert.ok(other.interface.telemetry_windows.length > 0);
});
