import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const workspace = process.cwd();
const nextDir = resolve(workspace, ".next");
const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  const useWindowsCommandShim = process.platform === "win32" && /\.cmd$/i.test(command);
  const spawnCommand = useWindowsCommandShim ? "cmd.exe" : command;
  const spawnArgs = useWindowsCommandShim
    ? ["/d", "/s", "/c", [command, ...args].join(" ")]
    : args;
  const result = spawnSync(spawnCommand, spawnArgs, {
    cwd: workspace,
    env: process.env,
    shell: false,
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function stopProjectDevServer() {
  if (process.platform !== "win32") return;

  console.log("Checking for stale project dev server...");
  const escapedWorkspace = workspace.replaceAll("'", "''");
  const currentPid = process.pid;
  const command = `
$workspace = '${escapedWorkspace}'
$currentPid = ${currentPid}
$procs = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object {
  $_.CommandLine -and
  $_.ProcessId -ne $currentPid -and
  $_.CommandLine.Contains($workspace) -and
  (
    $_.CommandLine.Contains('next" dev') -or
    $_.CommandLine.Contains('next'' dev') -or
    $_.CommandLine.Contains('next dev') -or
    $_.CommandLine.Contains('start-server.js') -or
    $_.CommandLine.Contains('scripts/dev.mjs')
  ) -and
  -not $_.CommandLine.Contains('scripts\\verify.mjs') -and
  -not $_.CommandLine.Contains('scripts/verify.mjs')
}
$procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
`;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    cwd: workspace,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function cleanNextBuildOutput() {
  if (!nextDir.startsWith(workspace)) {
    throw new Error(`Refusing to remove unexpected .next path: ${nextDir}`);
  }

  console.log("Cleaning .next before verification...");
  rmSync(nextDir, {
    force: true,
    recursive: true,
  });
}

stopProjectDevServer();
cleanNextBuildOutput();
run(npmBin, ["run", "lint"]);
run(npmBin, ["run", "check:links"]);
run(process.execPath, ["scripts/verify-report-ledger.mjs"]);
run(npmBin, ["run", "build"]);
