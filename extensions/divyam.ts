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
// The key comes from auth.json (the install script or /login puts it there) or from
// DIVYAM_API_KEY. DIVYAM_BASE_URL points Pi at another router deployment; the default
// is the demo environment.
const PROVIDER = "divyam";
const DEFAULT_BASE_URL = "https://api.demo.divyam.ai/v1";

// The router's /v1/models lists ids only, so limits and prices live here.
const MODELS = [
	{ id: "divyam-as/gpt-5.6-sol", name: "Divyam GPT 5.6 Sol" },
	{ id: "divyam-as/gpt-6-sol", name: "Divyam GPT 6 Sol" },
];
const MODEL_REFS = MODELS.map(({ id }) => `${PROVIDER}/${id}`);

// Records that the enabledModels question was asked, so a "no" is not asked again.
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
// it, so the Divyam models stay out of sight unless they are added. Extensions cannot
// change the live scope, so the edit lands in settings.json and applies on the next start.
async function offerScopedModels(ctx: ExtensionContext): Promise<void> {
	const agentDir = getAgentDir();
	const statePath = join(agentDir, STATE_FILE);
	if (readJsonObject(statePath)?.scopedModelsAsked) return;

	const settingsPath = join(agentDir, "settings.json");
	const enabledModels = readJsonObject(settingsPath)?.enabledModels;
	// Empty or unset means every model is already listed.
	if (!Array.isArray(enabledModels) || enabledModels.length === 0) return;
	if (hasDivyamPattern(enabledModels)) return;

	const add = await ctx.ui.confirm(
		"Divyam models",
		`Add ${MODEL_REFS.join(" and ")} to enabledModels, so they show in /model and Ctrl+P? This applies the next time Pi starts.`,
	);
	if (add) {
		// Re-read: settings may have changed while the dialog was open.
		const settings = readJsonObject(settingsPath);
		const current = settings?.enabledModels;
		if (settings && Array.isArray(current) && !hasDivyamPattern(current)) {
			settings.enabledModels = [...current, ...MODEL_REFS];
			writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
			ctx.ui.notify("Added the Divyam models to enabledModels. Restart Pi to see them in /model.", "info");
		}
	}
	writeFileSync(statePath, JSON.stringify({ scopedModelsAsked: true }, null, 2), "utf8");
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

	// session_start also fires on /new, /resume and /reload; one dialog at a time.
	let offering = false;
	pi.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;
		if (!ctx.modelRegistry.getAvailable().some((model) => model.provider === PROVIDER)) {
			ctx.ui.notify(
				"Divyam has no API key. Run /login, choose Sign in with an API key, then Divyam. Or set DIVYAM_API_KEY.",
				"warning",
			);
			return;
		}
		if (offering) return;
		offering = true;
		// Not awaited, so the dialog does not hold up startup.
		void offerScopedModels(ctx)
			.catch((error: unknown) => {
				ctx.ui.notify(
					`Divyam: could not update enabledModels: ${error instanceof Error ? error.message : String(error)}`,
					"error",
				);
			})
			.finally(() => {
				offering = false;
			});
	});
}
