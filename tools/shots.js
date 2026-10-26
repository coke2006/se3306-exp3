// 实验三截图：无头 Chrome + CDP，把每个任务的运行画面截成真实证据
// 用法：npm start 之后 node tools/shots.js，输出到 lab3-shots/
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const PORT = 9335;
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.resolve(__dirname, "..", "lab3-shots");
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

let cdp;

async function evalJs(expression) {
  const r = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.exception?.description || "").slice(0, 300));
  return r.result?.value;
}

async function goto(url) {
  await cdp.send("Page.navigate", { url });
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    if ((await evalJs("document.readyState").catch(() => null)) === "complete") {
      await sleep(600); // 等水合与 Query 请求
      return;
    }
  }
  throw new Error("页面加载超时: " + url);
}

async function shot(name, fullPage = false) {
  const r = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: fullPage,
  });
  fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(r.data, "base64"));
  console.log("saved", name + ".png");
}

async function main() {
  const chrome = spawn(
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    [
      "--headless=new", `--remote-debugging-port=${PORT}`,
      "--no-first-run", "--no-default-browser-check", "--disable-gpu",
      "--window-size=900,860", "--hide-scrollbars",
      "--user-data-dir=" + path.join(os.tmpdir(), "lab3-shots-profile"),
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let target;
    for (let i = 0; i < 20; i++) {
      try {
        target = (await jsonApi("/json/list")).find((t) => t.type === "page");
        if (target) break;
      } catch {}
      await sleep(300);
    }
    cdp = await connect(target);

    // 统一浅色模式，报告里好排版
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: "light" }],
    });
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

    // 任务三/五：首页（服务端直连首屏 + 全功能列表）
    await goto(`${BASE}/`);
    await shot("5.2-home");

    // 任务九：搜索
    await evalJs(`
      const el = document.querySelector('input[placeholder="搜索标题或正文"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '全栈');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.closest('form').querySelector('button').click();
    `);
    await sleep(1500);
    await shot("9.2-search");

    // 任务九：分类过滤
    await goto(`${BASE}/?category=生活`);
    await shot("9.3-category");

    // 任务九：排序（按点赞）+ 翻页到第 2 页
    await goto(`${BASE}/?page=2`);
    await shot("9.1-page2");

    // 任务五：详情页（含点赞/编辑/删除/Suspense 评论）
    await goto(`${BASE}/posts/hello-next`);
    await shot("5.5-detail");

    // 任务七：极慢网络下先看到骨架、再出内容
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 5000, downloadThroughput: 30000, uploadThroughput: 15000,
    });
    await cdp.send("Page.navigate", { url: `${BASE}/posts/rsc-thoughts` });
    await sleep(400);
    await shot("7.1-loading");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
    });
    await sleep(2500);

    // 任务六：发布页 + 空提交校验错误
    await goto(`${BASE}/new`);
    await shot("6.2-new");
    await evalJs(`document.querySelector('form button').click()`);
    await sleep(1200);
    await shot("6.4-new-error");

    // 任务六：编辑页回填
    await goto(`${BASE}/posts/hello-next/edit`);
    await sleep(800);
    await shot("6.6-edit");

    // 任务二：关于页 + 404
    await goto(`${BASE}/about`);
    await shot("2.1-about");
    await goto(`${BASE}/totally-unknown-path`);
    await shot("2.4-notfound");

    // 任务五：接口 JSON
    await goto(`${BASE}/api/posts?category=%E7%94%9F%E6%B4%BB`);
    await sleep(800);
    await shot("5.3-api");

    console.log("\n截图完成，共输出到", OUT);
  } finally {
    chrome.kill();
  }
}

async function connect(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  const c = new Cdp(ws);
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  return c;
}

main().catch((e) => {
  console.error("截图失败:", e.message || e);
  process.exit(1);
});
