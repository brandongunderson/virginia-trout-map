const fs = require('fs');
const path = require('path');

console.log('Current working directory:', process.cwd());
console.log('');

// Test paths from different locations
const testPaths = [
  { from: 'app/api/arcgis/route.ts', to: 'lib/arcgis-config.ts', expected: '../../lib/arcgis-config' },
  { from: 'app/api/geojson/route.ts', to: 'lib/api.ts', expected: '../../lib/api' },
  { from: 'components/map/MapTab.tsx', to: 'lib/store.ts', expected: '../../lib/store' }
];

testPaths.forEach(test => {
  const fromPath = path.resolve(test.from);
  const toPath = path.resolve(test.to);
  const relativePath = path.relative(path.dirname(fromPath), toPath);
  
  console.log(`From: ${test.from}`);
  console.log(`To: ${test.to}`);
  console.log(`Relative path: ${relativePath}`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Match: ${relativePath === test.expected}`);
  console.log('');
});