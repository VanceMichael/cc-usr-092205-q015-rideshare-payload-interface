// 接口控制文件（ICD）冻结后的豁免管理。
// 冻结后任何豁免都必须给出适用载荷、截止条件和复验要求。

export function validateWaiver(waiver, config, now) {
  const errors = [];
  if (!Array.isArray(waiver.applicable_payloads) || waiver.applicable_payloads.length === 0) {
    errors.push('豁免必须给出适用载荷');
  } else {
    const known = new Set(config.payloads.map((payload) => payload.id));
    for (const id of waiver.applicable_payloads) {
      if (!known.has(id)) {
        errors.push(`豁免适用载荷不存在: ${id}`);
      }
    }
  }
  if (!waiver.cutoff) {
    errors.push('豁免必须给出截止条件');
  }
  if (!waiver.re_verification) {
    errors.push('豁免必须给出复验要求');
  }
  if (now && waiver.cutoff) {
    const cutoff = Date.parse(waiver.cutoff);
    const moment = Date.parse(now);
    if (!Number.isNaN(cutoff) && !Number.isNaN(moment) && cutoff < moment) {
      errors.push('豁免已过截止条件');
    }
  }
  return { valid: errors.length === 0, errors };
}

// 冻结后的变更必须引用覆盖该载荷的有效豁免；冻结前走正常修订。
export function assertIcdChangeAllowed(icd, change, config, now) {
  if (icd.status !== 'frozen') {
    return;
  }
  const waiver = (icd.waivers ?? []).find((item) => item.id === change.waiver_id);
  if (!waiver) {
    throw new Error('接口控制文件已冻结，变更必须引用有效豁免');
  }
  const check = validateWaiver(waiver, config, now);
  if (!check.valid) {
    throw new Error(`豁免无效: ${check.errors.join('；')}`);
  }
  if (!waiver.applicable_payloads.includes(change.payload_id)) {
    throw new Error(`豁免 ${waiver.id} 不适用于载荷 ${change.payload_id}`);
  }
}

// 豁免只在冻结后登记，且要素齐全才生效。
export function applyWaiver(icd, waiver, config, now) {
  if (icd.status !== 'frozen') {
    throw new Error('接口控制文件未冻结，变更应走正常修订而非豁免');
  }
  const check = validateWaiver(waiver, config, now);
  if (!check.valid) {
    throw new Error(`豁免无效: ${check.errors.join('；')}`);
  }
  return { ...icd, waivers: [...(icd.waivers ?? []), waiver] };
}
