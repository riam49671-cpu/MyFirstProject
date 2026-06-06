/**
 * Test: Canvas + MediaRecorder auf localhost (ohne echte Kamera).
 * Aufruf: node test-gesichts-video.mjs
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync, spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8769;

function serveFile(urlPath) {
  const file = path.join(__dirname, urlPath === "/" ? "gesichts-studio.html" : urlPath.slice(1));
  if (!fs.existsSync(file)) return [404, "text/plain", "not found"];
  const ext = path.extname(file);
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
  return [200, types[ext] || "application/octet-stream", fs.readFileSync(file)];
}

const server = http.createServer((req, res) => {
  const [code, type, body] = serveFile(req.url?.split("?")[0] || "/");
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
});

await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

const testHtml = `<!DOCTYPE html><html><body>
<canvas id="c" width="320" height="240"></canvas>
<script>
(async () => {
  const c = document.getElementById("c");
  const ctx = c.getContext("2d");
  let n = 0;
  const draw = () => {
    ctx.fillStyle = "#" + ((n++ % 255) | 0x440000).toString(16).padStart(6, "0");
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#fff";
    ctx.font = "24px sans-serif";
    ctx.fillText("Frame " + n, 20, 40);
  };
  const stream = c.captureStream(30);
  const track = stream.getVideoTracks()[0];
  const mime = ["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(m => MediaRecorder.isTypeSupported(m));
  if (!mime) { document.title = "FAIL:no-mime"; return; }
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: mime });
    document.title = blob.size > 500 ? "OK:" + blob.size : "FAIL:empty-" + blob.size;
  };
  const iv = setInterval(() => {
    draw();
    if (track.requestFrame) track.requestFrame();
  }, 33);
  rec.start();
  setTimeout(() => {
    clearInterval(iv);
    rec.stop();
  }, 1500);
})();
</script></body></html>`;

const testPage = path.join(__dirname, ".test-video-page.html");
fs.writeFileSync(testPage, testHtml);

let browserCmd = null;
for (const cmd of [
  "google-chrome --headless=new --disable-gpu --no-sandbox",
  "chromium --headless=new --disable-gpu --no-sandbox",
  "google-chrome-stable --headless=new --disable-gpu --no-sandbox",
]) {
  try {
    execSync(`which ${cmd.split(" ")[0]}`, { stdio: "ignore" });
    browserCmd = cmd;
    break;
  } catch { /* */ }
}

if (!browserCmd && (() => { try { execSync("flatpak info com.google.Chrome", { stdio: "ignore" }); return true; } catch { return false; } })()) {
  browserCmd = "flatpak run com.google.Chrome --headless=new --disable-gpu --no-sandbox";
}

if (!browserCmd) {
  console.log("SKIP browser test (kein headless Chrome). Server-Test OK auf Port", PORT);
  server.close();
  fs.unlinkSync(testPage);
  process.exit(0);
}

const outFile = path.join(__dirname, ".test-video-out.txt");
const url = `http://127.0.0.1:${PORT}/.test-video-page.html`;
fs.copyFileSync(testPage, path.join(__dirname, ".test-video-page.html"));

const child = spawn("bash", ["-c", `${browserCmd} --dump-dom "${url}" > "${outFile}" 2>/dev/null`], {
  cwd: __dirname,
});

await new Promise((r) => child.on("close", r));
await new Promise((r) => setTimeout(r, 2500));

let title = "FAIL:timeout";
try {
  const dom = fs.readFileSync(outFile, "utf8");
  const m = dom.match(/<title>([^<]*)<\/title>/i);
  if (m) title = m[1];
} catch { /* */ }

server.close();
try { fs.unlinkSync(testPage); fs.unlinkSync(outFile); } catch { /* */ }

if (title.startsWith("OK:")) {
  console.log("VIDEO-TEST BESTANDEN:", title);
  process.exit(0);
}
console.error("VIDEO-TEST FEHLGESCHLAGEN:", title);
process.exit(1);
