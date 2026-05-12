/**
 * 构建情报网站
 * 读取 briefings/ 目录下所有 .md 报告，生成静态网站到 _site/
 */

const fs = require('fs');
const path = require('path');

// ============ 简易 Markdown → HTML 转换 ============
function mdToHtml(md) {
  let html = md
    // 转义 HTML 特殊字符（保留 emoji 和中文）
    .replace(/&(?!(?:amp|lt|gt|nbsp);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 恢复 Markdown 语法中的 > （引用）
    .replace(/&gt;\s*💡/g, '> 💡')

    // ### 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // ## 标题
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // --- 分隔线
    .replace(/^---$/gm, '<hr>')

    // **加粗**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

    // - 列表项
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 将连续的 li 包裹在 ul 中
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')

    // 段落（非标签开头的行）
