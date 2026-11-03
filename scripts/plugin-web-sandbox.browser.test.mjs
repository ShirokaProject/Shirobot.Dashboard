// 在真实浏览器里检查插件自定义网页的沙箱：用 Chromium 无头模式打开 scripts/fixtures/web-sandbox.html，
// 里面是真实的桥接代码。找不到浏览器时跳过；用环境变量 CHROME 指定浏览器路径。
import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'

function findBrowser() {
  const candidates = [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:/Program Files/Google/Chrome/Application/chrome.exe'
  ]
  const cloak = join(homedir(), '.cloakbrowser')
  if (existsSync(cloak))
    for (const dir of readdirSync(cloak)) candidates.push(join(cloak, dir, 'Chromium.app/Contents/MacOS/Chromium'))
  return candidates.find(path => path && existsSync(path))
}

const browserPath = findBrowser()
let vite, secret, browser, profile, origin, devtools
let secretHits = 0

before(async () => {
  if (!browserPath) return
  vite = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' })
  await vite.listen()
  origin = vite.resolvedUrls.local[0].replace(/\/$/, '')
  secret = createHttpServer((_, response) => { secretHits++; response.setHeader('Access-Control-Allow-Origin', '*'); response.end('secret') })
  await new Promise(resolve => secret.listen(0, '127.0.0.1', resolve))
  profile = mkdtempSync(join(tmpdir(), 'shirobot-web-sandbox-'))
  browser = spawn(browserPath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  devtools = await new Promise((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => reject(new Error('Browser did not start: ' + output)), 20000)
    browser.stderr.on('data', chunk => {
      output += chunk
      const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(output)
      if (match) { clearTimeout(timer); resolve(new URL(match[1]).host) }
    })
  })
})

after(async () => {
  if (browser && browser.exitCode === null) {
    const exited = new Promise(resolve => browser.once('exit', resolve))
    browser.kill()
    await exited
  }
  await vite?.close()
  secret?.close()
  // 浏览器退出后仍可能短暂写入配置目录。
  if (profile) rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
})

/** 打开一个标签页，处理对话框，等页面报告结果。 */
async function runPage(query, acceptDialog) {
  const target = await (await fetch(`http://${devtools}/json/new?about:blank`, { method: 'PUT' })).json()
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let sequence = 0
  const pending = new Map(), dialogs = []
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Page.javascriptDialogOpening') {
      dialogs.push(message.params.message)
      void send('Page.handleJavaScriptDialog', { accept: acceptDialog })
    }
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result)
  }
  try {
    await send('Page.enable')
    await send('Page.navigate', { url: `${origin}/scripts/fixtures/web-sandbox.html?${query}` })
    const deadline = Date.now() + 20000
    while (Date.now() < deadline) {
      const { result } = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({ results: window.__results ?? null, calls: window.__calls ?? [], nonce: window.__nonce })',
        returnByValue: true
      })
      const state = JSON.parse(result.value ?? 'null')
      if (state?.results) return { ...state, dialogs }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('The sandbox page did not report.')
  } finally {
    socket.close()
    await fetch(`http://${devtools}/json/close/${target.id}`).catch(() => {})
  }
}

test('a sandbox page cannot reach Dashboard state, the network or the nonce, and declined operations stop in the parent',
  { skip: browserPath ? false : 'No Chromium-based browser found; set CHROME to run.' }, async () => {
    const before = secretHits
    const { results, calls, nonce, dialogs } = await runPage(`secret=${encodeURIComponent(`http://127.0.0.1:${secret.address().port}/secret`)}`, false)
    assert.equal(results.bridge, 'object')
    assert.equal(results.origin, 'null', 'The page must run in an opaque origin.')
    assert.equal(results.parent, 'blocked')
    assert.equal(results.storage, 'blocked')
    assert.equal(results.fetch, 'blocked')
    assert.equal(secretHits, before, 'The page must not reach the network directly.')
    assert.ok(!results.otherScripts.includes(nonce), 'Page scripts must not be able to read the session nonce.')
    assert.equal(results.innerHtml, 'allowed', 'Without strict DOM, ordinary pages keep working.')
    assert.equal(dialogs.length, 1)
    assert.ok(dialogs[0].includes('测试页') && dialogs[0].includes('清空全部数据？'))
    assert.equal(results.clear, '已取消。')
    assert.ok(!calls.includes('clear'), 'A declined operation must not reach the host.')
  })

test('accepted operations go through, and strict DOM blocks string HTML in a real browser',
  { skip: browserPath ? false : 'No Chromium-based browser found; set CHROME to run.' }, async () => {
    const { results, calls, dialogs } = await runPage(`strict=1&secret=${encodeURIComponent(`http://127.0.0.1:${secret.address().port}/secret`)}`, true)
    assert.equal(results.innerHtml, 'TypeError', 'Trusted Types must reject innerHTML strings.')
    assert.equal(dialogs.length, 1)
    assert.equal(results.clear, 'done')
    assert.ok(calls.includes('clear'))
  })
