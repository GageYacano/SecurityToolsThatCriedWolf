import test from 'node:test';
import assert from 'node:assert/strict';
import { filterLayer, groupVulnerabilities, LAYER_ORDER } from './filter.mjs';
import fixtures from '../fixtures/vulnerabilities.mjs';

test('fixtures use the database contract, with three fictional findings per layer', () => {
  const grouped = groupVulnerabilities(fixtures);
  assert.equal(fixtures.length, 15);
  for (const layer of LAYER_ORDER) assert.equal(grouped[layer].length, 3);
  for (const entry of fixtures) {
    assert.deepEqual(Object.keys(entry).sort(), ['date_reported', 'description', 'layer_affected', 'name', 'versions']);
    assert.match(entry.description, /Fictional/);
  }
});

test('search matches all five finding fields, preserving full records and either version format', () => {
  const data = [
    { layer_affected: 'hardware', name: 'Example CPU', versions: ['1.0', '1.1'], date_reported: '2026-01-15', description: 'Memory access issue' },
    { layer_affected: 'os', name: 'ExampleOS', versions: '2.0 through 2.3', date_reported: '2026-02-20', description: 'Permission failure' },
  ];
  for (const query of [' HARDWARE ', 'example cpu', '1.0, 1.1', '2026-01-15', 'MEMORY']) {
    const filtered = filterLayer(data, query, 'vulnerabilities');
    assert.equal(filtered.count, 1);
    assert.equal(filtered.value[0], data[0]);
  }
  assert.equal(filterLayer(data, 'through 2.3', 'vulnerabilities').value[0], data[1]);
  assert.equal(filterLayer(data, 'absent', 'vulnerabilities').count, 0);
  assert.equal(filterLayer(data, '   ', 'vulnerabilities').value, data);
});

test('specs search retains complete matching top-level fields and nested content', () => {
  const data = { serialNumber: 'ABC123', cpu: { model: 'Demo Chip', cores: 8 }, memory: { total: 16 } };
  assert.deepEqual(filterLayer(data, 'serial number').value, { serialNumber: 'ABC123' });
  assert.deepEqual(filterLayer(data, 'chip').value, { cpu: data.cpu });
  assert.deepEqual(filterLayer(data, '8').value, { cpu: data.cpu });
  assert.equal(filterLayer(data, '').value, data);
});

test('specs search matches displayed array columns, not hidden metadata', () => {
  const rows = [{ name: 'Example App', version: '1.2', path: '/hidden/path' }, { name: 'Other', version: '3' }];
  assert.equal(filterLayer(rows, 'example').value[0], rows[0]);
  assert.equal(filterLayer(rows, '1.2').count, 1);
  assert.equal(filterLayer(rows, '/hidden').count, 0);
  assert.equal(filterLayer(rows, 'version').count, 2);
});

test('errors and unavailable data survive filtering, and input data is not changed', () => {
  const error = { error: 'Homebrew unavailable' };
  assert.equal(filterLayer(error, 'no match').value, error);
  assert.equal(filterLayer(error, 'no match').preserve, true);
  assert.equal(filterLayer(null, 'no match').preserve, true);
  assert.equal(filterLayer([], 'no match').count, 0);
  const before = JSON.stringify(fixtures);
  filterLayer(fixtures, 'memory', 'vulnerabilities');
  groupVulnerabilities(fixtures);
  assert.equal(JSON.stringify(fixtures), before);
});
