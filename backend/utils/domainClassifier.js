function classifyDomain(row) {
  const domainValue = (
    row.domain ||
    row.domain_name ||
    row.domain_type ||
    row.design_domain ||
    row.eda_domain ||
    ''
  ).toUpperCase().trim();

  if (['PD', 'PHYSICAL DESIGN', 'PHYSICAL'].includes(domainValue)) return 'PD';
  if (['DV', 'DESIGN VERIFICATION', 'VERIFICATION'].includes(domainValue)) return 'DV';
  if (['RTL', 'REGISTER TRANSFER LEVEL'].includes(domainValue)) return 'RTL';
  if (['CD', 'CLOCK DESIGN', 'CLOCK'].includes(domainValue)) return 'CD';
  if (['CL', 'CUSTOM LAYOUT', 'CUSTOM'].includes(domainValue)) return 'CL';
  if (['DFT', 'DESIGN FOR TESTABILITY', 'TESTABILITY'].includes(domainValue)) return 'DFT';
  return 'UNKNOWN';
}

module.exports = classifyDomain; 