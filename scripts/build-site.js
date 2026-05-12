const fs = require('fs');
const path = require('path');

// 确保 _site 目录存在
const outputDir = path.join(__dirname, '..', '_site');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 读取 HTML 模板
const templatePath = path.join(__dirname, '..', 'templates', 'index.html');
let html;

try {
  html = fs.readFileSync(templatePath, 'utf8');
} catch (err) {
  console.error('❌ 找不到模板文件:', templatePath);
  process.exit(1);
}

// 读取情报数据
const dataPath = path.join(__dirname, '..', 'data', 'index.html');
let newsContent = '';

try {
  newsContent = fs.readFileSync(dataPath, 'utf8');
} catch (err) {
  console.error('⚠️  data/index.html 不存在或为空，使用占位符');
  newsContent = '<p>暂无情报数据</p>';
}

// 替换模板变量
html = html.replace('{{CONTENT}}', newsContent);

// 生成日期
const today = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
});
html = html.replace('{{DATE}}', today);

// 写入文件
const outputPath = path.join(outputDir, 'index.html');
fs.writeFileSync(outputPath, html);

console.log('✅ 网站生成成功:', outputPath);
console.log('📄 情报条数:', (newsContent.match(/<li>/g) || []).length);
