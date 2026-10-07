// Model list and enabledModels handling, shared by the extension and the install script.
// Plain JavaScript so the install script can run it with node directly.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PROVIDER = "divyam";

// The router's /v1/models lists ids only, so limits and prices live in the extension.
export const MODELS = [
	{ id: "divyam-as/gpt-5.6-sol", name: "Divyam GPT 5.6 Sol" },
	{ id: "divyam-as/gpt-6-sol", name: "Divyam GPT 6 Sol" },
];

const MODEL_REFS = MODELS.map(({ id }) => `${PROVIDER}/${id}`);

// Records that the models were added, so entries removed later stay removed.
const STATE_FILE = "divyam-pi-extension.json";

function readJsonObject(path) {
	if (!existsSync(path)) return undefined;
	try {
		const value = JSON.parse(readFileSync(path, "utf8"));
		return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

function hasDivyamPattern(enabledModels) {
	return enabledModels.some(
		(pattern) => typeof pattern === "string" && pattern.toLowerCase().startsWith(`${PROVIDER}/`),
	);
}

/**
 * A non-empty enabledModels makes /model open on that list and limits Ctrl+P cycling to
 * it, which would hide the Divyam models. This adds them to <agentDir>/settings.json once.
 * Pi reads the list at startup, so a running Pi sees the change from its next start.
 *
 * @param {string} agentDir
 * @returns {boolean} whether settings.json was changed
 */
export function addToEnabledModels(agentDir) {
	const statePath = join(agentDir, STATE_FILE);
	if (readJsonObject(statePath)?.enabledModelsAdded) return false;

	const settingsPath = join(agentDir, "settings.json");
	const settings = readJsonObject(settingsPath);
	const enabledModels = settings?.enabledModels;
	// Empty or unset means every model is already listed; a later run checks again.
	if (!settings || !Array.isArray(enabledModels) || enabledModels.length === 0) return false;

	const changed = !hasDivyamPattern(enabledModels);
	if (changed) {
		settings.enabledModels = [...enabledModels, ...MODEL_REFS];
		// Pi writes settings.json the same way: two-space indent, no trailing newline.
		writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
	}
	writeFileSync(statePath, JSON.stringify({ enabledModelsAdded: true }, null, 2), "utf8");
	return changed;
}
