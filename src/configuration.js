// 整箭构型：以整箭为中心关联每颗星的质量质心、机械边界、供电、
// 遥测、分离序列、禁飞项、联合试验和签署结论。

// 分离最小时间间隔（秒）：小于该间隔视为时序冲突。
export const MIN_SEPARATION_INTERVAL_S = 8;
// 包络耦合窗口（秒）：分离时刻接近时彼此的包络禁区尚未脱离。
export const ENVELOPE_COUPLING_WINDOW_S = 15;
// 遥测窗口相对本星分离时刻的余量：变更后按同一余量平移。
export const TELEMETRY_MARGIN_S = Object.freeze({ before: 5, after: 25 });

export function buildConfiguration(mission) {
  const ids = new Set();
  const sequences = new Set();
  for (const payload of mission.payloads) {
    if (!payload.id || !payload.developer || !payload.interface) {
      throw new Error(`载荷资料不完整: ${payload.id ?? '未知'}`);
    }
    if (ids.has(payload.id)) {
      throw new Error(`载荷标识重复: ${payload.id}`);
    }
    ids.add(payload.id);
    const sequence = payload.interface.separation?.sequence;
    if (!Number.isInteger(sequence) || sequences.has(sequence)) {
      throw new Error(`分离序列无效或重复: ${payload.id}`);
    }
    sequences.add(sequence);
  }
  return mission;
}

export function findPayload(config, payloadId) {
  const payload = config.payloads.find((item) => item.id === payloadId);
  if (!payload) {
    throw new Error(`载荷不存在: ${payloadId}`);
  }
  return payload;
}

// 某颗星在发射场修改分离参数时，其他研制方关心的是自己的包络、
// 时序和遥测窗口是否随之受影响，而不是变更文件有没有上传。
export function analyzeSeparationChange(config, payloadId, proposed) {
  const source = findPayload(config, payloadId);
  const next = { ...source.interface.separation, ...proposed };
  const affected = [];
  for (const other of config.payloads) {
    if (other.id === payloadId) {
      continue;
    }
    const impacts = [];
    const gap = Math.abs(next.time_s - other.interface.separation.time_s);
    if (gap < MIN_SEPARATION_INTERVAL_S) {
      impacts.push('timing');
    }
    if (gap <= ENVELOPE_COUPLING_WINDOW_S) {
      impacts.push('envelope');
    }
    if (telemetryContention(source, next.time_s, other)) {
      impacts.push('telemetry');
    }
    if (impacts.length > 0) {
      affected.push({ payload_id: other.id, developer: other.developer, impacts });
    }
  }
  return { source: payloadId, proposed: next, affected };
}

// 变更星的遥测窗口随分离时刻平移后，与他星同测控站的窗口重叠即构成争用。
function telemetryContention(source, newTimeS, other) {
  const shifted = {
    start: newTimeS - TELEMETRY_MARGIN_S.before,
    end: newTimeS + TELEMETRY_MARGIN_S.after
  };
  return other.interface.telemetry_windows.some((window) => {
    const sharedStation = source.interface.telemetry_windows.some(
      (own) => own.station === window.station
    );
    return sharedStation && shifted.start < window.end_s && shifted.end > window.start_s;
  });
}

// 研制方之间只共享接口边界：其他研制方的载荷只保留接口字段，
// 内部资料（internal）不出研制方。
export function sharedView(config, developerId) {
  return {
    ...config,
    payloads: config.payloads.map((payload) =>
      payload.developer === developerId
        ? payload
        : { id: payload.id, developer: payload.developer, interface: payload.interface }
    )
  };
}
