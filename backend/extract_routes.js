const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf-8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('/api/posts')) {
        console.log(`${idx + 1}: ${line}`);
    }
});
