const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/suburbGeoData.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldCBD = `"melbourne-cbd":[[144.98502,-37.84569],[144.9842,-37.85067],[144.98291,-37.85461],[144.97894,-37.85245],[144.97072,-37.84554],[144.96765,-37.83738],[144.97041,-37.83016],[144.96826,-37.81924],[144.95599,-37.82308],[144.95144,-37.81317],[144.95599,-37.80588],[144.95508,-37.79945],[144.95883,-37.79986],[144.95994,-37.80634],[144.97136,-37.80773],[144.97568,-37.81664],[144.9891,-37.82312],[144.98884,-37.82462],[144.98792,-37.82962],[144.97742,-37.83716],[144.98502,-37.84569]]`;

// Accurate Hoddle Grid rectangular boundary (Spencer St, Spring St, La Trobe St, Flinders St)
const newCBD = `"melbourne-cbd":[[144.95599,-37.80588],[144.97136,-37.80773],[144.97568,-37.81664],[144.96826,-37.81924],[144.95599,-37.82308],[144.95144,-37.81317],[144.95599,-37.80588]]`;

if (content.includes(oldCBD)) {
  content = content.replace(oldCBD, newCBD);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated melbourne-cbd in suburbGeoData.ts');
} else {
  console.error('Could not find exact oldCBD string in suburbGeoData.ts');
  process.exit(1);
}
