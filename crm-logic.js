(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrmLogic = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Catalogo profili commerciali (sezione 9 della specifica)
  const CATALOG = [
    { category: 'fissa', profile: 'FTTH', flags: ['voceInternet', 'soloInternet', 'backup', 'casa'] },
    { category: 'fissa', profile: 'FTTC', flags: ['voceInternet', 'soloInternet', 'backup', 'casa'] },
    { category: 'fissa', profile: 'FWA', flags: ['voceInternet', 'soloInternet', 'backup', 'casa'] },
    { category: 'fissa', profile: 'ADSL', flags: ['voceInternet', 'soloInternet', 'backup', 'casa'] },
    { category: 'aggiuntivo', profile: 'TCE', flags: [] },
    { category: 'aggiuntivo', profile: 'Trunk', flags: [] },
    { category: 'aggiuntivo', profile: 'TIM Comunica', flags: [] },
    { category: 'mobile', profile: '7.99', flags: ['voceDati', 'soloDati', 'numeroVariabile'] },
    { category: 'mobile', profile: '10.00', flags: ['voceDati', 'soloDati', 'numeroVariabile'] },
    { category: 'mobile', profile: '10.99', flags: ['voceDati', 'soloDati', 'numeroVariabile'] },
    { category: 'mobile', profile: '15.99', flags: ['voceDati', 'soloDati', 'numeroVariabile'] },
    { category: 'mobile', profile: '16.99', flags: ['voceDati', 'soloDati', 'numeroVariabile'] },
    { category: 'mobile', profile: '22.99', flags: ['voceDati', 'soloDati', 'numeroVariabile'] },
    { category: 'mobile', profile: '24.99', flags: ['voceDati', 'soloDati', 'numeroVariabile'] },
    { category: 'energia', profile: 'Luce', flags: ['axpo'], extra: 'pod' },
    { category: 'energia', profile: 'Gas', flags: ['axpo'], extra: 'pdr' },
  ];

  // Contatori aggregati calcolati SOLO dai record attivi (sezioni 7/8/13).
  // Ogni flag "di cui" è indipendente: la somma può superare il totale, nessun controllo/blocco.
  function computeServiceCounters(services) {
    const list = Array.isArray(services) ? services : [];
    const fisse = list.filter((s) => s.category === 'fissa');
    const mobili = list.filter((s) => s.category === 'mobile');
    return {
      retiFisseTotale: fisse.length,
      voceInternet: fisse.filter((s) => s.voceInternet).length,
      soloInternet: fisse.filter((s) => s.soloInternet).length,
      backup: fisse.filter((s) => s.backup).length,
      casa: fisse.filter((s) => s.casa).length,
      mobiliTotale: mobili.length,
      voceDati: mobili.filter((s) => s.voceDati).length,
      soloDati: mobili.filter((s) => s.soloDati).length,
      numeroVariabile: mobili.filter((s) => s.numeroVariabile).length,
      tce: list.filter((s) => s.profile === 'TCE').length,
      trunk: list.filter((s) => s.profile === 'Trunk').length,
      timComunica: list.filter((s) => s.profile === 'TIM Comunica').length,
      pod: list.filter((s) => s.category === 'energia' && s.profile === 'Luce').length,
      pdr: list.filter((s) => s.category === 'energia' && s.profile === 'Gas').length,
    };
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // "Oggi" nel fuso orario locale, non UTC — Date.toISOString() è sempre UTC, quindi per
  // chi si trova in un fuso avanti rispetto a UTC (es. Italia) le prime ore dopo mezzanotte
  // risultavano ancora "ieri", facendo sparire scadenze/opportunità dovute proprio oggi.
  function localDateStr(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Espande le righe del carrello in record di servizio individuali (sezioni 10/11).
  // Righe con lo stesso profilo ma flag diversi restano sempre separate, mai accorpate.
  function expandCartToRecords(cartRows, clientId) {
    const out = [];
    for (const row of cartRows || []) {
      const qty = Math.max(1, parseInt(row.quantity || 1, 10));
      for (let i = 0; i < qty; i++) {
        out.push({
          id: uid(),
          clientId,
          category: row.category,
          profile: row.profile,
          phone: row.phone || null,
          saleDate: row.saleDate || localDateStr(),
          activationDate: row.activationDate || null,
          status: row.status || 'attivo',
          notes: row.notes || '',
          voceInternet: !!row.voceInternet,
          soloInternet: !!row.soloInternet,
          backup: !!row.backup,
          casa: !!row.casa,
          voceDati: !!row.voceDati,
          soloDati: !!row.soloDati,
          numeroVariabile: !!row.numeroVariabile,
          axpo: !!row.axpo,
          pod: row.pod || null,
          pdr: row.pdr || null,
          price: row.price ? Number(row.price) : null,
        });
      }
    }
    return out;
  }

  // Cliente in fornitura da almeno N mesi dalla stipula (sezione 6) — solo informativo,
  // non deve mai generare opportunità automaticamente.
  function isSeniorClient(contractStart, months) {
    const threshold = months || 10;
    if (!contractStart) return false;
    const start = new Date(contractStart);
    if (isNaN(start.getTime())) return false;
    const monthsElapsed = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    return monthsElapsed >= threshold;
  }

  // Un'opportunità è "scaduta/in scadenza" quando la data prevista è oggi o nel passato —
  // usata solo per evidenziare la riga in tabella, mai per creare record.
  function isOpportunityDue(dueDate) {
    if (!dueDate) return false;
    return String(dueDate).slice(0, 10) <= localDateStr();
  }

  return { CATALOG, computeServiceCounters, expandCartToRecords, isSeniorClient, isOpportunityDue, localDateStr };
});
