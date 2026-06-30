import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";

const require = createRequire(import.meta.url);

const host = process.env.PROD_HOST ?? "127.0.0.1";
const nextBin = require.resolve("next/dist/bin/next");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 45000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      await wait(500);
    }
  }

  throw new Error(`Production server did not become ready at ${url}`);
}

async function findFreePort() {
  if (process.env.PROD_PORT) return process.env.PROD_PORT;

  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(String(address.port));
          return;
        }
        reject(new Error("Could not resolve an available production verification port"));
      });
    });
  });
}

function spawnNode(args, options = {}) {
  return spawn(process.execPath, args, {
    env: process.env,
    stdio: "inherit",
    ...options,
  });
}

async function runSmoke(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/smoke.mjs"], {
      env: {
        ...process.env,
        SMOKE_BASE_URL: baseUrl,
      },
      stdio: "inherit",
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`smoke exited with signal ${signal}`));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`smoke exited with code ${code ?? "unknown"}`));
    });
  });
}

let finished = false;
let server;

async function stopServer() {
  if (finished || !server) return;
  finished = true;

  if (!server.killed) {
    server.kill("SIGTERM");
    await wait(800);
  }

  if (!server.killed) {
    server.kill("SIGKILL");
  }
}

try {
  const port = await findFreePort();
  const baseUrl = `http://${host}:${port}`;

  server = spawnNode([nextBin, "start", "--hostname", host, "--port", port], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  await waitForServer(baseUrl);
  await runSmoke(baseUrl);
} finally {
  await stopServer();
}
