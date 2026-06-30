import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const workspace = process.cwd();
const nextDir = resolve(workspace, ".next");

const env = {
  ...process.env,
  WATCHPACK_POLLING: process.env.WATCHPACK_POLLING ?? "true",
  CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING ?? "true",
};

const host = process.env.HOST ?? "127.0.0.1";
const port = process.env.PORT ?? "3001";
const nextBin = require.resolve("next/dist/bin/next");

if (nextDir.startsWith(workspace)) {
  rmSync(nextDir, {
    force: true,
    recursive: true,
  });
}

const child = spawn(process.execPath, [nextBin, "dev", "--hostname", host, "--port", port], {
  env,
  stdio: ["inherit", "pipe", "pipe"],
});

function forwardWithoutKnownWindowsWatchNoise(stream, target) {
  let buffered = "";

  stream.on("data", (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      if (line.includes("System Volume Information")) continue;
      target.write(`${line}\n`);
    }
  });

  stream.on("end", () => {
    if (buffered && !buffered.includes("System Volume Information")) {
      target.write(buffered);
    }
  });
}

if (child.stdout) forwardWithoutKnownWindowsWatchNoise(child.stdout, process.stdout);
if (child.stderr) forwardWithoutKnownWindowsWatchNoise(child.stderr, process.stderr);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
