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

const assetsDir = path.join(__dirname, 'assets');
const distAssetsDir = path.join(dist, 'assets');
if (fs.existsSync(assetsDir)) {
    if (!fs.existsSync(distAssetsDir)) {
        fs.mkdirSync(distAssetsDir);
    }
    fs.readdirSync(assetsDir).forEach(file => {
        const srcPath = path.join(assetsDir, file);
        if (fs.lstatSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, path.join(distAssetsDir, file));
        }
    });
}

console.log('Build completed: Assets copied to dist/');
