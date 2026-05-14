import { describe, it, expect } from 'vitest';
import { isValidTransition, isTerminal, isValidSurveyTransition } from '../src/lib/transitions';

describe('respondent status transitions', () => {
  it.each([
    ['pending', 'invited', true],
    ['pending', 'completed', true],
    ['pending', 'bounced', true],
    ['pending', 'unsubscribed', true],
    ['invited', 'email_opened', true],
    ['invited', 'link_opened', true],
    ['invited', 'bounced', true],
    ['invited', 'unsubscribed', true],
    ['invited', 'completed', true],
    ['email_opened', 'link_opened', true],
    ['email_opened', 'completed', true],
    ['link_opened', 'completed', true],
    ['completed', 'invited', false],
    ['bounced', 'invited', false],
    ['completed', 'pending', false],
    ['bounced', 'completed', false],
    ['unsubscribed', 'invited', false],
    ['pending', 'pending', false],
  ])('%s -> %s is %s', (from, to, expected) => {
    expect(isValidTransition(from, to)).toBe(expected);
  });

  it.each([
    ['completed', true],
    ['bounced', true],
    ['unsubscribed', true],
    ['pending', false],
    ['invited', false],
    ['email_opened', false],
    ['link_opened', false],
  ])('%s terminal=%s', (status, expected) => {
    expect(isTerminal(status)).toBe(expected);
  });
});

describe('survey status transitions', () => {
  it.each([
    ['draft', 'active', true],
    ['active', 'closed', true],
    ['draft', 'draft', false],
    ['active', 'draft', false],
    ['closed', 'active', false],
    ['draft', 'closed', false],
  ])('%s -> %s is %s', (from, to, expected) => {
    expect(isValidSurveyTransition(from, to)).toBe(expected);
  });
});
