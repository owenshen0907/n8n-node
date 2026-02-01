# StepFun for n8n (TTS + ASR)

This package provides **StepFun** nodes for n8n:

- **StepFun TTS**: text → audio (binary output)
- **StepFun ASR**: audio → text (JSON/text output)

## Credentials

Create credentials of type **StepFun API**:

- `Base URL`: default `https://api.stepfun.com/v1`
- `API Key`: your StepFun key

## Nodes

### StepFun TTS

- Endpoint default: `/audio/speech`
- Outputs audio to binary property (default: `audio`)

### StepFun ASR

- Endpoint default: `/audio/transcriptions`
- Audio input supports:
  - **Binary** (from previous node)
  - **URL** (download then transcribe)

## Templates (import into n8n)

See `templates/`:

- `templates/stepfun-tts-basic.json`
- `templates/stepfun-asr-basic.json`

## Development

```powershell
& "$env:ProgramFiles\nodejs\npm.cmd" install
& "$env:ProgramFiles\nodejs\npm.cmd" run build
```

