# divyam-pi-extension

A [Pi](https://pi.dev) package that adds Divyam Router as the `divyam` model provider.

## Install

```bash
pi install git:github.com/jeril-divyam/divyam-pi-extension
```

Then add your API key: run `/login` in Pi, choose **Sign in with an API key**, then **Divyam**. Pi saves it in `~/.pi/agent/auth.json`. Until a key is set, Pi shows a reminder at startup. You can set `DIVYAM_API_KEY` before starting Pi instead.

The first time Pi starts with a key, it offers to add the Divyam models to `enabledModels` if that list is set. When it is, `/model` opens on that list and Ctrl+P cycles through it, so the Divyam models would be hidden. The change applies the next time Pi starts, and the question isn't asked again.

## Configuration

`/login` also changes the key, and `/logout` removes it.

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
