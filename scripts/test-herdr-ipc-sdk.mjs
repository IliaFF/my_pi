// Actual SDK lifecycle with injected TUI mode and synthetic IPC, never the live pane.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const root = mkdtempSync(join(tmpdir(), 'pi-herdr-ipc-'));
const agent = join(root, 'agent'); mkdirSync(agent);
const saved = { ...process.env }, originalConnect = net.createConnection;
Object.assign(process.env, { HOME: root, PI_CODING_AGENT_DIR: agent, PI_OFFLINE: '1',
  HERDR_ENV: '1', HERDR_SOCKET_PATH: join(root, 'fake.sock'), HERDR_PANE_ID: 'fixture-only' });
let session, eventBus, attempts = 0;
const unhandled = [], errors = [];
const rejected = error => unhandled.push(error);
process.on('unhandledRejection', rejected);
try {
  const modules = resolve(process.argv[2] || 'npm/node_modules');
  const sdkFile = join(modules, '@earendil-works/pi-coding-agent/dist/index.js');
  const sdk = await import(pathToFileURL(sdkFile));
  const ai = dirname(findPackageJSON('@earendil-works/pi-ai', pathToFileURL(sdkFile)));
  const { fauxProvider, fauxAssistantMessage, InMemoryCredentialStore } = await import(pathToFileURL(join(ai, 'dist/index.js')));
  const { createJiti } = await import(pathToFileURL(join(modules, '@earendil-works/pi-coding-agent/dist/core/extensions/jiti-loader.js')));
  const { default: herdr } = await createJiti(import.meta.url).import(resolve('local-extensions/herdr-agent-state.ts'));
  const provider = fauxProvider({ provider: 'herdr-test', api: 'faux', models: [{ id: 'fake', name: 'IPC fixture', reasoning: false, input: ['text'], contextWindow: 64000, maxTokens: 512, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }] });
  const runtime = await sdk.ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  runtime.registerNativeProvider(provider.provider);
  const services = await sdk.createAgentSessionServices({ cwd: root, agentDir: agent, modelRuntime: runtime,
    settingsManager: sdk.SettingsManager.inMemory({ packages: [], retry: { enabled: false } }),
    resourceLoaderOptions: { noExtensions: true, noSkills: true, noThemes: true, noPromptTemplates: true,
      extensionFactories: [pi => { eventBus = pi.events; return herdr({ ...pi, on: (name, handler) => pi.on(name, (event, ctx) => handler(event, { ...ctx, mode: 'tui' })) }); }] } });
  session = (await sdk.createAgentSessionFromServices({ services, sessionManager: sdk.SessionManager.create(root, join(root, 'sessions')), model: provider.getModel(), thinkingLevel: 'off', tools: [] })).session;
  net.createConnection = (...args) => { attempts++; return originalConnect(...args); };
  await session.bindExtensions({ onError: e => errors.push(e) });
  const prompt = async text => { provider.setResponses([fauxAssistantMessage('Fixture complete')]); await session.prompt(text); await session.waitForIdle(); await new Promise(setImmediate); };
  await prompt('Reject optional IPC without aborting the run');
  assert.ok(attempts > 0, 'Blocked transport must actually be exercised');
  assert.deepEqual(errors, []); assert.deepEqual(unhandled, []);
  assert.equal(session.getLastAssistantText(), 'Fixture complete');
  const fakeSocket = success => {
    attempts++;
    const socket = new EventEmitter();
    socket.destroy = () => {};
    socket.write = () => queueMicrotask(() => socket.emit('data', Buffer.from('ok')));
    queueMicrotask(() => socket.emit(success ? 'connect' : 'error', new Error('Synthetic unavailable IPC')));
    return socket;
  };
  net.createConnection = () => fakeSocket(false);
  const beforeRetry = attempts;
  eventBus.emit('herdr:blocked', { active: true, label: 'Synthetic block' });
  await new Promise(setImmediate);
  assert.equal(attempts - beforeRetry, 2, 'A single status report must retry once');
  net.createConnection = () => fakeSocket(true);
  const beforeSuccess = attempts;
  eventBus.emit('herdr:blocked', { active: false });
  await new Promise(setImmediate);
  assert.equal(attempts - beforeSuccess, 1, 'Successful delivery must not retry');
  assert.deepEqual(errors, []); assert.deepEqual(unhandled, []);
  assert.equal(existsSync(join(agent, 'crashes.json')), false);
  console.log('PASS native SDK herdr: blocked optional IPC is nonfatal, ordinary retry and successful delivery, no unhandled rejection/crash or real pane contact');
} finally {
  net.createConnection = originalConnect;
  await session?.dispose();
  process.off('unhandledRejection', rejected);
  for (const key of ['HOME', 'PI_CODING_AGENT_DIR', 'PI_OFFLINE', 'HERDR_ENV', 'HERDR_SOCKET_PATH', 'HERDR_PANE_ID']) {
    if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
  rmSync(root, { recursive: true, force: true });
}
