const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes("from 'react-query'")) {
    const newContent = content.replace(/from 'react-query'/g, "from '@tanstack/react-query'");
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('✓ Fixed:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      replaceInFile(filePath);
    }
  });
}

walkDir('./src');
console.log('\n✅ All done!');