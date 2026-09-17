import assert from 'node:assert/strict';
import test from 'node:test';
import { rankCandidates } from '../components/manual-comparison-builder';

const candidate = (id: string, rent: string, commuteMinutes: string, risk: 'clear' | 'stop' = 'clear') => ({
  id, name: id, rent, commuteMinutes, extraMonthly: '0', depositMonths: '1', risk, notes: '',
});

test('missing and negative values never outrank a complete candidate', () => {
  const results = rankCandidates([candidate('blank', '', ''), candidate('negative', '-200', '10'), candidate('valid', '2000', '20')]);
  assert.equal(results[0].id, 'valid');
  for (const result of results.slice(1)) {
    assert.equal(result.complete, false);
    assert.equal(result.verdict, '待补充');
  }
});

test('zero-minute commute remains a valid best commute with a usable handoff', () => {
  const results = rankCandidates([candidate('home', '2000', '0'), candidate('office', '2000', '20')]);
  assert.equal(results[0].id, 'home');
  assert.equal(results[0].complete, true);
  assert.ok(results[0].reasons.includes('通勤：当前最短'));
  assert.equal(new URL(results[0].analyzeHref, 'http://localhost').searchParams.get('commuteLimit'), '0 分钟');
});

test('a low-priced stop-risk listing cannot become the first recommendation', () => {
  const results = rankCandidates([candidate('unsafe', '1', '0', 'stop'), candidate('safe', '2000', '20')]);
  assert.equal(results[0].id, 'safe');
  assert.equal(results[1].verdict, '暂不继续');
});
