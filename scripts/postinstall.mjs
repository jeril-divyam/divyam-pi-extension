// Adds the Divyam models to Pi's enabledModels when Pi installs this package. A non-empty
// enabledModels makes /model open on that list and limits Ctrl+P cycling to it, which
// would hide the Divyam models. `pi install` clones the package and runs `npm install` in
// it, and npm runs this script. Pi reads settings at startup, so it starts with the models
// in its list.
//
// The key usually isn't set yet at this point. Until it is, Pi warns at startup that the
// Divyam entries match no models.
//
// It never fails the install: every path exits 0.
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Mirrors Pi's getAgentDir(): PI_CODING_AGENT_DIR with ~ expanded, else ~/.pi/agent.
function agentDir() {
	const dir = process.env.PI_CODING_AGENT_DIR;
	if (!dir) return join(homedir(), ".pi", "agent");
	if (dir === "~") return homedir();
	if (dir.startsWith("~/")) return join(homedir(), dir.slice(2));
	return dir;
}

function isInside(parent, child) {
	const path = relative(parent, child);
	return path !== "" && !path.startsWith("..") && !isAbsolute(path);
}

// Only a user-scope install: Pi puts those under <agentDir>/git or <agentDir>/npm. This
// skips project installs (which use the project's own settings), `pi -e` trial runs, and
// `npm install` run by hand in a checkout.
function installedForUser(dir, packageDir) {
	return ["git", "npm"].some((root) => isInside(join(dir, root), packageDir));
}

async function addToEnabledModels(dir) {
	const settingsPath = join(dir, "settings.json");
	if (!existsSync(settingsPath)) return false;
	const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
	const enabledModels = settings?.enabledModels;
	// Empty or unset means every model is already listed.
	if (!Array.isArray(enabledModels) || enabledModels.length === 0) return false;

	const { MODELS, PROVIDER } = await import("../lib/divyam.mjs");
	const listed = enabledModels.some(
		(pattern) => typeof pattern === "string" && pattern.toLowerCase().startsWith(`${PROVIDER}/`),
	);
	if (listed) return false;

	settings.enabledModels = [...enabledModels, ...MODELS.map(({ id }) => `${PROVIDER}/${id}`)];
	// Pi writes settings.json the same way: two-space indent, no trailing newline.
	writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
	return true;
}

try {
	const dir = realpathSync(agentDir());
	const packageDir = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
	if (installedForUser(dir, packageDir) && (await addToEnabledModels(dir))) {
		console.log(`divyam-pi-extension: added the Divyam models to enabledModels in ${join(dir, "settings.json")}`);
	}
} catch {
	// Leave settings alone; the models are still available through Tab in /model.
}
