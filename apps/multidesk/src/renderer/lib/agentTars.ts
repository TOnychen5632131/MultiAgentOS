import type { AgentPlan } from './types';

type AgentRequest = { prompt: string; screenshot: string; model?: string };

const MOCK_PLAN: AgentPlan = {
  summary: 'Mock 计划：点击左上角并输入文本（本地推理失败时使用）',
  actions: [
    { id: '1', type: 'click', description: '点击左上按钮' },
    {
      id: '2',
      type: 'input',
      description: '输入文本',
      payload: { text: 'Hello from MultiDesk' },
    },
  ],
};

const PROMPT_TEMPLATE = ({
  userPrompt,
  screenshotBase64,
}: {
  userPrompt: string;
  screenshotBase64: string;
}) => `
You are UI-TARS, an expert GUI agent. Given a user request and a base64-encoded screenshot, plan a short action sequence to fulfill the request.

Rules:
- Output ONLY JSON in the schema:
{
  "summary": "one-line summary",
  "actions": [
    {
      "id": "step-1",
      "type": "click" | "input" | "drag" | "scroll",
      "description": "what and where to do",
      "payload": {
        "target": "optional selector or landmark",
        "text": "for input",
        "position": {"x": number, "y": number},
        "dragTo": {"x": number, "y": number}
      }
    }
  ]
}
- Keep 3-6 steps max.
- Coordinates are pixel positions relative to the screenshot (top-left origin).
- If unsure, prefer high-level description in payload.target.

User request:
${userPrompt}

Screenshot (data URL):
${screenshotBase64}
`;

function tryParsePlan(raw: string): AgentPlan | null {
  try {
    const trimmed = raw.trim();
    const jsonStart = trimmed.indexOf('{');
    const jsonEnd = trimmed.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const slice = trimmed.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(slice) as AgentPlan;
    if (!parsed.actions || !Array.isArray(parsed.actions)) return null;
    return parsed;
  } catch (err) {
    console.error('LLM output parse error', err);
    return null;
  }
}

export async function requestAgentActions(
  input: AgentRequest,
): Promise<AgentPlan> {
  try {
    const fullPrompt = PROMPT_TEMPLATE({
      userPrompt: input.prompt,
      screenshotBase64: input.screenshot,
    });
    const raw = await window.api.llamaRun({
      prompt: fullPrompt,
      modelId: input.model,
    });
    const plan = tryParsePlan(raw);
    if (plan) return plan;
    console.warn('LLM output unparsable, using mock');
    return MOCK_PLAN;
  } catch (err) {
    console.error('LLM call failed, using mock', err);
    return MOCK_PLAN;
  }
}
