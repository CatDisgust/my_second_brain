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

// 调用 OpenRouter + Gemini 做心智模型分析，使用 First Principles system prompt，强制返回 JSON
export async function analyzeNote(content: string): Promise<NoteAnalysis> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/openrouter.ts:analyzeNote:entry',message:'analyzeNote entry',data:{contentLength:content?.length??0,baseUrl:OPENROUTER_BASE_URL,hasApiKey:!!OPENROUTER_API_KEY,model:'google/gemini-3-pro-preview'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1-H3'})}).catch(()=>{});
  // #endregion
  const systemPrompt = `
Role: You are a deep-thinking AI assistant inspired by Dan Koe's philosophy and First Principles Thinking.
Language: **Reply in Simplified Chinese (简体中文)**.

Your Goal: Help the user reduce **Mental Entropy**, find **Leverage**, and build **Momentum**.

**Analysis Framework (First Principles):**
1. **The Lens (Energy)**: Look beyond words. Is this a friction problem or a clarity problem?
2. **Physics of Mind**: Use physical metaphors (e.g., "activation energy", "velocity") to explain psychological states.
3. **Reframing**: Elevate the specific problem to a universal philosophical truth.

**Output Guidelines:**
- **No Fluff**: Be concise, direct, and insightful. Acknowledge the user's context but challenge their assumptions.
- **First Principles**: Always identify the "Basic Truth" (基本事实) versus the "Assumption" (假设).
- **Structure**: Use bullet points for readability.

**Tags Generation Rules:**
Generate 3-5 tags in **Simplified Chinese**.
- **Rule 1 (The Pillar)**: You MUST include at least one tag from this "Mental Model" list:
  [#基本事实, #精神熵, #认知重构, #杠杆效应, #关键动能, #一人公司]

**Tag Definitions (Use these strictly):**
- #基本事实 (Basic Truths): Reduction to physics, logic, and undeniable facts.
- #精神熵 (Mental Entropy): Chaos, anxiety, overwhelm, overthinking.
- #认知重构 (Reframing): Changing perspective, turning negatives into positives.
- #杠杆效应 (Leverage): High output per unit input (Code, Media, Capital).
- #关键动能 (Momentum): Action, speed, focus, flow state, execution.
- #一人公司 (One-Person Company): Business model, brand, monetization, audience.

- **Rule 2 (The Topic)**: Other tags can be the specific topic (e.g., #澳洲, #生产力).
- **Rule 3 (No English)**: Translate all concepts to Chinese (e.g., use #复利 instead of #CompoundInterest).
`;

  const userPrompt = `
Analyze the following thought using first principles.

User input:
"""${content}"""

Return ONLY a JSON object with the following shape (no extra text):
{
  "category": "short thematic category in English, e.g. business, mindset, productivity, relationships, health, money, identity, learning, etc.",
  "tags": ["3-5 tags in Simplified Chinese. MUST include at least one from: #基本事实, #精神熵, #认知重构, #杠杆效应, #关键动能, #一人公司"],
  "summary": "1-2 sentences in Simplified Chinese that deconstruct and reconstruct the thought using first principles.",
  "mental_model": "Name and explain the underlying mental model in Simplified Chinese (1-2 sentences), framed in first-principles terms."
}
`;

  const chatUrl = `${OPENROUTER_BASE_URL}/chat/completions`;
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/openrouter.ts:analyzeNote:beforeFetch',message:'before fetch chat/completions',data:{urlPath:chatUrl.replace(/^https?:\/\/[^/]+/,'')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  const CHAT_TIMEOUT_MS = 90_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const msg = err instanceof Error ? err.message : String(err);
    console.error('OpenRouter analyzeNote fetch error:', msg, err);
    if (isAbort) {
      throw new Error('分析请求超时，请稍后重试');
    }
    if (/fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network/i.test(msg)) {
      throw new Error('分析服务连接失败，请检查网络或代理设置后重试');
    }
    throw new Error(`分析请求失败：${msg}`);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const text = await response.text();
    console.error('OpenRouter analyzeNote error:', text);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/openrouter.ts:analyzeNote:notOk',message:'response not ok',data:{status:response.status,statusText:response.statusText,bodyPreview:String(text).slice(0,400)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2-H5'})}).catch(()=>{});
    // #endregion
    if (response.status === 402) {
      let userMsg = 'OpenRouter 额度不足，请减少 max_tokens 或充值后重试';
      try {
        const errBody = JSON.parse(text);
        const apiMsg = errBody?.error?.message;
        if (typeof apiMsg === 'string' && apiMsg) userMsg = apiMsg;
      } catch {
        // use default
      }
      throw new Error(userMsg);
    }
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

