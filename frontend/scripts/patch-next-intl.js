// Copy static files into standalone
const staticSrc = path.join(__dirname, "../.next/static");
const staticDest = path.join(
  __dirname,
  "../.next/standalone/frontend/.next/static",
);
const publicSrc = path.join(__dirname, "../public");
const publicDest = path.join(__dirname, "../.next/standalone/frontend/public");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Skipping (not found): ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log("📁 Copying static files into standalone...");
copyDir(staticSrc, staticDest);
copyDir(publicSrc, publicDest);
console.log("✅ Static files copied");
