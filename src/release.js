// 放行会议：直接展示尚未闭合的跨载荷冲突和责任单位，
// 全部闭合之前不得放行。
export function buildReleaseBoard(config, pending = {}) {
  const developerOf = new Map(config.payloads.map((payload) => [payload.id, payload.developer]));
  const open = [];

  // 未闭环的跨载荷变更影响：发起方与受影响方共同负责闭环。
  for (const impact of pending.impacts ?? []) {
    for (const hit of impact.affected) {
      open.push({
        kind: 'change_impact',
        summary: `${impact.source} 分离参数变更影响 ${hit.payload_id}（${hit.impacts.join('、')}）`,
        payloads: [impact.source, hit.payload_id],
        responsible: [...new Set([developerOf.get(impact.source), hit.developer])]
      });
    }
  }

  // 未通过的跨载荷联合试验。
  for (const item of config.joint_tests) {
    if (item.status === 'passed' || item.payloads.length < 2) {
      continue;
    }
    open.push({
      kind: 'joint_test',
      summary: `联合试验 ${item.id} ${item.name} 未通过（状态：${item.status}）`,
      payloads: item.payloads,
      responsible: [...new Set(item.payloads.map((id) => developerOf.get(id)))]
    });
  }

  // 未闭合的签署结论。
  for (const item of config.sign_offs) {
    if (item.conclusion === 'accepted') {
      continue;
    }
    open.push({
      kind: 'sign_off',
      summary: `${item.party} 对 ${item.scope} 的签署结论未闭合（${item.conclusion}）`,
      payloads: [],
      responsible: [item.party]
    });
  }

  return {
    mission: config.mission,
    open_conflicts: open,
    ready_for_release: open.length === 0
  };
}
