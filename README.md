# pi-divyam

A [Pi](https://pi.dev) package that adds Divyam Router as the `divyam` model provider.

## Install

```bash
pi install git:git@github.com:jeril-divyam/pi-divyam
```

Remove it with `pi remove git:git@github.com:jeril-divyam/pi-divyam`.

## API key

Set `DIVYAM_API_KEY` before starting Pi, or store the key in `~/.pi/agent/auth.json`:

```json
{
  "divyam": { "type": "api_key", "key": "..." }
}
```

`DIVYAM_BASE_URL` points Pi at another router deployment. The default is `https://api.demo.divyam.ai/v1`.

## Models

| Model | Context | Max output |
|---|---|---|
| `divyam/divyam-as/gpt-5.6-sol` | 400K | 128K |
| `divyam/divyam-as/gpt-6-sol` | 400K | 128K |

This package replaces any `divyam` provider defined in `~/.pi/agent/models.json`.
