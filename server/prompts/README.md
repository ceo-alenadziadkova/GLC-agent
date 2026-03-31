# Agent prompts (markdown)

Long-form LLM instructions for pipeline agents live here as `.md` files so they can be edited without touching TypeScript.

- **`ux-agent.md`** — UX / conversion phase (phase 4). Loaded at runtime relative to the agent module (`import.meta.url`), so startup directory does not matter.

To add a new prompt-backed agent: place `your-agent.md` here, resolve its path from the module location (`import.meta.url`) + `readFileSync`, and keep a short comment in the agent class pointing to this file.
