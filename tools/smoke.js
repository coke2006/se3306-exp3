// 端到端冒烟测试：无头 Chrome + CDP，把写操作全部真实跑一遍
// 用法：先 npm run build && npm start，再 node tools/smoke.js
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 9334;
const BASE = process.env.BASE_URL || "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

async function jsonApi(p, method = "GET") {
  const res = await fetch(`http://127.0.0.1:${PORT}${p}`, { method });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`CDP 返回非 JSON: ${text.slice(0, 120)}`);
  }
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function connect(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  const cdp = new Cdp(ws);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  return cdp;
}

async function evalJs(cdp, expression) {
  const r = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails).slice(0, 400));
  return r.result?.value;
}

async function goto(cdp, url) {
  await cdp.send("Page.navigate", { url });
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    const ready = await evalJs(cdp, "document.readyState").catch(() => null);
    if (ready === "complete") return;
  }
  throw new Error("页面加载超时: " + url);
}

// 轮询等待某条件成立（毫秒）
async function waitFor(expr, timeout = 12000, label = expr) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await evalJs(cdp, expr)) return true;
    } catch {}
    await sleep(300);
  }
  throw new Error("等待超时: " + label);
}

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  —— " + detail : ""}`);
}

let cdp;

async function main() {
  const chrome = spawn(
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    [
      "--headless=new", `--remote-debugging-port=${PORT}`,
      "--no-first-run", "--no-default-browser-check", "--disable-gpu",
      "--window-size=1280,900", "--user-data-dir=" + path.join(require("node:os").tmpdir(), "lab3-smoke-profile"),
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let target;
    for (let i = 0; i < 20; i++) {
      try {
        const list = await jsonApi("/json/list");
        target = list.find((t) => t.type === "page");
        if (target) break;
      } catch {}
      await sleep(300);
    }
    if (!target) throw new Error("连不上 Chrome CDP");
    cdp = await connect(target);

    // —— 1. 发布页校验：空标题提交应出现错误提示，且不跳转 ——
    await goto(cdp, `${BASE}/new`);
    await evalJs(cdp, `document.querySelector('form button').click()`);
    await waitFor(`document.body.innerText.includes('标题和正文不能为空')`, 8000, "校验错误提示");
    record("发布校验：空标题/正文提示错误", true);

    // —— 2. 发布一篇文章 ——
    const stamp = Date.now();
    const TITLE = "冒烟测试文章" + stamp;
    await evalJs(cdp, `
      const set = (sel, v) => {
        const el = document.querySelector(sel);
        if (el.tagName === 'SELECT') { el.value = v; return; }
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      set('input[name=title]', ${JSON.stringify(TITLE)});
      set('textarea[name=content]', '这是一篇用于端到端冒烟测试的文章正文。');
      set('select[name=category]', '技术');
      document.querySelector('form button').click();
    `);
    await sleep(1500); // 等发布动作完成（createPost 成功后是 router.refresh，不是导航）
    await goto(cdp, `${BASE}/`);
    await waitFor(`document.body.innerText.includes(${JSON.stringify(TITLE)})`, 10000, "首页出现新文章");
    record("发布文章：首页立即出现", true);
    const slug = await evalJs(cdp, `
      [...document.querySelectorAll('ul a')].find(a => a.textContent.includes(${JSON.stringify(TITLE)})).getAttribute('href').split('/posts/')[1].split('/')[0]
    `);

    // —— 3. 详情页：点赞 + 浏览量 + 评论 ——
    await goto(cdp, `${BASE}/posts/${slug}`);
    await waitFor(`document.body.innerText.includes('点赞')`, 8000, "详情页渲染");
    await evalJs(cdp, `document.querySelector('button[aria-label^="给文章"]').click()`);
    await waitFor(`document.body.innerText.includes('已点赞')`, 8000, "点赞按钮变化");
    await waitFor(`document.body.innerText.match(/浏览 [1-9]/)`, 8000, "浏览量+1");
    record("点赞与浏览量：点击后计数变化", true);

    await evalJs(cdp, `
      const form = [...document.querySelectorAll('form')].find(f => f.querySelector('input[name=author]'));
      const set = (el, v) => {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      set(form.querySelector('input[name=author]'), '测试员');
      set(form.querySelector('textarea[name=content]'), '冒烟测试评论内容。');
      form.querySelector('button').click();
    `);
    await waitFor(`document.body.innerText.includes('冒烟测试评论内容')`, 10000, "评论显示");
    record("评论：提交后显示在详情页", true);

    // —— 4. 文件数据库落盘检查 ——
    await sleep(500);
    const dataDir = path.resolve(__dirname, "..", "data");
    const statsOk = fs.existsSync(path.join(dataDir, "stats.json"));
    const commentsOk = fs.existsSync(path.join(dataDir, "comments.json"));
    record("文件数据库：data/stats.json 与 comments.json 已生成", statsOk && commentsOk);

    // —— 5. 编辑这篇文章 ——
    await goto(cdp, `${BASE}/posts/${slug}/edit`);
    await waitFor(`!!document.querySelector('input[name=title]')`, 8000, "编辑页回填");
    const NEW_TITLE = TITLE + "（已编辑）";
    await evalJs(cdp, `
      const el = document.querySelector('input[name=title]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(NEW_TITLE)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('form button').click();
    `);
    await waitFor(`location.pathname === '/'`, 12000, "保存后重定向回首页");
    await goto(cdp, `${BASE}/`);
    await waitFor(`document.body.innerText.includes(${JSON.stringify(NEW_TITLE)})`, 10000, "编辑后首页更新");
    record("编辑文章：保存后首页显示新标题", true);

    // —— 6. 删除这篇文章 ——
    await goto(cdp, `${BASE}/posts/${slug}`);
    await evalJs(cdp, `
      const form = [...document.querySelectorAll('form')].find(f => f.querySelector('input[name=slug]') && f.textContent.includes('删除'));
      form.querySelector('button').click();
    `);
    await waitFor(`location.pathname === '/'`, 12000, "删除后重定向回首页");
    await goto(cdp, `${BASE}/`);
    await waitFor(`!document.body.innerText.includes(${JSON.stringify(NEW_TITLE)})`, 10000, "删除后首页消失");
    record("删除文章：首页列表同步移除", true);

    // —— 7. 分页：下一页 → URL 带 page=2，出现第 6 篇 ——
    await goto(cdp, `${BASE}/`);
    await evalJs(cdp, `[...document.querySelectorAll('button')].find(b => b.textContent === '下一页').click()`);
    await waitFor(`location.search.includes('page=2') && document.body.innerText.includes('本学期的学习计划')`, 10000, "翻到第2页");
    record("分页：第2页含第6篇，URL 同步 page=2", true);

    // —— 8. 搜索：搜「全栈」只剩 1 条 ——
    await goto(cdp, `${BASE}/`);
    await evalJs(cdp, `
      const el = document.querySelector('input[placeholder="搜索标题或正文"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '全栈');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.closest('form').querySelector('button').click();
    `);
    await waitFor(`document.querySelectorAll('ul li').length === 1 && document.body.innerText.includes('全栈第一次上手的感觉')`, 10000, "搜索结果");
    record("搜索：命中且只命中目标文章", true);

    // —— 9. 分类过滤 + 排序按钮 ——
    await goto(cdp, `${BASE}/`);
    await evalJs(cdp, `[...document.querySelectorAll('button')].find(b => b.textContent === '生活').click()`);
    await waitFor(`document.body.innerText.includes('东校区的一天') && location.search.includes('category=')`, 10000, "分类过滤");
    const rows = await evalJs(cdp, `document.querySelectorAll('ul li').length`);
    record("分类过滤：生活类只剩1篇", rows === 1, "rows=" + rows);

    // —— 10. 404：未知路由返回 404 状态码；不存在的 slug 由 PPR 流式补上 404 内容 ——
    const status404 = await evalJs(cdp, `fetch('/totally-unknown-path').then(r => r.status)`);
    record("404：未知路由返回 404 状态码", status404 === 404, "status=" + status404);
    await goto(cdp, `${BASE}/posts/definitely-not-exist`);
    const has404Text = await evalJs(cdp, `document.body.innerText.includes('页面不存在')`);
    record("404：不存在的 slug 显示兜底页", has404Text);

    // —— 11. SEO：详情页源码含标题 ——
    await goto(cdp, `${BASE}/posts/hello-next`);
    const hasTitle = await evalJs(cdp, `document.querySelector('title').textContent`);
    record("SEO：title 渲染正常", !!hasTitle, hasTitle);

    const failed = results.filter((r) => !r.ok);
    console.log(`\n==== 共 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length} ====\n`);
    process.exitCode = failed.length ? 1 : 0;
  } finally {
    chrome.kill();
  }
}

main().catch((e) => {
  console.error("冒烟测试异常:", e.message || e);
  process.exit(1);
});
