/**
 * 构建情报网站
 * 读取 briefings/ 目录下所有 .md 报告，生成静态网站到 _site/
 */

const fs = require('fs');
const path = require('path');

// ============ 简易 Markdown → HTML 转换 ============
function mdToHtml(md) {
  let html = md
    // 先处理代码块（保护起来不被后续规则破坏）
    .replace(/```[\s\S]*?```/g, match => {
      const code = match.replace(/```\w*\n?/, '').replace(/```$/, '');
      return '<pre><code>' + code.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>';
    })

    // ### 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // ## 标题
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // --- 分隔线
    .replace(/^---$/gm, '<hr>')

    // **加粗**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

    // - 列表项（注意：不再转义 < > 以免破坏已生成的标签）
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    // 将连续的 li 包裹在 ul 中
    .replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, '<ul>$1</ul>')

    // 空行 → 段落分隔
    .replace(/\n{2,}/g, '</p><p>')

    // 换行
    .replace(/\n/g, '<br>');

  return '<p>' + html + '</p>'
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[23]>)/g, '$1')
    .replace(/(<\/h[23]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(<hr>)<\/p>/g, '$1')
    .replace(/<p>(<pre>)/g, '$1')
    .replace(/(<\/pre>)<\/p>/g, '$1');
}

// ============ 获取所有报告 ============
function getBriefings(briefingsDir) {
  if (!fs.existsSync(briefingsDir)) {
    console.log('⚠️  briefings/ 目录不存在，创建空目录');
    fs.mkdirSync(briefingsDir, { recursive: true });
  }

  const files = fs.readdirSync(briefingsDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse(); // 最新的排前面

  return files.map(file => {
    const dateStr = file.replace('.md', ''); // 2025-01-16
    const content = fs.readFileSync(path.join(briefingsDir, file), 'utf-8');
    return { date: dateStr, content, filename: file };
  });
}

// ============ 生成页面 HTML ============
function buildPageHTML(briefings, selectedDate) {
  const selected = briefings.find(b => b.date === selectedDate) || briefings[0];
  if (!selected) {
    return buildEmptyHTML();
  }

  const contentHtml = mdToHtml(selected.content);

  // 侧边栏日期列表
  const sidebarItems = briefings.map(b => {
    const isActive = b.date === selected.date ? 'active' : '';
    const weekday = getWeekday(b.date);
    return `<a href="${b.date}.html" class="sidebar-item ${isActive}">
      <span class="date">${b.date}</span>
      <span class="weekday">${weekday}</span>
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>☀️ 座舱AI情报站 - ${selected.date}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent2: #818cf8;
      --green: #4ade80;
      --orange: #fb923c;
      --red: #f87171;
      --pink: #f472b6;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    /* === 顶栏 === */
    .topbar {
      background: var(--card);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar h1 {
      font-size: 20px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .topbar .date-badge {
      background: var(--border);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      color: var(--text-muted);
    }
    /* === 主体布局 === */
    .main {
      display: flex;
      max-width: 1400px;
      margin: 0 auto;
      min-height: calc(100vh - 60px);
    }
    /* === 侧边栏 === */
    .sidebar {
      width: 200px;
      min-width: 200px;
      background: var(--card);
      border-right: 1px solid var(--border);
      padding: 16px 0;
      overflow-y: auto;
      max-height: calc(100vh - 60px);
      position: sticky;
      top: 60px;
    }
    .sidebar-title {
      padding: 0 16px 12px;
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .sidebar-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      text-decoration: none;
      color: var(--text-muted);
      font-size: 14px;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }
    .sidebar-item:hover {
      background: rgba(56, 189, 248, 0.08);
      color: var(--text);
    }
    .sidebar-item.active {
      background: rgba(56, 189, 248, 0.12);
      color: var(--accent);
      border-left-color: var(--accent);
      font-weight: 600;
    }
    .sidebar-item .weekday {
      font-size: 12px;
      opacity: 0.6;
    }
    /* === 内容区 === */
    .content {
      flex: 1;
      padding: 32px 40px;
      overflow-y: auto;
    }
    /* === Markdown 渲染样式 === */
    .content h2 {
      font-size: 22px;
      margin: 32px 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .content h3 {
      font-size: 18px;
      margin: 24px 0 12px;
      color: var(--accent);
    }
    .content p { margin: 8px 0; line-height: 1.8; }
    .content strong { color: var(--green); }
    .content ul {
      margin: 12px 0;
      padding-left: 0;
      list-style: none;
    }
    .content li {
      margin: 6px 0;
      padding-left: 16px;
      position: relative;
      line-height: 1.7;
    }
    .content li::before {
      content: '▸';
      position: absolute;
      left: 0;
      color: var(--accent);
    }
    .content hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 24px 0;
    }
    .content pre {
      background: #0d1117;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
      font-size: 13px;
    }
    .content code {
      font-family: 'Fira Code', 'Consolas', monospace;
    }
    /* === 情报卡片高亮 === */
    .content li:has(strong:first-child) {
      background: rgba(56, 189, 248, 0.05);
      border-radius: 8px;
      padding: 10px 12px 10px 28px;
      margin: 8px 0;
    }
    /* === 底部核心建议 === */
    .content p:last-of-type:has(strong) {
      background: linear-gradient(135deg, rgba(129, 140, 248, 0.15), rgba(56, 189, 248, 0.15));
      border: 1px solid var(--accent2);
      border-radius: 12px;
      padding: 20px 24px;
      margin-top: 24px;
    }
    /* === 空状态 === */
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      color: var(--text-muted);
    }
    .empty .icon { font-size: 64px; margin-bottom: 16px; }
    .empty h2 { color: var(--text); margin-bottom: 8px; }
    /* === 响应式 === */
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .content { padding: 20px 16px; }
      .topbar h1 { font-size: 16px; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <h1>☀️ 座舱AI情报站</h1>
    <span class="date-badge">📅 ${selected.date} ${getWeekday(selected.date)}</span>
  </div>
  <div class="main">
    <div class="sidebar">
      <div class="sidebar-title">📅 历史报告</div>
      ${sidebarItems}
    </div>
    <div class="content">
      ${contentHtml}
    </div>
  </div>
</body>
</html>`;
}

function buildEmptyHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>☀️ 座舱AI情报站</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --border: #334155; --text: #e2e8f0; --text-muted: #94a3b8; --accent: #38bdf8; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: var(--text-muted); text-align: center; }
    .icon { font-size: 80px; margin-bottom: 20px; }
    h1 { color: var(--accent); margin-bottom: 12px; font-size: 28px; }
    p { font-size: 16px; line-height: 1.8; max-width: 400px; }
  </style>
</head>
<body>
  <div class="empty">
    <div class="icon">🚀</div>
    <h1>座舱AI情报站</h1>
    <p>情报站刚刚搭建完成，<br>请手动触发一次工作流生成首份报告：<br><br>
    <strong>Actions → ☀️ 每日座舱AI情报速递 → Run workflow</strong></p>
  </div>
</body>
</html>`;
}

// ============ 工具函数 ============
function getWeekday(dateStr) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return days[d.getDay()];
  } catch {
    return '';
  }
}

// ============ 主流程 ============
async function main() {
  const briefingsDir = path.join(process.cwd(), 'briefings');
  const siteDir = path.join(process.cwd(), '_site');

  // 清空旧站点
  if (fs.existsSync(siteDir)) {
    fs.rmSync(siteDir, { recursive: true });
  }
  fs.mkdirSync(siteDir, { recursive: true });

  // 读取所有报告
  const briefings = getBriefings(briefingsDir);
  console.log(`📊 找到 ${briefings.length} 份报告`);

  if (briefings.length === 0) {
    // 生成空状态首页
    fs.writeFileSync(path.join(siteDir, 'index.html'), buildEmptyHTML());
    console.log('✅ 空站点生成完成');
    return;
  }

  // 为每份报告生成独立页面
  for (const b of briefings) {
    const html = buildPageHTML(briefings, b.date);
    fs.writeFileSync(path.join(siteDir, `${b.date}.html`), html);
    console.log(`  📄 ${b.date}.html`);
  }

  // 首页 = 最新的报告
  const latest = briefings[0];
  const indexHtml = buildPageHTML(briefings, latest.date);
  fs.writeFileSync(path.join(siteDir, 'index.html'), indexHtml);
  console.log(`  📄 index.html → ${latest.date}`);

  console.log(`✅ 网站生成完成！共 ${briefings.length} 个页面`);
}

main().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });
