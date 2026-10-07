import { type ExtensionAPI, getAgentDir } from "@earendil-works/pi-coding-agent";
import { addToEnabledModels, MODELS, PROVIDER } from "../lib/divyam.mjs";

// Divyam Router is a drop-in for the OpenAI Chat Completions API, so Pi's built-in
// openai-completions implementation handles requests, streaming, tools and usage.
//
// The key comes from auth.json, where /login stores it, or from DIVYAM_API_KEY.
// DIVYAM_BASE_URL points Pi at another router deployment; the default is the demo
// environment.
const DEFAULT_BASE_URL = "https://api.demo.divyam.ai/v1";

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
		if (!ctx.modelRegistry.getAvailable().some((model) => model.provider === PROVIDER)) {
			ctx.ui.notify(
				"Divyam has no API key. Run /login, choose Sign in with an API key, then Divyam. Or set DIVYAM_API_KEY.",
				"warning",
			);
			return;
		}
		// The install script normally adds the models. This covers installs where it did
		// not run, such as local paths, and a list that was empty at install time. It waits
		// for a key, since without one Pi warns at every start that the entries match nothing.
		try {
			if (addToEnabledModels(getAgentDir())) {
				ctx.ui.notify(
					"Added the Divyam models to enabledModels. They show in /model and Ctrl+P from the next start.",
					"info",
				);
			}
		} catch (error) {
			ctx.ui.notify(
				`Divyam: could not update enabledModels: ${error instanceof Error ? error.message : String(error)}`,
				"error",
			);
		}
	});
}
