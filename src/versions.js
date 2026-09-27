// 接口边界版本登记：卫星替换、测量修正、试验延期、报告重传和
// 倒计时后的撤回都只保留一个有效版本，历史记录仅用于追溯。
export const BOUNDARY_EVENT_TYPES = Object.freeze([
  'replacement', // 卫星替换
  'measurement_correction', // 测量修正
  'test_delay', // 试验延期
  'report_retransmission', // 报告重传
  'post_countdown_withdrawal' // 倒计时后撤回
]);

export function createBoundaryRegister() {
  return { boundaries: new Map() };
}

export function openBoundary(register, boundaryId, version, at) {
  if (register.boundaries.has(boundaryId)) {
    throw new Error(`接口边界已存在: ${boundaryId}`);
  }
  register.boundaries.set(boundaryId, {
    history: [{ kind: 'baseline', version, at }],
    countdown_started: false
  });
  return register;
}

function boundary(register, boundaryId) {
  const found = register.boundaries.get(boundaryId);
  if (!found) {
    throw new Error(`接口边界不存在: ${boundaryId}`);
  }
  return found;
}

export function startCountdown(register, boundaryId) {
  boundary(register, boundaryId).countdown_started = true;
}

// 任何事件都追加为新的当前记录，取代旧记录成为唯一有效版本。
export function applyBoundaryEvent(register, boundaryId, event) {
  if (!BOUNDARY_EVENT_TYPES.includes(event.type)) {
    throw new Error(`未知事件类型: ${event.type}`);
  }
  const found = boundary(register, boundaryId);
  if (event.type === 'post_countdown_withdrawal' && !found.countdown_started) {
    throw new Error('倒计时开始前不能执行倒计时后撤回');
  }
  found.history.push({
    kind: event.type,
    version: event.version ?? null,
    at: event.at ?? null
  });
  return currentRecord(register, boundaryId);
}

export function currentRecord(register, boundaryId) {
  const found = boundary(register, boundaryId);
  return found.history[found.history.length - 1];
}

// 有效版本：撤回之后没有有效版本，其余时刻恰有一个。
export function validVersions(register, boundaryId) {
  const current = currentRecord(register, boundaryId);
  return current.kind === 'post_countdown_withdrawal' ? [] : [current];
}

export function assertSingleValidVersion(register, boundaryId) {
  const valid = validVersions(register, boundaryId);
  if (valid.length > 1) {
    throw new Error(`接口边界 ${boundaryId} 存在多个有效版本`);
  }
  return valid;
}
