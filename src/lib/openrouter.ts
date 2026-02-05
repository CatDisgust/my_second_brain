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

// 调用 OpenRouter 做 Naval Ravikant 风格内化分析，强制返回 JSON
export async function analyzeNote(content: string): Promise<NoteAnalysis> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/openrouter.ts:analyzeNote:entry',message:'analyzeNote entry',data:{contentLength:content?.length??0,baseUrl:OPENROUTER_BASE_URL,hasApiKey:!!OPENROUTER_API_KEY,model:'google/gemini-3-pro-preview'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1-H3'})}).catch(()=>{});
  // #endregion
  const systemPrompt = `你是 Naval Ravikant 的思想克隆体。你的任务是将用户输入的「焦虑/困惑」转化为「长期资产/底层原则」。

你的思维原则：
- 第一性原理：剥离情绪和表象，直击事物的硬核逻辑。
- 极简主义：如果一句话能说完，绝不写第二句。
- 资产导向：所有的焦虑都是因为对规则理解不透。你要给出那个「不变的规则」。
- 拒绝说教：用平实的语言，像老友在散步时给出的洞见。

输出规范（必须遵守）：
- 风格：通俗、深刻、断句短、不使用大词（如「维度」、「架构」、「系统化」等）。
- 所有输出使用简体中文。
- 你必须返回合法的 JSON，不要返回 markdown 代码块或多余说明。`;

  const userPrompt = `用户输入：
"""${content}"""

请严格按以下 JSON 结构返回（不要包含其他文字或 markdown）：
{
  "essence": "【本质洞察】用一句话揭示这个焦虑背后的真相。",
  "action_plan": "【资产化方案】1-2 条极其具体的、可落地的原则，用换行或序号分隔。",
  "naval_quote": "【Naval 语录】一句 Naval 风格的原创金句。",
  "category": "short category in English, e.g. mindset, productivity, creation",
  "tags": ["2-5 个简体中文标签，如 复利、耐心、特定知识"]
}

示例结构（勿照抄内容）：
{
  "essence": "你在用短线反馈衡量长线资产的价值。",
  "action_plan": "别盯着数据看，盯着你的「特定知识」看。\\n现在的无人问津是建立复利前的静默期。",
  "naval_quote": "如果你无法想象自己坚持做这件事十年，那就连十分钟都不要投入。",
  "category": "mindset",
  "tags": ["复利", "耐心", "特定知识"]
}`;

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

    // Naval 风格：essence + action_plan -> summary，naval_quote -> mental_model
    const hasNavalShape =
      typeof parsed.essence === 'string' || typeof parsed.action_plan === 'string' || typeof parsed.naval_quote === 'string';
    if (hasNavalShape) {
      const essence = String(parsed.essence ?? '').trim();
      const actionPlan = parsed.action_plan;
      const actionPlanStr = Array.isArray(actionPlan)
        ? actionPlan.map((s: unknown) => String(s)).join('\n')
        : String(actionPlan ?? '').trim();
      const summary = [essence, actionPlanStr].filter(Boolean).join('\n\n');
      return {
        category: parsed.category ?? 'mindset',
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t)) : [],
        summary: summary || '',
        mental_model: String(parsed.naval_quote ?? '').trim() || '',
      };
    }

    // 兼容旧结构：summary + mental_model
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

