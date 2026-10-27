import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import { createServer as createViteServer, type Connect, type ViteDevServer } from "vite";

function findChrome(): string | undefined {
  if (process.env.SHEMA_CHROME) return process.env.SHEMA_CHROME;
  const cache = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(cache)) return undefined;
  return readdirSync(cache)
    .filter((entry) => entry.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((entry) =>
      join(cache, entry, "chrome-headless-shell-linux64", "chrome-headless-shell"),
    )
    .find((path) => existsSync(path));
}

export const CHROME = findChrome();

async function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const probe = createNetServer();
    probe.once("error", fail);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (address === null || typeof address === "string") {
        fail(new Error(`porta inesperada: ${address}`));
        return;
      }
      probe.close(() => done(address.port));
    });
  });
}

export interface ProbeOptions {
  scratch: string;
  module: string;
  include: readonly string[];
  define?: Record<string, string>;
  middleware?: Connect.NextHandleFunction;
}

export async function serveProbe({
  scratch,
  module,
  include,
  define,
  middleware,
}: ProbeOptions): Promise<ViteDevServer> {
  const port = await freePort();
  const server = await createViteServer({
    configFile: false,
    logLevel: "silent",
    root: process.cwd(),
    publicDir: false,
    cacheDir: join(scratch, "vite"),
    esbuild: { jsx: "automatic" },
    define,
    server: { port, strictPort: true, host: "127.0.0.1", hmr: false, ws: false },
    optimizeDeps: { include: [...include], noDiscovery: true },
    plugins: [
      {
        name: "probe",
        resolveId: (id) => (id === "virtual:probe" ? "\0probe" : null),
        load: (id) => (id === "\0probe" ? module : null),
        configureServer(dev) {
          if (middleware) dev.middlewares.use(middleware);
          dev.middlewares.use((request, response, next) => {
            if (request.url !== "/") return next();
            response.setHeader("content-type", "text/html");
            response.end(
              '<!doctype html><html><head></head><body><script type="module" src="/@id/virtual:probe"></script></body></html>',
            );
          });
        },
      },
    ],
  });
  await server.listen();
  return server;
}

interface CdpMessage {
  id?: number;
  method?: string;
  params?: { exceptionDetails?: { exception?: { description?: string }; text: string } };
  result?: unknown;
  error?: { message: string };
}

interface EvaluateResult {
  result: { value: unknown };
  exceptionDetails?: { exception?: { description?: string }; text: string };
}

export async function launchChrome(binary: string, scratch: string) {
  const chrome = spawn(
    binary,
    [
      "--headless",
      "--no-sandbox",
      "--remote-debugging-port=0",
      `--user-data-dir=${join(scratch, "chrome")}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const endpoint = await new Promise<string>((done, fail) => {
    let log = "";
    chrome.stderr.on("data", (chunk: Buffer) => {
      log += chunk.toString();
      const listening = log.match(/DevTools listening on (ws:\/\/\S+)/u);
      if (listening) done(listening[1]);
    });
    chrome.once("exit", (code) => fail(new Error(`chrome saiu com ${code}: ${log}`)));
  });
  const targets = (await (
    await fetch(`http://127.0.0.1:${new URL(endpoint).port}/json/list`)
  ).json()) as { type: string; webSocketDebuggerUrl: string }[];
  const socket = new WebSocket(targets.find((target) => target.type === "page")!.webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", fail, { once: true });
  });

  let next = 0;
  const waiting = new Map<number, (message: CdpMessage) => void>();
  const listeners = new Set<(message: CdpMessage) => void>();
  const pageErrors: string[] = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as CdpMessage;
    if (message.id === undefined) {
      listeners.forEach((listener) => listener(message));
      return;
    }
    waiting.get(message.id)?.(message);
    waiting.delete(message.id);
  });
  listeners.add((message) => {
    const details = message.params?.exceptionDetails;
    if (message.method === "Runtime.exceptionThrown" && details) {
      pageErrors.push(details.exception?.description ?? details.text);
    }
  });

  const send = (method: string, params: object = {}) =>
    new Promise<unknown>((done, fail) => {
      const id = ++next;
      waiting.set(id, (message) =>
        message.error ? fail(new Error(`${method}: ${message.error.message}`)) : done(message.result),
      );
      socket.send(JSON.stringify({ id, method, params }));
    });

  const event = (method: string) =>
    new Promise<void>((done) => {
      const listener = (message: CdpMessage) => {
        if (message.method !== method) return;
        listeners.delete(listener);
        done();
      };
      listeners.add(listener);
    });

  await send("Page.enable");
  await send("Runtime.enable");

  return {
    send,
    async open(url: string) {
      const loaded = event("Page.loadEventFired");
      await send("Page.navigate", { url });
      await loaded;
    },
    async evaluate<T>(expression: string): Promise<T> {
      const reply = (await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      })) as EvaluateResult;
      if (reply.exceptionDetails) {
        const { exception, text } = reply.exceptionDetails;
        throw new Error([exception?.description ?? text, ...pageErrors].join("\n"));
      }
      return reply.result.value as T;
    },
    close() {
      socket.close();
      chrome.kill();
    },
  };
}
