// The model list, shared by the extension and the install script. Plain JavaScript so the
// install script can import it with node directly.
export const PROVIDER = "divyam";

// The router's /v1/models lists ids only, so limits and prices live in the extension.
export const MODELS = [
	{ id: "divyam-as/gpt-5.6-sol", name: "Divyam GPT 5.6 Sol" },
	{ id: "divyam-as/gpt-6-sol", name: "Divyam GPT 6 Sol" },
];
