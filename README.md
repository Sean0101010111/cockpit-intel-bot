# ☀️ 座舱AI情报站

每日早上9点自动抓取AI行业资讯，经大模型提炼后生成智能座舱情报简报，通过网页展示。

## 🔗 在线查看
👉 **https://你的用户名.github.io/cockpit-intel-bot/**

## 功能
- 📰 自动抓取 36Kr / 量子位 / 机器之心等AI资讯
- 🧠 DeepSeek 大模型提炼座舱业务关联
- 🌐 精美网页展示 + 历史报告归档

## 架构
GitHub Actions (定时) → 抓取资讯 → LLM生成情报 → 提交到仓库 → 构建网页 → 部署 GitHub Pages

## 手动触发
进入 Actions 页面 → 选择工作流 → Run workflow
