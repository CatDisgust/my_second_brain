const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.NEXT_PUBLIC_OPENROUTER_PROXY_URL;

if (!OPENROUTER_API_KEY) {
  throw new Error('Missing env var: OPENROUTER_API_KEY');
}

if (!OPENROUTER_BASE_URL) {
  throw new Error('Missing env var: NEXT_PUBLIC_OPENROUTER_PROXY_URL');
}

export type NoteAnalysis = {
  category: string;
  tags: string[];
  summary: string;
  mental_model: string;
};

// 调用 OpenRouter + Gemini 做心智模型分析，强制返回 JSON
export async function analyzeNote(content: string): Promise<NoteAnalysis> {
  const prompt = `
你是一名深度理解 Dan Koe 思想体系的 Second Brain 构筑师。
用户会给出一段中文或英文的感想/总结，请你只返回 JSON，不要包含任何多余文字。

返回格式（严格 JSON）：
{
  "category": "简短的主题分类，如：business, mindset, productivity, relationships, health ...",
  "tags": ["多个标签，使用英文或中英文混合均可"],
  "summary": "用 1-2 句话提炼这段文字的核心洞察",
  "mental_model": "根据 Dan Koe 哲学，指出这段话对应的底层心智模型，例如：Leverage, Identity Shift, Infinite Games, Optionality, First Principles, Focus, Scarcity vs Abundance, Value Creation, Self-Concept 等，并简要解释原因"
}

用户原文：
"""${content}"""
`;

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      // 通过 Cloudflare Worker 代理，使用 Gemini 3 Pro
      model: 'google/gemini-3-pro-preview',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('OpenRouter analyzeNote error:', text);
    throw new Error('Failed to analyze note via OpenRouter');
  }

  const json = await response.json();
  const raw = json.choices?.[0]?.message?.content ?? '';

  try {
    // 模型有时会包一层 ```json```，这里做一次清洗
    const cleaned = String(raw)
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return {
      category: parsed.category ?? 'uncategorized',
      tags: parsed.tags ?? [],
      summary: parsed.summary ?? '',
      mental_model: parsed.mental_model ?? '',
    };
  } catch (err) {
    console.error('Failed to parse analysis JSON:', err, raw);
    throw new Error('Failed to parse analysis JSON from OpenRouter');
  }
}

// 使用 OpenRouter 的 embedding 接口，生成 text-embedding-3-small 向量
export async function embedText(text: string): Promise<number[]> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('OpenRouter embedText error:', body);
    throw new Error('Failed to create embedding via OpenRouter');
  }

  const json = await response.json();
  const embedding = json.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Invalid embedding response from OpenRouter');
  }

  return embedding as number[];
}

