import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidVehicle, isValidMobile, normalizeVehicle, compactVehicle, normalizeMobile } from './validators';

test('vehicle numbers', () => {
  for (const ok of ['GJ01AB1234', 'gj 01 ab 1234', 'GJ-16-AX-8912', 'MH43BB4510', 'DL1CAB1234', '22BH1234AA', 'GJ051234'])
    assert.ok(isValidVehicle(ok), ok);
  for (const bad of ['', '1234', 'ABCDEFG', 'GJ01AB12', 'hello world', 'GJ01AB12345'])
    assert.ok(!isValidVehicle(bad), bad);
  assert.equal(normalizeVehicle('  gj 01-ab   1234 '), 'GJ 01-AB 1234');
  assert.equal(compactVehicle('gj 01-ab 1234'), 'GJ01AB1234');
});

test('mobile numbers', () => {
  for (const ok of ['9876543210', '+91 98765 43210', '09876543210', '91-9876543210'])
    assert.ok(isValidMobile(ok), ok);
  for (const bad of ['', '12345', '5876543210', '98765432101', 'abcdefghij']) assert.ok(!isValidMobile(bad), bad);
  assert.equal(normalizeMobile('+91 98765 43210'), '9876543210');
});
