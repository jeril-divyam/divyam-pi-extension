# divyam-pi-extension

A [Pi](https://pi.dev) package that adds Divyam Router as the `divyam` model provider.

## Install

```bash
pi install git:github.com/jeril-divyam/divyam-pi-extension
```

The install asks for your Divyam API key (input is hidden) and saves it in `~/.pi/agent/auth.json`. Press Enter to skip. It doesn't ask when `DIVYAM_API_KEY` is set, when `auth.json` already has a Divyam key, or when there is no terminal (CI).

The first time Pi starts with a key, it offers to add the Divyam models to `enabledModels` if that list is set. When it is, `/model` opens on that list and Ctrl+P cycles through it, so the Divyam models would be hidden. The change applies the next time Pi starts, and the question isn't asked again.

## API key

To add or change the key later, run `/login` in Pi, choose **Sign in with an API key**, then **Divyam**. Or set `DIVYAM_API_KEY` before starting Pi.

`DIVYAM_BASE_URL` points Pi at another router deployment. The default is `https://api.demo.divyam.ai/v1`.

## Uninstall

```bash
pi remove git:github.com/jeril-divyam/divyam-pi-extension
```

Pi doesn't run any package code on removal, so these stay behind:

- The key in `auth.json`. Remove it with `/logout` before uninstalling.
- The `divyam/...` entries in `enabledModels` in `~/.pi/agent/settings.json`, if you added them.
- `~/.pi/agent/divyam-pi-extension.json`, which remembers that the `enabledModels` question was asked.

## Models

| Model | Context | Max output |
|---|---|---|
| `divyam/divyam-as/gpt-5.6-sol` | 400K | 128K |
| `divyam/divyam-as/gpt-6-sol` | 400K | 128K |

This package replaces any `divyam` provider defined in `~/.pi/agent/models.json`.
