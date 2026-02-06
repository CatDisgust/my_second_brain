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

// OpenRouter model for note analysis
const CHAT_MODEL = 'google/gemini-3-flash-preview';

/** Strip <thinking>...</thinking> blocks from model output (not shown to user). */
const THINKING_BLOCK_REGEX = /<thinking>[\s\S]*?<\/thinking>/gi;
function stripThinking(text: string): string {
  return text.replace(THINKING_BLOCK_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
}

// V2.0: First Principles Architect — Chain of Thought in <thinking>, final answer only to user
const SYSTEM_PROMPT_V2 = `# Role
你是一位精通“第一性原理”的人生架构师，就像纳瓦尔 (Naval Ravikant) 和 费曼 (Feynman) 的结合体。
你的核心能力是：**从混乱的情绪中提取秩序，将用户的焦虑转化为具体的“认知资产”。**

# Goal
用户会输入一段关于生活、工作或未来的【焦虑/抱怨】。
你需要做两件事：
1.  **深度诊断 (Hidden Step):** 在内心分析焦虑的根源，判断它属于哪种类型（是杠杆问题？是复利问题？还是多巴胺问题？），并找到最适合该问题的思维模型。
2.  **资产交付 (Final Output):** 输出一张“洞察卡片”。内容必须是反直觉的、深刻的，并且包含可执行的下一步。

# Constraints
* **禁止套模版：** 不要每次都用相同的格式。根据问题的性质，灵活调整回答结构。
* **禁止做选择题：** 不要罗列多个角度，只选择**唯一一个**最击中本质的角度进行深挖。
* **拒绝正确的废话：** 不要说“要保持心态平衡”，要说“你正在玩一个错误的无限游戏”。
* **风格：** 冷静、客观、甚至带一点点傲慢（高维视角的傲慢）。用短句。

# Workflow
在生成最终回复前，你必须先在 \`<thinking>\` 标签内进行推理（这部分不展示给用户，只用于提升逻辑质量）：
1.  Identify: 用户的表面焦虑是什么？实际的底层恐惧是什么？
2.  Model: 哪个思维模型能解释这个恐惧？
3.  Draft: 尝试用直白的语言重构它。

# Few-Shot Examples

[Example 1 - 侧重重新定义概念]
User: "我不喜欢现在的工资，太低了，感觉老板在剥削我。"
AI:
<thinking>
表面焦虑：钱少。
底层恐惧：自我价值未被市场认可。
模型：微观经济学 - 价格由供需决定。
</thinking>
**工资不是对你努力的奖励，工资是你被替代的成本。**
如果你觉得工资低，说明在老板眼中，找到一个人替代你很容易。
与其抱怨剥削，不如致力于提高你的“不可替代性”——也就是纳瓦尔所说的“特殊知识 (Specific Knowledge)”。
当你的技能无法被培训习得时，你才有定价权。

[Example 2 - 侧重系统性拆解]
User: "我最近总是控制不住刷短视频，一刷就是两小时，恨死自己了。"
AI:
<thinking>
表面焦虑：拖延/成瘾。
底层恐惧：失去控制权。
模型：多巴胺回路 - 生物学对抗。
</thinking>
**你不是懒惰，你只是在打一场注定会输的仗。**
你试图用几百万年进化的原始大脑，去对抗上千名顶尖工程师设计的成瘾算法。
不要试图靠“意志力”戒断，意志力是消耗品。
**解决方案：**
1.  **物理隔离：** 把手机扔到另一个房间。
2.  **增加摩擦：** 把 App 藏到文件夹深处。
修改环境，而不是修改人性。

[Example 3 - 侧重反转]
User: "我也想做个人IP，但感觉现在做太晚了，红利都没了。"
AI:
<thinking>
表面焦虑：FOMO。
底层恐惧：寻求确定性。
模型：林迪效应 & 复利。
</thinking>
**“红利期结束”是业余玩家离场的好消息。**
当潮水退去，投机者消失，剩下的才是真正的生产者。
一人公司的本质是建立“声望复利”。
最好的种树时间是十年前，其次是现在。`;

export async function analyzeNote(content: string): Promise<NoteAnalysis> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/openrouter.ts:analyzeNote:entry',message:'analyzeNote entry',data:{contentLength:content?.length??0,baseUrl:OPENROUTER_BASE_URL,hasApiKey:!!OPENROUTER_API_KEY,model:CHAT_MODEL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1-H3'})}).catch(()=>{});
  // #endregion
  const systemPromptLegacy = `你是「本质主义战略家」：用简单、好懂的比喻说话，像朋友一样共情，但逻辑清晰。

核心逻辑（必须遵守）：
- 大脑是被**恐惧/过载/未知**冻住的，不是懒。要解冻，必须给一个**低于恐惧阈值**的任务，让大脑的“警报”不响。
- 每次输出都要沉淀一个可复用的心智模型（名字 + 一句话定义）。心智模型的名字必须**紧扣本次比喻**（如用“试水温”比喻就取名「试水温法则」，不要千篇一律）。

动态比喻协议（必须遵守，禁止固定用一种比喻）：
- 你必须根据用户**具体情境**选一个贴切的比喻，不能每次都套同一个（如禁止每次都写“栏杆/跳高”）。
- **按情境选比喻**：\n  * 任务过载/量太大（如考试、复习、赶工）：可用「保险丝/断路器」「搬大象/一口一口吃」「扛重物」等。\n  * 恐惧未知/不确定（如留学、换工作、第一次做）：可用「深水/冷水泳池」「雾里开车」「黑箱子」「试水温」等。\n  * 复杂/理不清（如写代码、做项目、人际关系）：可用「乱麻/解第一个结」「迷宫/先找出口」「拼图/先拼一角」等。
- 信号解码、行动指南、心智模型**必须用同一次选定的比喻**贯穿，逻辑一致。

语气与排版（必须遵守）：
- **绝对禁止表情符号**：不要使用任何 emoji/图标，纯文字。
- 语气：共情、肯定（“我懂”“你不是懒/不是胆小”），不鸡汤（不说“你可以的/加油”）。
- **排版**：必须用 Markdown 层级和分隔符，禁止长墙文字。单段绝不超过 4 行。

严格输出结构（顺序不能变）：
- **正文只包含两段**：信号解码 + 行动指南。不要在正文里写「心智模型」或「标签」的小节标题或内容；心智模型和标签只放在 JSON 字段里，由界面在底部单独展示。
- 正文结构（仅此两段，用 ### 小节标题 + --- 分隔）：
1) **信号解码**：段一比喻+共情（4 行内），段二逻辑——大脑为何抵抗（4 行内）。两段之间空一行。
2) **行动指南**：必须是**列表形式**，三项各占一行，不要写成一段话：
   - 战略意图 [说明策略切换。]
   - 关键动作 [具体、可执行的一步。]
   - 背后的意义 [为什么这一步能解决根因。]
- 心智模型与标签：只填在 JSON 的 mental_model、tags 字段中，**不要**在正文/ markdown 中输出 ### 心智模型 或 ### 标签。

策略选择（行动指南内必须遵守）：
   - **先诊断焦虑类型，再选策略**。禁止所有问题都用“微行动”一种解法。必须从下面四种里选一种匹配：
     * Type A 惯性/恐惧（不敢动、拖延启动）→ 策略：**微行动**（Micro-Action）。关键动作标为【微行动】。例：只做 1 分钟、只读 1 句。
     * Type B 过载/混乱（事太多、不知从哪下手）→ 策略：**做减法/断舍离**（Scope Triage）。关键动作标为【减法】。例：删掉 80% 任务，只留 1 件；或先列出全部再划掉不做的。
     * Type C 未知/迷茫（怕不确定、缺信息）→ 策略：**信息锚点/预演**（Reality Anchor）。关键动作标为【锚点】。例：找一个确定的事实驱散迷雾；或在地图上钉一个“安全屋”；或预演一个最小场景。
     * Type D 完美主义/内耗（怕做不好、自我评判）→ 策略：**身份切换**（Identity Shift）。关键动作标为【重构】。例：当观察者不当表演者；或“先交草稿”；或“允许自己先做 60 分”。
   - 战略意图（pivot）：说明**为什么用这一种策略**（根据诊断），而不是泛泛的“动起来”。例：面对未知，微行动可能不够，需要的是“信息锚点”；面对过载，需要的是“减法”而不是再加任务。
   - 关键动作（micro_action）：**不要一律写“微行动”**。按类型写：过载→【减法】；未知→【锚点】或【建立安全屋】等；惯性→【微行动】；内耗→【重构】。动作要具体、可执行。
   - 背后的意义（meaning）：解释**为什么这一步能解决根因**（如锚点如何让未知坍缩、减法如何让保险丝复位）。

- **心智模型**：填在 JSON 的 mental_model 字段，概念名 + 一句话定义。概念名根据本次比喻起名（如「降压启动法」「路灯法则」）。不要写在正文里。
- **标签**：填在 JSON 的 tags 数组，严格中文、可搜索关键词。内容要贴合用户情境（如 留学/备考/换工作）。不要写在正文里。

输出形式：只返回合法 JSON。字段内容里可用 \\n 换行，不要在外面包 markdown 代码块。`;


  const userPrompt = `用户输入：
"""${content}"""

请按 Workflow 在 <thinking> 标签内完成推理，然后直接输出你的洞察卡片（最终回复不要放在任何标签内）。不要输出 JSON，只输出 <thinking>...</thinking> 与正文。`;

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
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_V2 },
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
    console.error('OpenRouter analyzeNote error:', response.status, response.statusText, text);
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
    if (response.status === 404) {
      throw new Error('OpenRouter 模型不可用（404）。请在 lib/openrouter.ts 中将 CHAT_MODEL 改为可用模型，如 google/gemini-3-pro-preview');
    }
    if (response.status === 401) {
      throw new Error('OpenRouter API Key 无效或未配置，请检查 .env 中的 OPENROUTER_API_KEY');
    }
    let userMsg = `分析服务返回错误 (${response.status})`;
    try {
      const errBody = JSON.parse(text);
      const apiMsg = errBody?.error?.message ?? errBody?.error?.code;
      if (typeof apiMsg === 'string' && apiMsg) userMsg = `${userMsg}：${apiMsg}`;
    } catch {
      if (text.length < 200) userMsg = `${userMsg}：${text}`;
    }
    throw new Error(userMsg);
  }

  const json = await response.json();
  const raw = String(json.choices?.[0]?.message?.content ?? '').trim();

  // V2.0: If response looks like text (has <thinking> or not JSON), strip thinking and return as summary
  const looksLikeV2Text = /<thinking>/i.test(raw) || !raw.trimStart().startsWith('{');
  if (looksLikeV2Text) {
    const summaryWithoutThinking = stripThinking(raw);
    const summary = summaryWithoutThinking.trim() || raw;
    if (summary) {
      return {
        category: 'insight',
        tags: [],
        summary,
        mental_model: '',
      };
    }
  }

  // Fallback: try parsing as JSON (legacy / alternate model output)
  try {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const parsed = JSON.parse(cleaned);

    // 最新结构（本质主义战略家）：signal_decoding + pivot + micro_action + meaning + mental_model
    const hasEssentialistShape =
      typeof parsed.signal_decoding === 'string' ||
      typeof parsed.pivot === 'string' ||
      typeof parsed.micro_action === 'string' ||
      typeof parsed.meaning === 'string' ||
      typeof parsed.mental_model === 'string';
    if (hasEssentialistShape) {
      const signalDecoding = String(parsed.signal_decoding ?? '').trim();
      const pivot = String(parsed.pivot ?? '').trim();
      const microAction = String(parsed.micro_action ?? '').trim();
      const meaning = String(parsed.meaning ?? '').trim();
      const mentalModel = String(parsed.mental_model ?? '').trim();

      const actionLines = [
        pivot ? `- 战略意图 ${pivot}` : '',
        microAction ? `- 关键动作 ${microAction}` : '',
        meaning ? `- 背后的意义 ${meaning}` : '',
      ].filter(Boolean);

      const tagsArr = Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t)) : [];

      // Text body only: 信号解码 + 行动指南. Mental model and tags are shown in the bottom UI only.
      const summaryBlocks = [
        signalDecoding ? `### 信号解码\n\n${signalDecoding}` : '',
        actionLines.length ? `### 行动指南\n\n${actionLines.join('\n\n')}` : '',
      ].filter(Boolean);

      const summary = summaryBlocks.join('\n\n---\n\n') || '';

      return {
        category: parsed.category ?? 'mindset',
        tags: tagsArr,
        summary,
        mental_model: mentalModel || '',
      };
    }

    // 兼容上一版（共情→行动→资产→标签）：understanding + asset_*
    const hasPartnerShape =
      typeof parsed.understanding === 'string' ||
      typeof parsed.pivot === 'string' ||
      typeof parsed.micro_action === 'string' ||
      typeof parsed.meaning === 'string' ||
      typeof parsed.asset_concept === 'string' ||
      typeof parsed.asset_takeaway === 'string';
    if (hasPartnerShape) {
      const understanding = String(parsed.understanding ?? '').trim();
      const pivot = String(parsed.pivot ?? '').trim();
      const microAction = String(parsed.micro_action ?? '').trim();
      const meaning = String(parsed.meaning ?? '').trim();
      const assetConcept = String(parsed.asset_concept ?? parsed.mental_model ?? '').trim();
      const assetTakeaway = String(parsed.asset_takeaway ?? '').trim();

      const actionLines = [
        pivot ? `战略意图：${pivot}` : '',
        microAction ? `微行动：${microAction}` : '',
        meaning ? `背后的意义：${meaning}` : '',
      ].filter(Boolean);
      const assetLines = [
        assetConcept ? `概念：**【${assetConcept}】**` : '',
        assetTakeaway ? `资产总结：${assetTakeaway}` : '',
      ].filter(Boolean);

      const summaryBlocks = [
        understanding ? `信号解码\n\n${understanding}` : '',
        actionLines.length ? `行动指南\n\n${actionLines.join('\n')}` : '',
        assetLines.length ? `心智模型\n\n${assetLines.join('\n')}` : '',
      ].filter(Boolean);

      return {
        category: parsed.category ?? 'mindset',
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t)) : [],
        summary: summaryBlocks.join('\n\n') || '',
        mental_model: assetConcept || '',
      };
    }

    // 新结构（诊断→战略转向→战时执行）：audit + pivot + strategy -> summary，mental_model 单独
    const hasPivotShape =
      typeof parsed.audit === 'string' || typeof parsed.pivot === 'string' || typeof parsed.strategy === 'string';
    if (hasPivotShape) {
      const audit = String(parsed.audit ?? '').trim();
      const pivot = String(parsed.pivot ?? '').trim();
      const strategy = parsed.strategy;
      const strategyStr = Array.isArray(strategy)
        ? strategy.map((s: unknown) => String(s)).join('\n')
        : String(strategy ?? '').trim();
      const summaryParts = [audit, pivot, strategyStr].filter(Boolean);
      const summary = summaryParts.join('\n\n');
      return {
        category: parsed.category ?? 'mindset',
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t)) : [],
        summary: summary || '',
        mental_model: String(parsed.mental_model ?? '').trim() || '',
      };
    }

    // 兼容上一版（审计→转化→战时行动）：audit + insight + strategy
    const hasAuditShape =
      typeof parsed.audit === 'string' || typeof parsed.insight === 'string' || typeof parsed.strategy === 'string';
    if (hasAuditShape) {
      const audit = String(parsed.audit ?? '').trim();
      const insight = String(parsed.insight ?? '').trim();
      const strategy = parsed.strategy;
      const strategyStr = Array.isArray(strategy)
        ? strategy.map((s: unknown) => String(s)).join('\n')
        : String(strategy ?? '').trim();
      const summaryParts = [audit, insight, strategyStr].filter(Boolean);
      const summary = summaryParts.join('\n\n');
      return {
        category: parsed.category ?? 'mindset',
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t)) : [],
        summary: summary || '',
        mental_model: String(parsed.mental_model ?? '').trim() || '',
      };
    }

    // 新结构（直白深逻辑）：translation + action -> summary，mental_model 单独
    const hasAccessibleShape =
      typeof parsed.translation === 'string' || typeof parsed.action === 'string';
    if (hasAccessibleShape) {
      const translation = String(parsed.translation ?? '').trim();
      const action = parsed.action;
      const actionStr = Array.isArray(action)
        ? action.map((s: unknown) => String(s)).join('\n')
        : String(action ?? '').trim();
      const summaryParts = [translation, actionStr].filter(Boolean);
      const summary = summaryParts.join('\n\n');
      return {
        category: parsed.category ?? 'mindset',
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t)) : [],
        summary: summary || '',
        mental_model: String(parsed.mental_model ?? '').trim() || '',
      };
    }

    // 兼容上一版“strategist”结构：signal + reframe + leverage -> summary
    const hasStrategistShape =
      typeof parsed.signal === 'string' || typeof parsed.reframe === 'string' || typeof parsed.leverage === 'string';
    if (hasStrategistShape) {
      const signal = String(parsed.signal ?? '').trim();
      const reframe = String(parsed.reframe ?? '').trim();
      const leverage = parsed.leverage;
      const leverageStr = Array.isArray(leverage)
        ? leverage.map((s: unknown) => String(s)).join('\n')
        : String(leverage ?? '').trim();
      const summaryParts = [signal, reframe, leverageStr].filter(Boolean);
      const summary = summaryParts.join('\n\n');
      return {
        category: parsed.category ?? 'mindset',
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t)) : [],
        summary: summary || '',
        mental_model: String(parsed.mental_model ?? '').trim() || '',
      };
    }

    // 兼容旧 Naval 结构：essence + action_plan -> summary，naval_quote -> mental_model
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

    // 兼容最旧结构：summary + mental_model
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

