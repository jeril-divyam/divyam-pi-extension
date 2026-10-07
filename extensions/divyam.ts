import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	type ExtensionAPI,
	type ExtensionContext,
	getAgentDir,
} from "@earendil-works/pi-coding-agent";

// Divyam Router is a drop-in for the OpenAI Chat Completions API, so Pi's built-in
// openai-completions implementation handles requests, streaming, tools and usage.
//
// The key comes from auth.json, where /login stores it, or from DIVYAM_API_KEY. DIVYAM_BASE_URL points Pi at another router deployment; the default
// is the demo environment.
const PROVIDER = "divyam";
const DEFAULT_BASE_URL = "https://api.demo.divyam.ai/v1";

// The router's /v1/models lists ids only, so limits and prices live here.
const MODELS = [
	{ id: "divyam-as/gpt-5.6-sol", name: "Divyam GPT 5.6 Sol" },
	{ id: "divyam-as/gpt-6-sol", name: "Divyam GPT 6 Sol" },
];
const MODEL_REFS = MODELS.map(({ id }) => `${PROVIDER}/${id}`);

// Records that the models were added to enabledModels, so entries removed later stay removed.
const STATE_FILE = "divyam-pi-extension.json";

function readJsonObject(path: string): Record<string, unknown> | undefined {
	if (!existsSync(path)) return undefined;
	try {
		const value = JSON.parse(readFileSync(path, "utf8"));
		return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

function hasDivyamPattern(enabledModels: unknown[]): boolean {
	return enabledModels.some(
		(pattern) => typeof pattern === "string" && pattern.toLowerCase().startsWith(`${PROVIDER}/`),
	);
}

// A non-empty enabledModels makes /model open on that list and limits Ctrl+P cycling to
// it, which would hide the Divyam models, so they are added to it once. Extensions cannot
// change the live scope, so the edit lands in settings.json and applies on the next start.
function addToEnabledModels(ctx: ExtensionContext): void {
	const agentDir = getAgentDir();
	const statePath = join(agentDir, STATE_FILE);
	if (readJsonObject(statePath)?.enabledModelsAdded) return;

	const settingsPath = join(agentDir, "settings.json");
	const settings = readJsonObject(settingsPath);
	const enabledModels = settings?.enabledModels;
	// Empty or unset means every model is already listed; a later start checks again.
	if (!settings || !Array.isArray(enabledModels) || enabledModels.length === 0) return;

	if (!hasDivyamPattern(enabledModels)) {
		settings.enabledModels = [...enabledModels, ...MODEL_REFS];
		writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
		ctx.ui.notify(
			"Added the Divyam models to enabledModels. They show in /model and Ctrl+P from the next start.",
			"info",
		);
	}
	writeFileSync(statePath, JSON.stringify({ enabledModelsAdded: true }, null, 2), "utf8");
}

export default function divyamProvider(pi: ExtensionAPI) {
	pi.registerProvider(PROVIDER, {
		name: "Divyam",
		baseUrl: process.env.DIVYAM_BASE_URL?.trim() || DEFAULT_BASE_URL,
		api: "openai-completions",
		apiKey: "$DIVYAM_API_KEY",
		models: MODELS.map(({ id, name }) => ({
			id,
			name,
			reasoning: false,
			input: ["text"],
			contextWindow: 400_000,
			maxTokens: 128_000,
			cost: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
		})),
	});

	// Also fires on /reload, so a key added with /login is picked up without a restart.
	pi.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;
		// Without a key the models are unavailable, and a pattern naming them would make
		// Pi warn at every start.
		if (!ctx.modelRegistry.getAvailable().some((model) => model.provider === PROVIDER)) {
			ctx.ui.notify(
				"Divyam has no API key. Run /login, choose Sign in with an API key, then Divyam. Or set DIVYAM_API_KEY.",
				"warning",
			);
			return;
		}
		try {
			addToEnabledModels(ctx);
		} catch (error) {
			ctx.ui.notify(
				`Divyam: could not update enabledModels: ${error instanceof Error ? error.message : String(error)}`,
				"error",
			);
		}
	});
}
