// Asks for the Divyam API key when Pi installs this package and stores it in Pi's
// auth.json, the same place /login puts it. `pi install` runs `npm install` in the
// package, and npm runs this script.
//
// npm runs install scripts with stdin detached and their output hidden, so the prompt
// talks to the terminal directly through /dev/tty. With no terminal (CI, Windows, a
// piped install) it does nothing. It never fails the install: every path exits 0.
import {
	closeSync,
	existsSync,
	mkdirSync,
	openSync,
	readFileSync,
	rmdirSync,
	statSync,
	writeFileSync,
	writeSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import tty from "node:tty";

const PROVIDER = "divyam";
// Pi guards auth.json with proper-lockfile, which takes `<file>.lock` as a directory and
// treats it as stale after 10 seconds. Taking the same lock keeps a running Pi from
// writing the file at the same time.
const LOCK_STALE_MS = 10_000;
const LOCK_WAIT_MS = 5_000;

// Mirrors Pi's getAgentDir(): PI_CODING_AGENT_DIR with ~ expanded, else ~/.pi/agent.
function agentDir() {
	const dir = process.env.PI_CODING_AGENT_DIR;
	if (!dir) return join(homedir(), ".pi", "agent");
	if (dir === "~") return homedir();
	if (dir.startsWith("~/")) return join(homedir(), dir.slice(2));
	return dir;
}

function readAuth(authPath) {
	if (!existsSync(authPath)) return {};
	const auth = JSON.parse(readFileSync(authPath, "utf8"));
	if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
		throw new Error(`${authPath} is not a JSON object`);
	}
	return auth;
}

function openTerminal() {
	try {
		return { readFd: openSync("/dev/tty", "r"), writeFd: openSync("/dev/tty", "w") };
	} catch {
		return undefined;
	}
}

// Reads a line in raw mode, echoing `*` per character. Resolves undefined on Ctrl+C or
// Ctrl+D, and on an empty line.
function promptSecret(terminal, question) {
	const write = (text) => writeSync(terminal.writeFd, text);
	return new Promise((resolve) => {
		const input = new tty.ReadStream(terminal.readFd);
		input.setRawMode(true);
		input.setEncoding("utf8");
		let value = "";
		const finish = (result) => {
			input.setRawMode(false);
			input.destroy();
			write("\r\n");
			resolve(result?.trim() || undefined);
		};
		write(question);
		input.on("data", (chunk) => {
			// Bracketed-paste markers wrap pasted text; other escape sequences are keys
			// such as arrows, which have no meaning here.
			const text = chunk.replace(/\x1b\[20[01]~/g, "");
			if (text.startsWith("\x1b")) return;
			for (const char of text) {
				if (char === "\r" || char === "\n") return finish(value);
				if (char === "\x03" || char === "\x04") return finish(undefined);
				if (char === "\x7f" || char === "\b") {
					if (value) {
						value = value.slice(0, -1);
						write("\b \b");
					}
					continue;
				}
				if (char < " ") continue;
				value += char;
				write("*");
			}
		});
	});
}

async function withAuthLock(authPath, fn) {
	const lockPath = `${authPath}.lock`;
	const deadline = Date.now() + LOCK_WAIT_MS;
	while (true) {
		try {
			mkdirSync(lockPath);
			break;
		} catch (error) {
			if (error.code !== "EEXIST") throw error;
			try {
				if (Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS) {
					rmdirSync(lockPath);
					continue;
				}
			} catch {
				continue;
			}
			if (Date.now() > deadline) throw new Error("auth.json is locked by another Pi process");
			await sleep(100);
		}
	}
	try {
		return fn();
	} finally {
		try {
			rmdirSync(lockPath);
		} catch {}
	}
}

async function main() {
	if (process.env.CI || process.env.DIVYAM_API_KEY?.trim()) return;

	const dir = agentDir();
	const authPath = join(dir, "auth.json");
	if (readAuth(authPath)[PROVIDER]) return;

	const terminal = openTerminal();
	if (!terminal) return;
	const say = (text) => writeSync(terminal.writeFd, `${text}\r\n`);

	try {
		say("");
		const key = await promptSecret(terminal, "Divyam API key (Enter to skip): ");
		if (!key) {
			say("Skipped. Add it later in Pi: /login, Sign in with an API key, Divyam. Or set DIVYAM_API_KEY.");
			return;
		}

		mkdirSync(dir, { recursive: true, mode: 0o700 });
		const saved = await withAuthLock(authPath, () => {
			const auth = readAuth(authPath);
			if (auth[PROVIDER]) return false;
			auth[PROVIDER] = { type: "api_key", key };
			// Mode applies on creation only, as in Pi, so existing permissions stay.
			writeFileSync(authPath, JSON.stringify(auth, null, 2), { encoding: "utf8", mode: 0o600 });
			return true;
		});
		say(saved ? `Saved the Divyam API key to ${authPath}` : `${authPath} already has a Divyam key; left it unchanged.`);
	} catch (error) {
		say(`Could not save the Divyam API key: ${error instanceof Error ? error.message : String(error)}`);
		say("Add it later in Pi: /login, Sign in with an API key, Divyam. Or set DIVYAM_API_KEY.");
	} finally {
		closeSync(terminal.writeFd);
	}
}

main().catch(() => {}).finally(() => process.exit(0));
