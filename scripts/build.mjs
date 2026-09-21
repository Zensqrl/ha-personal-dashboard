import { readFile, mkdir, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
let code =
  "// Huzband Dashboard v0.1.0 — built from tracked source. No remote imports.\n";
for (const file of ["model", "controller", "cards"]) {
  code +=
    (await readFile(new URL(`src/${file}.mjs`, root), "utf8"))
      .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\r?\n/gm, "")
      .replace(/^export /gm, "") + "\n";
}
await mkdir(new URL("dist/", root), { recursive: true });
code = code.trimEnd() + "\n";
await writeFile(new URL("dist/ha-personal-dashboard.js", root), code);
console.log(`Built ${Buffer.byteLength(code)} bytes`);
