import os
import uuid
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# Model routing: task tier -> per-provider model
MODELS = {
    "heavy":      {"anthropic": "claude-sonnet-5",             "openai": "gpt-5.6-terra"},
    "generation": {"anthropic": "claude-sonnet-4-6",           "openai": "gpt-5.6-luna"},
    "cheap":      {"anthropic": "claude-haiku-4-5-20251001",   "openai": "gpt-5.4-mini"},
}


def route(task: str, pref: str = "auto"):
    """Return an ordered list of (provider, model) for a task, primary first."""
    tier = MODELS.get(task, MODELS["generation"])
    if pref == "openai":
        order = ["openai", "anthropic"]
    elif pref == "anthropic":
        order = ["anthropic", "openai"]
    else:  # auto: Claude leads generation/cheap; GPT leads heaviest reasoning
        order = ["openai", "anthropic"] if task == "heavy" else ["anthropic", "openai"]
    return [(p, tier[p]) for p in order]


async def stream_ai(task: str, system: str, prompt: str, pref: str = "auto"):
    """Stream tokens with cross-provider fallback (Claude <-> GPT)."""
    routes = route(task, pref)
    last_err = None
    for provider, model in routes:
        got = False
        try:
            chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                           system_message=system).with_model(provider, model)
            async for ev in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(ev, TextDelta):
                    got = True
                    yield ev.content
                elif isinstance(ev, StreamDone):
                    break
            return
        except Exception as e:  # noqa
            last_err = e
            if got:
                return
            continue
    yield f"\n\n[AI is temporarily unavailable. Please try again. ({last_err})]"


async def complete_ai(task: str, system: str, prompt: str, pref: str = "auto") -> str:
    parts = []
    async for chunk in stream_ai(task, system, prompt, pref):
        parts.append(chunk)
    return "".join(parts)
