import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseMission } from '../src/mission.js';
import { analyzeSeparationChange, buildConfiguration } from '../src/configuration.js';
import { buildReleaseBoard } from '../src/release.js';

async function loadConfig() {
  const raw = await readFile(new URL('../fixtures/mission.json', import.meta.url), 'utf8');
  return buildConfiguration(parseMission(raw));
}

test('放行会议展示尚未闭合的跨载荷冲突和责任单位', async () => {
  const config = await loadConfig();
  const impacts = analyzeSeparationChange(config, 'SAT-3', { time_s: 561 });
  const board = buildReleaseBoard(config, { impacts: [impacts] });
  assert.equal(board.ready_for_release, false);

  const kinds = board.open_conflicts.map((item) => item.kind);
  assert.ok(kinds.includes('change_impact'));
  assert.ok(kinds.includes('joint_test'));
  assert.ok(kinds.includes('sign_off'));

  // 变更影响：发起方（研制方丙）与受影响方（研制方乙）共同负责。
  const change = board.open_conflicts.find(
    (item) => item.kind === 'change_impact' && item.payloads.includes('SAT-2')
  );
  assert.ok(change.responsible.includes('研制方丙'));
  assert.ok(change.responsible.includes('研制方乙'));

  // JT-03 联合试验未通过：SAT-6、SAT-7 的研制方负责。
  const jointTest = board.open_conflicts.find((item) => item.kind === 'joint_test');
  assert.deepEqual(
    jointTest.responsible.slice().sort(),
    ['研制方乙', '研制方丙'].sort()
  );

  // 研制方乙的签署结论附带条件，尚未闭合。
  const signOff = board.open_conflicts.find((item) => item.kind === 'sign_off');
  assert.deepEqual(signOff.responsible, ['研制方乙']);
});

test('全部闭合后允许放行', async () => {
  const config = await loadConfig();
  const closed = {
    ...config,
    joint_tests: config.joint_tests.map((item) => ({ ...item, status: 'passed' })),
    sign_offs: config.sign_offs.map((item) => ({ ...item, conclusion: 'accepted' }))
  };
  const board = buildReleaseBoard(closed);
  assert.equal(board.ready_for_release, true);
  assert.equal(board.open_conflicts.length, 0);
});
