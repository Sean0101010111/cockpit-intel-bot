/**
 * 推送情报到飞书/企微/钉钉群机器人
 * 输入: briefing.md 文件路径 (argv[2])
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

function post(url, body, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const postData = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      timeout
    };
    const req = client.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(postData);
    req.end();
  });
}

// ============ 飞书卡片消息 ============
function buildFeishuPayload(markdown) {
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: '☀️ 每日座舱AI情报速递' },
        template: 'blue'
      },
      elements: [
        {
          tag: 'markdown',
          content: markdown.slice(0, 4000)
        }
      ]
    }
  };
}

// ============ 企业微信 Markdown 消息 ============
function buildWeComPayload(markdown) {
  return {
    msgtype: 'markdown',
    markdown: {
      content: markdown.slice(0, 4096)
    }
  };
}

// ============ 钉钉 Markdown 消息 ============
function buildDingTalkPayload(markdown) {
  return {
    msgtype: 'markdown',
    markdown: {
      title: '☀️ 每日座舱AI情报速递',
      text: markdown.slice(0, 15000)
    }
  };
}

// ============ 主流程 ============
async function main() {
  const filePath = process.argv[2] || '/tmp/briefing.md';
  const webhookUrl = process.env.WEBHOOK_URL;
  const webhookType = process.env.WEBHOOK_TYPE || 'feishu'; // feishu | wecom | dingtalk

  if (!webhookUrl) {
    console.log('⚠️  WEBHOOK_URL 未设置，跳过推送（情报已保存为 GitHub Artifact）');
    return;
  }

  const markdown = fs.readFileSync(filePath, 'utf-8');

  let payload;
  switch (webhookType) {
    case 'feishu':   payload = buildFeishuPayload(markdown);  break;
    case 'wecom':    payload = buildWeComPayload(markdown);   break;
    case 'dingtalk': payload = buildDingTalkPayload(markdown); break;
    default: throw new Error('不支持的 WEBHOOK_TYPE: ' + webhookType + '，请使用 feishu / wecom / dingtalk');
  }

  console.log(`📤 推送到 ${webhookType} ...`);
  const result = await post(webhookUrl, payload);
  console.log('📋 推送结果:', JSON.stringify(result));
}

main().catch(err => {
  console.error('❌ 推送失败:', err.message);
  // 推送失败不阻断整体流程
  process.exit(0);
});
