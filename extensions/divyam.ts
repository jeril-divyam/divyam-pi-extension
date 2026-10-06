import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Divyam Router is a drop-in for the OpenAI Chat Completions API, so Pi's built-in
// openai-completions implementation handles requests, streaming, tools and usage.
//
// The key comes from DIVYAM_API_KEY. DIVYAM_BASE_URL points Pi at another router
// deployment; the default is the demo environment.
const DEFAULT_BASE_URL = "https://api.demo.divyam.ai/v1";

// The router's /v1/models lists ids only, so limits and prices live here.
const MODELS = [
	{ id: "divyam-as/gpt-5.6-sol", name: "Divyam GPT 5.6 Sol" },
	{ id: "divyam-as/gpt-6-sol", name: "Divyam GPT 6 Sol" },
];

export default function divyamProvider(pi: ExtensionAPI) {
	pi.registerProvider("divyam", {
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
}
