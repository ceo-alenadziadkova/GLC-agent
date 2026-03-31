# Agent prompts (markdown)

Long-form LLM instructions for pipeline agents live here as `.md` files so they can be edited without touching TypeScript.

- **`ux-agent.md`** — UX / conversion phase (phase 4). Loaded at runtime from `process.cwd()/prompts/` (run the server with working directory set to the `server/` folder).

To add a new prompt-backed agent: place `your-agent.md` here, load it with `readFileSync` from the same directory convention, and keep a short comment in the agent class pointing to this file.
