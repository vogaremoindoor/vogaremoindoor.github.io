// Ambiente simulado: relógio, timers e um AudioContext cuja inicialização/velocidade podem ser "ruins".
export function criarAmbiente({ iniciaEm = 0, taxa = 1, latencia = 0 } = {}) {
  const originais = { setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, dateNow: Date.now, performance: Object.getOwnPropertyDescriptor(globalThis, "performance"), window: globalThis.window, document: globalThis.document };
  let wall = 0;
  const EPOCA = 1_700_000_000_000;
  const intervalos = new Map(); let proximoId = 1;
  const oscs = [];
  const fontes = []; // falas (AudioBufferSource)
  // um som está mudo se o barramento (ganho) no fim da cadeia está em 0
  const mudo = (n) => (n?.via?.destino?.gain?.value ?? 1) === 0;
  const relogioAudio = () => (wall < iniciaEm ? 0 : ((wall - iniciaEm) / 1000) * taxa);
  const ctx = {
    get state() { return wall >= iniciaEm ? "running" : "suspended"; },
    get currentTime() { return relogioAudio(); },
    resume: async () => {},
    addEventListener() {}, removeEventListener() {},
    destination: {},
    getOutputTimestamp() { return { contextTime: Math.max(0, relogioAudio() - latencia), performanceTime: wall }; },
    createGain() {
      const g = { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime(v) { this.value = v; } }, destino: null, connect(n) { this.destino = n; return n; } };
      return g;
    },
    createBufferSource() {
      const f = { buffer: null, via: null, t0: null, cancelado: false, connect(n) { this.via = n; return n; }, start(t) { this.t0 = t; },
        stop(t) { const q = t ?? 0; if (this.t0 !== null && q <= this.t0 && this.t0 > relogioAudio()) this.cancelado = true; } };
      fontes.push(f); return f;
    },
    createOscillator() {
      const o = { frequency: { value: 0 }, type: "", via: null, connect(n) { this.via = n; return n; }, t0: null, cancelado: false,
        start(t) { this.t0 = t; }, stop(t) { const q = t ?? 0; if (t !== undefined) this.fimT = t; if (this.t0 !== null && q <= this.t0 && this.t0 > relogioAudio()) this.cancelado = true; } };
      oscs.push(o); return o;
    },
  };
  function AudioContextFalso() { return ctx; }
  AudioContextFalso.prototype.getOutputTimestamp = () => {};
  globalThis.window = { AudioContext: AudioContextFalso };
  globalThis.document = { addEventListener() {}, removeEventListener() {} };
  Date.now = () => EPOCA + wall;
  Object.defineProperty(globalThis, "performance", { value: { now: () => wall }, configurable: true });
  globalThis.setInterval = (f, ms) => { const id = proximoId++; intervalos.set(id, { f, ms, prox: wall + ms }); return id; };
  globalThis.clearInterval = (id) => intervalos.delete(id);
  globalThis.setTimeout = (f, ms) => { const id = proximoId++; intervalos.set(id, { f: () => { intervalos.delete(id); f(); }, ms, prox: wall + ms, uma: true }); return id; };
  globalThis.clearTimeout = (id) => intervalos.delete(id);
  return {
    restaurar() {
      Object.assign(globalThis, { setInterval: originais.setInterval, clearInterval: originais.clearInterval, setTimeout: originais.setTimeout, clearTimeout: originais.clearTimeout });
      Date.now = originais.dateNow;
      Object.defineProperty(globalThis, "performance", originais.performance);
      globalThis.window = originais.window;
      globalThis.document = originais.document;
    },
    agora: () => wall,
    epoca: EPOCA,
    async avancar(ms, passo = 5) {
      const fim = wall + ms;
      while (wall < fim) {
        wall += passo;
        for (const [, t] of [...intervalos]) if (t.prox <= wall) { if (!t.uma) t.prox += t.ms; t.f(); }
        await Promise.resolve();
      }
    },
    // instantes (ms do relógio) em que cada sinal é OUVIDO, na ordem em que tocam
    escutados() {
      return oscs.filter((o) => !o.cancelado && o.t0 !== null)
        .map((o) => ({ f: o.frequency.value, mudo: mudo(o), dur: o.fimT !== undefined ? o.fimT - o.t0 : undefined, ouvido: iniciaEm + ((o.t0 + latencia) * 1000) / taxa }))
        .sort((a, b) => a.ouvido - b.ouvido);
    },
    falas() {
      return fontes.filter((o) => !o.cancelado && o.t0 !== null)
        .map((o) => ({ dur: o.buffer?.duration, mudo: mudo(o), ouvido: iniciaEm + ((o.t0 + latencia) * 1000) / taxa }))
        .sort((a, b) => a.ouvido - b.ouvido);
    },
  };
}
