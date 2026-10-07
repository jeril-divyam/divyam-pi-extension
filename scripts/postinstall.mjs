// Adds the Divyam models to Pi's enabledModels when Pi installs this package, so Pi starts
// with them in its list. `pi install` clones the package and runs `npm install` in it,
// and npm runs this script. If the extension added them instead, Pi would only load them
// at the next start, and a settings save in between would write its older list back.
//
// The key usually isn't set yet at this point. Until it is, Pi warns at startup that the
// Divyam entries match no models.
//
// It never fails the install: every path exits 0.
import { realpathSync } from "node:fs";
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

try {
	const dir = realpathSync(agentDir());
	const packageDir = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
	if (installedForUser(dir, packageDir)) {
		const { addToEnabledModels } = await import("../lib/divyam.mjs");
		if (addToEnabledModels(dir)) {
			console.log(`divyam-pi-extension: added the Divyam models to enabledModels in ${join(dir, "settings.json")}`);
		}
	}
} catch {
	// The extension adds the models at startup if this could not.
}
