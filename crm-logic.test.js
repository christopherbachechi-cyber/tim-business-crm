const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeServiceCounters, expandCartToRecords, CATALOG } = require('./crm-logic');

test('la somma dei "di cui" può superare il totale senza errori', () => {
  const services = [
    { category: 'fissa', profile: 'FTTH', voceInternet: true, casa: true },
    { category: 'fissa', profile: 'FTTH', soloInternet: true, backup: true },
  ];
  const c = computeServiceCounters(services);
  assert.equal(c.retiFisseTotale, 2);
  assert.equal(c.voceInternet, 1);
  assert.equal(c.soloInternet, 1);
  assert.equal(c.backup, 1);
  assert.equal(c.casa, 1);
  // somma dei "di cui" (4) > totale (2): nessun errore, nessun blocco
  assert.equal(c.voceInternet + c.soloInternet + c.backup + c.casa, 4);
});

test('stesso profilo ripetuto nel carrello con flag diversi produce record separati mai accorpati', () => {
  const cart = [
    { category: 'fissa', profile: 'FTTH', quantity: 2, voceInternet: true, casa: true },
    { category: 'fissa', profile: 'FTTH', quantity: 1, soloInternet: true, backup: true },
  ];
  const records = expandCartToRecords(cart, 'client1');
  assert.equal(records.length, 3);
  const ids = new Set(records.map((r) => r.id));
  assert.equal(ids.size, 3, 'ogni record deve avere un id univoco');
  assert.equal(records.filter((r) => r.voceInternet && r.casa).length, 2);
  assert.equal(records.filter((r) => r.soloInternet && r.backup).length, 1);
});

test('quantità superiore a 1 genera record individuali distinti', () => {
  const cart = [{ category: 'mobile', profile: '7.99', quantity: 5, voceDati: true }];
  const records = expandCartToRecords(cart, 'client1');
  assert.equal(records.length, 5);
  for (const r of records) {
    assert.equal(r.category, 'mobile');
    assert.equal(r.profile, '7.99');
  }
});

test('TCE, Trunk e TIM Comunica non incrementano il totale reti fisse', () => {
  const services = [
    { category: 'fissa', profile: 'FTTH' },
    { category: 'aggiuntivo', profile: 'TCE' },
    { category: 'aggiuntivo', profile: 'Trunk' },
    { category: 'aggiuntivo', profile: 'TIM Comunica' },
  ];
  const c = computeServiceCounters(services);
  assert.equal(c.retiFisseTotale, 1);
  assert.equal(c.tce, 1);
  assert.equal(c.trunk, 1);
  assert.equal(c.timComunica, 1);
});

test('i contatori sono sempre calcolati dai record, mai valori arbitrari', () => {
  assert.deepEqual(computeServiceCounters([]), {
    retiFisseTotale: 0, voceInternet: 0, soloInternet: 0, backup: 0, casa: 0,
    mobiliTotale: 0, voceDati: 0, soloDati: 0, numeroVariabile: 0,
    tce: 0, trunk: 0, timComunica: 0, pod: 0, pdr: 0,
  });
  assert.deepEqual(computeServiceCounters(undefined), computeServiceCounters([]));
});

test('energia: POD e PDR contati separatamente per Luce/Gas con flag Axpo indipendente', () => {
  const services = [
    { category: 'energia', profile: 'Luce', axpo: true, pod: '123' },
    { category: 'energia', profile: 'Luce', axpo: false, pod: '456' },
    { category: 'energia', profile: 'Gas', axpo: true, pdr: '789' },
  ];
  const c = computeServiceCounters(services);
  assert.equal(c.pod, 2);
  assert.equal(c.pdr, 1);
});

test('il catalogo copre tutte le categorie richieste dalla specifica', () => {
  const categories = new Set(CATALOG.map((p) => p.category));
  assert.deepEqual([...categories].sort(), ['aggiuntivo', 'energia', 'fissa', 'mobile']);
  const fixedProfiles = CATALOG.filter((p) => p.category === 'fissa').map((p) => p.profile);
  assert.deepEqual(fixedProfiles.sort(), ['ADSL', 'FTTC', 'FTTH', 'FWA']);
});
