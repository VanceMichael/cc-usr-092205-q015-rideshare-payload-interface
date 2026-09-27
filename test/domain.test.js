import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDomain } from '../src/domain.js';

test('样例领域标识正确', async () => {
  const raw = await readFile(new URL('../fixtures/domain.json', import.meta.url), 'utf8');
  const value = parseDomain(raw);
  assert.equal(value.domain, 'rideshare-payload-interface');
  assert.ok(value.constraints.length >= 2);
});

test('样例覆盖整箭构型与接口交付关键约束', async () => {
  const raw = await readFile(new URL('../fixtures/domain.json', import.meta.url), 'utf8');
  const value = parseDomain(raw);
  const facts = value.facts.join('\n');
  const constraints = value.constraints.join('\n');
  assert.match(facts, /整箭构型/);
  assert.match(facts, /包络、时序和遥测窗口/);
  assert.match(constraints, /适用载荷、截止条件和复验要求/);
  assert.match(constraints, /两个有效版本/);
  assert.match(constraints, /只共享接口边界/);
  assert.match(constraints, /跨载荷冲突和责任单位/);
  assert.match(constraints, /分别核对九颗星的分离与入轨事实/);
});
