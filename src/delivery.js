// 入轨交付核对：任务结束后逐星核对分离与入轨事实。
// 整箭成功不能自动把缺少证据的单星标成已交付。
export function assessDelivery(config, outcome) {
  const perPayload = {};
  for (const payload of config.payloads) {
    const missing = [];
    if (!outcome.separation_confirmations?.[payload.id]) {
      missing.push('分离确认');
    }
    if (!outcome.orbit_confirmations?.[payload.id]) {
      missing.push('入轨确认');
    }
    perPayload[payload.id] = { delivered: missing.length === 0, missing_evidence: missing };
  }
  const deliveredCount = Object.values(perPayload).filter((item) => item.delivered).length;
  return {
    mission: config.mission,
    rocket_success: Boolean(outcome.rocket_success),
    per_payload: perPayload,
    delivered_count: deliveredCount,
    total: config.payloads.length,
    all_delivered: deliveredCount === config.payloads.length
  };
}
