import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const files = {
  "/": "test/preview.html",
  "/bundle.js": "dist/ha-personal-dashboard.js",
};
createServer(async (req, res) => {
  const file = files[req.url];
  if (!file) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    res.setHeader(
      "Content-Type",
      file.endsWith(".html")
        ? "text/html; charset=utf-8"
        : "text/javascript; charset=utf-8",
    );
    res.end(await readFile(new URL(file, root)));
  } catch {
    res.writeHead(500);
    res.end("Build first");
  }
}).listen(8791, "127.0.0.1", () =>
  console.log("Synthetic preview: http://127.0.0.1:8791"),
);
