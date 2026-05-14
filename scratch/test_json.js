const p = { features: ['a', 'b'] };
try {
  const feats = JSON.parse(p.features || '[]');
  console.log('Success:', feats);
} catch (e) {
  console.log('Error:', e.message);
}
