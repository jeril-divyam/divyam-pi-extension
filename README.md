# divyam-pi-extension

A [Pi](https://pi.dev) package that adds Divyam Router as the `divyam` model provider.

## Install

```bash
pi install git:github.com/jeril-divyam/divyam-pi-extension
```

Then add your API key: run `/login` in Pi, choose **Sign in with an API key**, then **Divyam**. Pi saves it in `~/.pi/agent/auth.json`. Until a key is set, Pi shows a reminder at startup. You can set `DIVYAM_API_KEY` before starting Pi instead.

If `enabledModels` is set in `~/.pi/agent/settings.json`, `/model` opens on that list and Ctrl+P cycles through it, which would hide the Divyam models. So the first time Pi starts with a key (or after `/reload`), the extension adds them to the list and tells you. They show there from the next start. This happens once: if you remove them, they stay removed.

## Configuration

`/login` also changes the key, and `/logout` removes it.

`DIVYAM_BASE_URL` points Pi at another router deployment. The default is `https://api.demo.divyam.ai/v1`.

## Uninstall

```bash
pi remove git:github.com/jeril-divyam/divyam-pi-extension
```

Pi doesn't run any package code on removal, so these stay behind:

- The key in `auth.json`. Remove it with `/logout` before uninstalling.
- The `divyam/...` entries the extension added to `enabledModels` in `~/.pi/agent/settings.json`.
- `~/.pi/agent/divyam-pi-extension.json`, which records that the models were added.

## Models

| Model | Context | Max output |
|---|---|---|
| `divyam/divyam-as/gpt-5.6-sol` | 400K | 128K |
| `divyam/divyam-as/gpt-6-sol` | 400K | 128K |

This package replaces any `divyam` provider defined in `~/.pi/agent/models.json`.
