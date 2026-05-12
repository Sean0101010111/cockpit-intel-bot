/**
 * DeepSeek LLM 生成座舱情报报告
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = 'deepseek-chat';

async function callDeepSeek(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.choices?.[0]?.message?.content || '');
        } catch (e) {
          reject(new Error('API 解析失败: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getTodayDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function main() {
  // 读取抓取的新闻
  const newsPath = path.join(__dirname, 'data/index.html');
  let newsData = [];
  
  if (fs.existsSync(newsPath)) {
    try {
      const content = fs.readFileSync(newsPath, 'utf-8');
      newsData = JSON.parse(content);
    } catch (e) {
      console.log('⚠️ 读取新闻数据失败，使用默认数据');
    }
  }

  // 构建 prompt
  const newsList = newsData.length > 0 
    ? newsData.slice(0, 15).map((n, i) => `${i + 1}. [${n.source}] ${n.title}`).join('\n')
    : '暂无新闻数据';

  const prompt = `你是一个专业的智能座舱行业情报专家。

以下是今日最新的AI行业资讯：

${newsList}

请根据以上资讯，生成一份智能座舱业务情报简报，格式如下：

## ☀️ 昨日AI情报速递 (智能座舱版)

### 1. 🚗 AI产品动态
- **情报摘要**：[简述AI产品/技术动态]
- **座舱业务关联**：[分析与座舱体验/功能的关联]
- **行动建议**：[具体落地的建议]

### 2. 🛠️ AI研发提效
- **情报摘要**：[简述AI研发工具/方法动态]
- **座舱业务关联**：[分析与座舱软件研发效能的关联]
- **行动建议**：[具体落地的建议]

### 3. 🌐 汽车生态
- **情报摘要**：[简述汽车/科技行业生态合作动态]
- **座舱业务关联**：[分析与座舱生态/商业模式的关联]
- **行动建议**：[具体落地的建议]

---
💡 **今日核心建议总结**：[综合以上信息，给出1条对业务负责人今日决策最具价值的顶层建议]

要求：
1. 只选择与智能座舱直接或间接相关的资讯
2. 行动建议要具体可执行
3. 报告简洁专业，突出业务价值`;

  console.log('🤖 调用 DeepSeek LLM 生成报告...');
  
  const report = await callDeepSeek(prompt);
  console.log('✅ 报告生成完成');

  // 保存到 briefings 目录
  const briefingsDir = path.join(process.cwd(), 'briefings');
  if (!fs.existsSync(briefingsDir)) {
    fs.mkdirSync(briefingsDir, { recursive: true });
  }

  const today = getTodayDate();
  const reportPath = path.join(briefingsDir, `${today}.md`);
  fs.writeFileSync(reportPath, report);
  
  console.log(`📄 报告已保存: ${reportPath}`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
