/**
 * 多源AI资讯抓取脚本
 * 输出: JSON 数组 [{ source, title, url, summary, date }]
 */

const https = require('https');
const http = require('http');

// ============ 资讯源配置 ============
const SOURCES = [
  {
    name: '36Kr-AI',
    type: 'rss',
    fetchUrl: 'https://36kr.com/feed'
  },
  {
    name: '量子位',
    type: 'rss',
    fetchUrl: 'https://www.jiqizhixin.com/rss'
  },
  {
    name: '机器之心',
    type: 'rss',
    fetchUrl: 'https://jiqizhixin.com/rss'
  },
  {
    name: '36Kr-汽车',
    type: 'html',
    fetchUrl: 'https://36kr.com/information/Auto/'
  }
];

// ============ HTTP 请求 ============
function fetch(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CockpitIntelBot/1.0)' },
      timeout
    }, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location, timeout).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout ' + url)); });
  });
}

// ============ RSS 解析 ============
function parseRSS(xml, sourceName) {
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRegex) || [];

  for (const item of matches.slice(0, 15)) {
    const title = (item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                   item.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim() || '';
    const link = (item.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/) ||
                  item.match(/<link>([\s\S]*?)<\/link>/))?.[1]?.trim() || '';
    const desc = (item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                  item.match(/<description>([\s\S]*?)<\/description>/))?.[1]?.trim() || '';
    const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/))?.[1]?.trim() || '';

    if (title && link) {
      items.push({
        source: sourceName,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        url: link,
        summary: desc.replace(/<[^>]*>/g, '').slice(0, 300),
        date: pubDate
      });
    }
  }
  return items;
}

// ============ HTML 解析（36Kr汽车频道） ============
function parseHTML(html, sourceName) {
  const items = [];
  // 匹配文章链接和标题
  const regex = /<a[^>]*href="(\/p\/\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  let count = 0;
  while ((match = regex.exec(html)) && count < 10) {
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (title.length > 5) {
      items.push({
        source: sourceName,
        title,
        url: `https://36kr.com${match[1]}`,
        summary: '',
        date: new Date().toISOString()
      });
      count++;
    }
  }
  return items;
}

// ============ 主流程 ============
async function main() {
  const allNews = [];

  for (const source of SOURCES) {
    try {
      console.log(`📡 抓取: ${source.name} ...`);
      const raw = await fetch(source.fetchUrl);

      let items = [];
      if (source.type === 'rss') {
        items = parseRSS(raw, source.name);
      } else {
        items = parseHTML(raw, source.name);
      }

      allNews.push(...items);
      console.log(`  ✅ ${source.name}: ${items.length} 条`);
    } catch (err) {
      console.error(`  ❌ ${source.name} 失败: ${err.message}`);
    }
  }

  // 去重
  const seen = new Set();
  const unique = allNews.filter(item => {
    const key = item.title.slice(0, 20);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n📊 共 ${unique.length} 条去重资讯`);
  process.stdout.write(JSON.stringify(unique, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
