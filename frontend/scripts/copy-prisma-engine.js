const fs = require("fs");
const path = require("path");

const engineExtensions = [
  ".node",
  ".dll.node",
  "-windows.dll.node",
  "-debian-openssl-1.1.x",
  "-debian-openssl-3.0.x",
  "-rhel-openssl-1.0.x",
];

// Source: where prisma puts its engines after generation
const prismaEngineSource = path.join(
  __dirname,
  "../node_modules/@prisma/client",
);

// Also check the prisma package itself
const prismaSource = path.join(__dirname, "../node_modules/prisma");

// Destination: standalone output
const standaloneNodeModules = path.join(
  __dirname,
  "../.next/standalone/frontend/node_modules/.prisma/client",
);

const standaloneNodeModules2 = path.join(
  __dirname,
  "../.next/standalone/frontend/node_modules/@prisma/client",
);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyEngines(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.log(`Source not found, skipping: ${srcDir}`);
    return;
  }

  ensureDir(destDir);

  const files = fs.readdirSync(srcDir);
  let copied = 0;

  for (const file of files) {
    const isEngine =
      engineExtensions.some((ext) => file.endsWith(ext)) ||
      file.startsWith("query_engine") ||
      file.startsWith("libquery_engine") ||
      file === "schema.prisma" ||
      file === "index.js" ||
      file === "index.d.ts" ||
      file === "package.json";

    if (isEngine) {
      const src = path.join(srcDir, file);
      const dest = path.join(destDir, file);
      fs.copyFileSync(src, dest);
      console.log(`✅ Copied: ${file}`);
      copied++;
    }
  }

  console.log(`Copied ${copied} files from ${srcDir}`);
}

// Copy .prisma/client (generated client + engine)
const dotPrismaSource = path.join(__dirname, "../node_modules/.prisma/client");

copyEngines(dotPrismaSource, standaloneNodeModules);
copyEngines(prismaEngineSource, standaloneNodeModules2);

console.log("🎉 Prisma engine copy complete");
