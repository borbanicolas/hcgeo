const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'hcgeogestao-api', 'uploads');
if (!fs.existsSync(target)) {
  fs.mkdirSync(target, { recursive: true });
  console.log('Created:', target);
} else {
  console.log('Already exists:', target);
}
