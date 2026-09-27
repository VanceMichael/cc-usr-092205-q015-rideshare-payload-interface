import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBoundaryEvent,
  assertSingleValidVersion,
  createBoundaryRegister,
  currentRecord,
  openBoundary,
  startCountdown,
  validVersions
} from '../src/versions.js';

test('替换、修正、延期、重传始终只保留一个有效版本', () => {
  const register = createBoundaryRegister();
  openBoundary(register, 'SAT-3/separation', 'v1', '2026-09-01');
  applyBoundaryEvent(register, 'SAT-3/separation', { type: 'replacement', version: 'v2', at: '2026-09-10' });
  applyBoundaryEvent(register, 'SAT-3/separation', { type: 'measurement_correction', version: 'v3', at: '2026-09-12' });
  applyBoundaryEvent(register, 'SAT-3/separation', { type: 'test_delay', version: 'v4', at: '2026-09-15' });
  applyBoundaryEvent(register, 'SAT-3/separation', { type: 'report_retransmission', version: 'v5', at: '2026-09-18' });
  const valid = assertSingleValidVersion(register, 'SAT-3/separation');
  assert.equal(valid.length, 1);
  assert.equal(valid[0].version, 'v5');
});

test('倒计时后的撤回不产生第二个有效版本', () => {
  const register = createBoundaryRegister();
  openBoundary(register, 'SAT-7/telemetry', 'v1', '2026-09-01');
  // 倒计时开始前不能执行倒计时后撤回。
  assert.throws(
    () => applyBoundaryEvent(register, 'SAT-7/telemetry', { type: 'post_countdown_withdrawal', at: '2026-09-26T05:30:00Z' }),
    /倒计时/
  );
  startCountdown(register, 'SAT-7/telemetry');
  applyBoundaryEvent(register, 'SAT-7/telemetry', { type: 'post_countdown_withdrawal', at: '2026-09-26T05:30:00Z' });
  // 撤回之后没有有效版本，而不是新旧并存。
  assert.equal(validVersions(register, 'SAT-7/telemetry').length, 0);
  assert.equal(currentRecord(register, 'SAT-7/telemetry').kind, 'post_countdown_withdrawal');
  // 替换后重新得到唯一有效版本。
  applyBoundaryEvent(register, 'SAT-7/telemetry', { type: 'replacement', version: 'v2', at: '2026-09-26T07:00:00Z' });
  const valid = validVersions(register, 'SAT-7/telemetry');
  assert.equal(valid.length, 1);
  assert.equal(valid[0].version, 'v2');
});

test('未知事件类型被拒绝', () => {
  const register = createBoundaryRegister();
  openBoundary(register, 'SAT-1/power', 'v1', '2026-09-01');
  assert.throws(
    () => applyBoundaryEvent(register, 'SAT-1/power', { type: 'quiet_edit' }),
    /未知事件/
  );
});
