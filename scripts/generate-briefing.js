/**
 * 调用大模型生成座舱情报简报
 * 输入: raw_news.json 文件路径 (argv[2])
 * 输出: Markdown 情报简报
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

// ============ 系统提示词 ============
const SYSTEM_PROMPT = `你是专注智能座舱业务的AI行业情报专家，具备极强的信息敏锐度和业务映射能力。

## 任务
从提供的AI行业资讯中，提炼出对智能座舱业务有直接价值的核心情报，输出每日简报。

## 三大维度
1. 🚗 AI产品：多模态交互、大模型上车、智能语音/视觉等直接影响座舱体验的技术
2. 🛠️ AI研发提效：AI辅助编程、测试自动化、模型训练提效等提升座舱软件研发效能的工具
3. 🌐 汽车生态：车企开放平台、跨界合作、软硬件标准等影响座舱生态扩展的动态

## 输出格式（严格遵守）

### ☀️ 昨日AI情报速递 (智能座舱版)

**1. 🚗 AI产品动态**
- **情报摘要**：[简述动态，标注来源]
- **座舱业务关联**：[分析与座舱体验/功能的关联]
- **行动建议**：[具体落地的建议]

**2. 🛠️ AI研发提效**
- **情报摘要**：[简述动态，标注来源]
- **座舱业务关联**：[分析与座舱研发效能的关联]
- **行动建议**：[具体落地的建议]

**3. 🌐 汽车生态**
- **情报摘要**：[简述动态，标注来源]
- **座舱业务关联**：[分析与座舱生态/商业模式的关联]
- **行动建议**：[具体落地的建议]

---
💡 **今日核心建议总结**：[1条对业务负责人今日决策最具价值的顶层建议]

## 规则
- 每条情报标注信息来源
- 行动建议必须具体可落地
- 某维度无重大动态时，选最接近的资讯关联分析，不要跳过
- 优先选对座舱业务影响最大的资讯，而非最热门的`;

// ============ HTTP POST ============
function post(url, body, headers, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const postData = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      },
      timeout
    };
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('LLM Timeout')); });
    req.write(postData);
    req.end();
  });
}

// ============ 调用大模型 ============
async function callLLM(newsJson) {
  const apiUrl = process.env.LLM_API_URL || 'https://api.deepseek.com/chat/completions';
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'deepseek-chat';

  if (!apiKey) throw new Error('❌ LLM_API_KEY 未设置！');

  console.log(`🧠 调用模型: ${model}`);
  console.log(`📡 API地址: ${apiUrl}`);

  const userContent = `以下是昨日的AI行业资讯数据，请据此生成智能座舱情报简报：\n\n${newsJson}`;

  const response = await post(apiUrl, {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ],
    temperature: 0.3,
    max_tokens: 3000
  }, {
    'Authorization': `Bearer ${apiKey}`
  });

  // 解析 OpenAI 兼容格式
  if (response.choices && response.choices[0]) {
    return response.choices[0].message.content;
  }
  // 错误处理
  if (response.error) {
    throw new Error('LLM API 错误: ' + JSON.stringify(response.error));
  }
  throw new Error('LLM 返回格式异常: ' + JSON.stringify(response).slice(0, 500));
}

// ============ 主流程 ============
async function main() {
  const newsFilePath = process.argv[2] || '/tmp/raw_news.json';

  console.log('📂 读取资讯数据...');
  const newsJson = fs.readFileSync(newsFilePath, 'utf-8');

  console.log('🧠 正在生成情报简报...');
  const briefing = await callLLM(newsJson);

  process.stdout.write(briefing);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
