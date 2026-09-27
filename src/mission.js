// 读取并检查整箭构型与任务结果资料。
export function parseMission(raw) {
  const value = JSON.parse(raw);
  if (!value.mission || !value.rocket || !Number.isInteger(value.flight_number) || !value.integrator || !Array.isArray(value.payloads) || value.payloads.length === 0 || !Array.isArray(value.joint_tests) || !Array.isArray(value.sign_offs) || !value.icd) {
    throw new Error('整箭构型资料缺少必要字段');
  }
  return value;
}

export function parseOutcome(raw) {
  const value = JSON.parse(raw);
  if (typeof value.rocket_success !== 'boolean' || !value.separation_confirmations || typeof value.separation_confirmations !== 'object' || !value.orbit_confirmations || typeof value.orbit_confirmations !== 'object') {
    throw new Error('任务结果资料缺少必要字段');
  }
  return value;
}
