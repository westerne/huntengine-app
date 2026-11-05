// The one place the advisor talks to an AI provider (docs/SPEC_ADVISOR.md §6).
// The loop in run.ts only sees AdvisorModel, so swapping providers means
// writing another adapter here and nothing else.

import OpenAI from 'openai';

export type ToolCall = { id: string; name: string; args: string };
export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };
export type ToolSpec = { name: string; description: string; parameters: Record<string, unknown> };
export type ModelTurn = { text: string | null; toolCalls: ToolCall[]; usage: { input: number; output: number } };

export interface AdvisorModel {
  name: string;
  // Dollars per million tokens, for the usage log. An estimate, not a bill.
  price: { input: number; output: number };
  turn(messages: ChatMessage[], tools: ToolSpec[]): Promise<ModelTurn>;
}

export function costOf(model: Pick<AdvisorModel, 'price'>, usage: { input: number; output: number }): number {
  return (usage.input * model.price.input + usage.output * model.price.output) / 1_000_000;
}

export function openAIModel(apiKey = process.env.OPENAI_API_KEY, name = 'gpt-4o'): AdvisorModel {
  const client = new OpenAI({ apiKey });
  return {
    name,
    price: { input: 2.5, output: 10 },
    async turn(messages, tools) {
      const res = await client.chat.completions.create({
        model: name,
        temperature: 0,
        messages: messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
          if (m.role === 'tool') return { role: 'tool', tool_call_id: m.toolCallId, content: m.content };
          if (m.role === 'assistant') {
            return {
              role: 'assistant', content: m.content,
              ...(m.toolCalls?.length ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: 'function' as const, function: { name: c.name, arguments: c.args } })) } : {}),
            };
          }
          return { role: m.role, content: m.content };
        }),
        ...(tools.length ? { tools: tools.map((t) => ({ type: 'function' as const, function: t })) } : {}),
      });
      const msg = res.choices[0]?.message;
      return {
        text: msg?.content ?? null,
        toolCalls: (msg?.tool_calls ?? []).flatMap((c) =>
          c.type === 'function' ? [{ id: c.id, name: c.function.name, args: c.function.arguments }] : []),
        usage: { input: res.usage?.prompt_tokens ?? 0, output: res.usage?.completion_tokens ?? 0 },
      };
    },
  };
}
