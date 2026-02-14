import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "../..");
const bridgeEntry = resolve(projectRoot, "src-tauri/bridge/runner.ts");
const binaryBase = resolve(projectRoot, "src-tauri/binaries/openfarm-bridge");

const targetByPlatform = {
	darwin: {
		x64: "bun-darwin-x64",
		arm64: "bun-darwin-arm64",
	},
	linux: {
		x64: "bun-linux-x64",
		arm64: "bun-linux-arm64",
	},
	win32: {
		x64: "bun-windows-x64",
		arm64: "bun-windows-arm64",
	},
};

const tripleByPlatform = {
	darwin: {
		x64: "x86_64-apple-darwin",
		arm64: "aarch64-apple-darwin",
	},
	linux: {
		x64: "x86_64-unknown-linux-gnu",
		arm64: "aarch64-unknown-linux-gnu",
	},
	win32: {
		x64: "x86_64-pc-windows-msvc",
		arm64: "aarch64-pc-windows-msvc",
	},
};

const target = targetByPlatform[process.platform]?.[process.arch];
const triple = tripleByPlatform[process.platform]?.[process.arch];
if (!target) {
	console.error(
		`Unsupported bridge target for ${process.platform}/${process.arch}`,
	);
	process.exit(1);
}
if (!triple) {
	console.error(
		`Unsupported bridge triple for ${process.platform}/${process.arch}`,
	);
	process.exit(1);
}

const ext = process.platform === "win32" ? ".exe" : "";
const output = `${binaryBase}-${triple}${ext}`;
const genericOutput = `${binaryBase}${ext}`;
mkdirSync(dirname(output), { recursive: true });

const result = spawnSync(
	"bun",
	[
		"build",
		bridgeEntry,
		"--compile",
		"--target",
		target,
		"--outfile",
		output,
	],
	{
		cwd: projectRoot,
		stdio: "inherit",
	},
);

if (result.status !== 0) {
	process.exit(result.status ?? 1);
}

if (genericOutput !== output) {
	copyFileSync(output, genericOutput);
}
