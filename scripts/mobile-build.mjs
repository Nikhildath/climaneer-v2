import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const apiDir = join(root, "src", "app", "api");
const backupDir = join(root, ".api-backup");
const configPath = join(root, "next.config.mjs");

const filesToExclude = [
  "alerts/[id]/route.ts",
  "alerts/[id]/read/route.ts",
  "alerts/route.ts",
  "simulate-reading/route.ts",
  "sensor-readings/route.ts",
  "settings/route.ts",
];

function backupApiRoutes() {
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
    for (const file of filesToExclude) {
      const src = join(apiDir, file);
      if (existsSync(src)) {
        const dest = join(backupDir, file);
        mkdirSync(dirname(dest), { recursive: true });
        renameSync(src, dest);
        console.log(`  Moved: ${file}`);
      }
    }
  }
}

function restoreApiRoutes() {
  if (existsSync(backupDir)) {
    for (const file of filesToExclude) {
      const src = join(backupDir, file);
      if (existsSync(src)) {
        const dest = join(apiDir, file);
        mkdirSync(dirname(dest), { recursive: true });
        renameSync(src, dest);
        console.log(`  Restored: ${file}`);
      }
    }
    rmSync(backupDir, { recursive: true, force: true });
  }
}

function addExportConfig() {
  const content = readFileSync(configPath, "utf-8");
  if (!content.includes("output: \"export\"")) {
    writeFileSync(configPath, content.replace(
      "const nextConfig = {",
      "const nextConfig = {\n  output: \"export\","
    ));
  }
}

function removeExportConfig() {
  const content = readFileSync(configPath, "utf-8");
  writeFileSync(configPath, content.replace(/\n?\s*output:\s*"export",?\s*/g, "\n"));
}

try {
  console.log("[1/5] Backing up non-exportable API routes...");
  backupApiRoutes();

  console.log("[2/5] Adding output: export to config...");
  addExportConfig();

  console.log("[3/5] Building Next.js static export...");
  execSync("npx next build", { cwd: root, stdio: "inherit" });

  console.log("[4/5] Syncing Capacitor...");
  execSync("npx cap sync android", { cwd: root, stdio: "inherit" });

  console.log("[5/5] Restoring API routes and config...");
  restoreApiRoutes();
  removeExportConfig();

  console.log("\n✓ Android project is ready at android/");
  console.log("  For APK: cd android && ./gradlew assembleDebug");
} catch (err) {
  console.error("\n✗ Build failed:", err.message);
  restoreApiRoutes();
  removeExportConfig();
  process.exit(1);
}
