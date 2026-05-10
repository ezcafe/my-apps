/**
 * Stops a prior `next dev` for this app so a new dev server can acquire
 * `.next/dev/lock` (see next/dist/build/lockfile.js).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    if (e && e.code === "ESRCH") return false;
    if (e && e.code === "EPERM") return true;
    return false;
  }
}

function looksLikeNextOrNode(pid) {
  if (process.platform === "win32") return true;
  try {
    const r = spawnSync("ps", ["-p", String(pid), "-o", "args="], {
      encoding: "utf8",
    });
    const args = (r.stdout || "").trim();
    return /next|node/i.test(args);
  } catch {
    return false;
  }
}

function sleepMs(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    spawnSync(process.execPath, ["-e", `setTimeout(()=>{},${ms})`], {
      stdio: "ignore",
    });
  }
}

function killTreeWin(pid) {
  spawnSync("taskkill", ["/PID", String(pid), "/F", "/T"], { stdio: "ignore" });
}

const root = process.cwd();
const lockPath = path.join(root, ".next", "dev", "lock");

if (!fs.existsSync(lockPath)) {
  process.exit(0);
}

let info;
try {
  info = JSON.parse(fs.readFileSync(lockPath, "utf8"));
} catch {
  process.exit(0);
}

const pid = info && info.pid;
if (!pid || !Number.isFinite(pid) || pid === process.pid) {
  process.exit(0);
}

if (!processAlive(pid)) {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // ignore — lock cleanup is best-effort
  }
  process.exit(0);
}

if (!looksLikeNextOrNode(pid)) {
  process.exit(0);
}

if (process.platform === "win32") {
  killTreeWin(pid);
} else {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    process.exit(0);
  }
}

const deadline = Date.now() + 8000;
while (Date.now() < deadline && processAlive(pid)) {
  sleepMs(80);
}

if (processAlive(pid) && process.platform !== "win32") {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // ignore — process may have died between our check and signal
  }
}

process.exit(0);
