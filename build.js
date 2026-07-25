const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, 'dist');
if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist);
}

const files = ['index.html', 'app.js', 'style.css', 'Ad.png'];

files.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(dist, file));
    }
});

console.log('Build completed: Assets copied to dist/');
