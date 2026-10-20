/* Goleiro Orelha — © Marco Nunes — Todos os direitos reservados. */
(() => {
  const $ = (id) => document.getElementById(id);
  const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const seguro = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  const ler = (k, padrao) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch (e) { return padrao; } };

  const CHAVE_JOGADOR = 'goleiro-orelha:jogador';
  const CHAVE_RECORDE = 'goleiro-orelha:recorde:';
  const CHAVE_PREF = 'goleiro-orelha:pref';

  let jogador = ler(CHAVE_JOGADOR, '');
  let modo = 'goleiro', tipo = 'penalti', nivel = 'facil', qtd = 5;
  const pref = ler(CHAVE_PREF, { som: true, torcida: true });

  // ---------- Imagens dos personagens ----------
  const IMG = {};
  for (const [id, p] of Object.entries(PERSONAGENS)) { const i = new Image(); i.src = p.src; IMG[id] = i; }

  // mini sprite animado em telas de HTML (escolha do modo e fim)
  const timersCSS = new Map();
  function spriteCSS(el, id, estado) {
    const p = PERSONAGENS[id], e = p.estados[estado];
    clearInterval(timersCSS.get(el));
    el.style.backgroundImage = `url(${p.src})`;
    el.style.backgroundSize = `${p.colunas * 100}% ${(Object.keys(p.estados).length) * 100}%`;
    let q = 0;
    const linhas = Object.keys(p.estados).length;
    const passo = () => {
      el.style.backgroundPosition = `${(q % e.quadros) / Math.max(1, p.colunas - 1) * 100}% ${e.linha / (linhas - 1) * 100}%`;
      q++;
    };
    passo();
    if (e.quadros > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) timersCSS.set(el, setInterval(passo, 1000 / e.fps));
  }

  // ---------- Sons (gerados no aparelho, sem arquivos) ----------
  let actx = null, torcidaNo = null;
  function audio() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state !== 'running') actx.resume();
    } catch (e) { actx = null; }
    return actx;
  }
  // iPhone e Android só liberam o som dentro de um toque: destrava no primeiro toque
  function destravar() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* sem suporte */ }
    const a = audio();
    if (!a) return;
    const s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, 22050); s.connect(a.destination); s.start(0);
  }
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) => document.addEventListener(ev, destravar, { capture: true, passive: true }));

  function ruido(dur) {
    const a = actx, b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function tom(freq, dur, tipoOnda = 'triangle', vol = 0.15, quando = 0, freqFim = null) {
    const a = actx; const t = a.currentTime + quando;
    const o = a.createOscillator(), g = a.createGain();
    o.type = tipoOnda; o.frequency.setValueAtTime(freq, t);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function chiado(dur, freq, vol, tipoFiltro = 'bandpass', quando = 0) {
    const a = actx; const t = a.currentTime + quando;
    const s = a.createBufferSource(); s.buffer = ruido(dur);
    const f = a.createBiquadFilter(); f.type = tipoFiltro; f.frequency.value = freq;
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  const SOM = {
    apito: () => { tom(2900, 0.18, 'sine', 0.12); tom(2900, 0.32, 'sine', 0.12, 0.22); },
    chute: () => { tom(170, 0.14, 'sine', 0.5, 0, 50); chiado(0.06, 1800, 0.12); },
    rede: () => chiado(0.5, 900, 0.25),
    defesa: () => { tom(200, 0.12, 'sine', 0.45, 0, 80); chiado(0.1, 1500, 0.2, 'bandpass'); },
    trave: () => { tom(880, 0.6, 'triangle', 0.2); tom(1320, 0.5, 'sine', 0.12); },
    torcida: (forte = 1) => chiado(1.8, 700, 0.18 * forte, 'bandpass'),
    uhh: () => chiado(1.2, 350, 0.16, 'lowpass'),
    clique: () => tom(520, 0.06, 'triangle', 0.1),
    vitoria: () => [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.3, 'triangle', 0.14, i * 0.12)),
  };
  function som(nome, ...args) { if (!pref.som || !audio()) return; try { SOM[nome](...args); } catch (e) { /* sem áudio */ } }

  // ---------- Som agitado de fundo: torcida + batucada (surdo, caixa, tamborim e agogô) ----------
  let batuque = null;
  function torcidaFundo(ligar) {
    if (torcidaNo) { try { torcidaNo.stop(); } catch (e) { /* já parou */ } torcidaNo = null; }
    if (batuque) { clearInterval(batuque.timer); batuque = null; }
    if (!ligar || !pref.som || !pref.torcida || !audio()) return;
    const a = actx;
    // murmúrio da torcida
    const s = a.createBufferSource(); s.buffer = ruido(3); s.loop = true;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650;
    const g = a.createGain(); g.gain.value = 0.05;
    s.connect(f).connect(g).connect(a.destination); s.start(); torcidaNo = s;
    // batucada: agenda as batidas um pouquinho à frente (fica no ritmo mesmo se o aparelho engasgar)
    const BPM = 132, PASSO_BATUQUE = 60 / BPM / 4;
    batuque = { proximo: a.currentTime + 0.1, passo: 0, timer: null };
    const bater = (q, t) => {
      const vol = 0.55;
      if (q === 0 || q === 8) surdo(t, 68, 0.5 * vol);
      if (q === 4 || q === 12) surdo(t, 92, 0.32 * vol);
      if (q === 14) surdo(t, 92, 0.2 * vol);
      caixa(t, (q % 4 === 2 ? 0.16 : 0.06) * vol);
      if ([3, 7, 10, 11, 15].includes(q)) tamborim(t, 0.12 * vol);
      if (q === 0 || q === 3 || q === 6) agogo(t, q === 6 ? 620 : 880, 0.06 * vol);
    };
    batuque.timer = setInterval(() => {
      if (!actx || pausado) { if (actx) batuque.proximo = actx.currentTime + 0.1; return; }
      while (batuque.proximo < actx.currentTime + 0.12) {
        bater(batuque.passo % 16, batuque.proximo);
        batuque.proximo += PASSO_BATUQUE; batuque.passo++;
      }
    }, 25);
  }
  function surdo(t, freq, vol) {
    const a = actx, o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq * 1.6, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.4);
  }
  function caixa(t, vol) {
    const a = actx, s = a.createBufferSource(); s.buffer = ruido(0.08);
    const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2200;
    const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + 0.08);
  }
  function tamborim(t, vol) {
    const a = actx, o = a.createOscillator(), g = a.createGain();
    o.type = 'square'; o.frequency.value = 1450;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.06);
  }
  function agogo(t, freq, vol) {
    const a = actx, o = a.createOscillator(), g = a.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.2);
  }

  // ---------- Música de torcida no gol: "Olé, olé, olé" de corneta, bumbo, palmas e a torcida explodindo ----------
  function festaDoGol() {
    if (!pref.som || !audio()) return;
    const a = actx, t0 = a.currentTime + 0.05;
    // explosão da torcida
    const s = a.createBufferSource(); s.buffer = ruido(4);
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.32, t0 + 0.25); g.gain.linearRampToValueAtTime(0.2, t0 + 2.5); g.gain.exponentialRampToValueAtTime(0.001, t0 + 3.8);
    s.connect(f).connect(g).connect(a.destination); s.start(t0); s.stop(t0 + 4);
    // corneta: "O-lé, o-lé, o-lé, o-lé... O-lé, o-lé!"
    const nota = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const melodia = [[67, 0.22], [72, 0.44], [67, 0.22], [72, 0.44], [67, 0.22], [72, 0.22], [74, 0.22], [76, 0.66], [74, 0.22], [72, 0.44], [71, 0.22], [72, 0.7]];
    let t = t0 + 0.2;
    for (const [m, d] of melodia) {
      const o = a.createOscillator(), o2 = a.createOscillator(), lp = a.createBiquadFilter(), v = a.createGain(), vib = a.createOscillator(), vibG = a.createGain();
      o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = nota(m); o2.frequency.value = nota(m) * 1.005;
      vib.frequency.value = 6; vibG.gain.value = 5; vib.connect(vibG); vibG.connect(o.frequency); vibG.connect(o2.frequency);
      lp.type = 'lowpass'; lp.frequency.value = 2400;
      v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(0.09, t + 0.03); v.gain.setValueAtTime(0.08, t + d * 0.8); v.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(lp); o2.connect(lp); lp.connect(v).connect(a.destination);
      [o, o2, vib].forEach((x) => { x.start(t); x.stop(t + d + 0.02); });
      t += d;
    }
    // bumbo e palmas no ritmo
    for (let i = 0; i < 12; i++) {
      const tb = t0 + 0.2 + i * 0.22;
      if (i % 2 === 0) surdo(tb, 62, 0.5);
      const p = a.createBufferSource(); p.buffer = ruido(0.06);
      const pf = a.createBiquadFilter(); pf.type = 'bandpass'; pf.frequency.value = 1600;
      const pg = a.createGain(); pg.gain.setValueAtTime(0.22, tb + 0.11); pg.gain.exponentialRampToValueAtTime(0.001, tb + 0.17);
      p.connect(pf).connect(pg).connect(a.destination); p.start(tb + 0.11); p.stop(tb + 0.18);
    }
  }

  // ---------- Telas ----------
  function mostrar(id) {
    document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
    document.body.classList.toggle('jogando', id === 'tela-jogo');
    document.body.classList.toggle('tela-cheia', id === 'tela-jogo' || id === 'tela-nome');
  }
  document.querySelectorAll('[data-voltar]').forEach((b) => { b.onclick = () => { som('clique'); mostrar(b.dataset.voltar); }; });

  // 1. Nome
  $('nome').value = jogador;
  $('form-nome').onsubmit = (e) => {
    e.preventDefault();
    const n = $('nome').value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { $('erro-nome').textContent = 'Escreva o seu nome.'; return; }
    jogador = n; guardar(CHAVE_JOGADOR, jogador);
    som('apito');
    telaModo();
  };

  // 2. Modo
  function telaModo() {
    $('nome-modo').textContent = jogador;
    document.querySelectorAll('.escolha-sprite').forEach((el) => spriteCSS(el, el.dataset.sprite, el.dataset.estado));
    mostrar('tela-modo');
  }
  document.querySelectorAll('[data-modo]').forEach((b) => { b.onclick = () => { som('clique'); modo = b.dataset.modo; mostrar('tela-nivel'); }; });

  // 3. Cobrança, nível e quantidade
  function chips(grupo, atributo, aoEscolher) {
    $(grupo).querySelectorAll('.chip').forEach((c) => {
      c.onclick = () => {
        som('clique');
        $(grupo).querySelectorAll('.chip').forEach((x) => x.classList.toggle('ativo', x === c));
        aoEscolher(c.dataset[atributo]);
      };
    });
  }
  chips('chips-tipo', 'tipo', (v) => { tipo = v; });
  chips('chips-nivel', 'nivel', (v) => { nivel = v; });
  chips('chips-qtd', 'qtd', (v) => { qtd = Number(v); });
  $('btn-comecar').onclick = () => { som('apito'); novaPartida(); };

  // ---------- Campo em perspectiva (câmera atrás do cobrador, tela vertical) ----------
  // Mundo em metros: X para os lados (0 = meio do gol), Y altura, Z distância da câmera.
  // A câmera fica 3 m atrás da bola, a 2,6 m de altura; o gol está 11 m à frente da bola.
  const CAM_ALTURA = 2.6, Z_BOLA = 3, Z_GOL = 14, GOL_L = 3.66, GOL_A = 2.44, RAIO = 0.14, FUNDO_REDE = 1.8;
  const cv = $('campo');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, G = null, camX = 0, camXAlvo = 0;   // camX: a câmera vai para o lado da bola na falta

  function medir() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    // a marca do pênalti fica a 84% da altura da tela e a linha do gol a 40%
    const yBola = H * 0.84, yGol = H * 0.4;
    const f = (yBola - yGol) / (CAM_ALTURA * (1 / Z_BOLA - 1 / Z_GOL));
    G = { f, cx: W / 2, horizonte: yGol - f * CAM_ALTURA / Z_GOL };
  }
  window.addEventListener('resize', () => { if ($('tela-jogo').classList.contains('ativa')) medir(); });

  // projeta um ponto do mundo na tela
  function proj(X, Y, Z) {
    const z = Math.max(0.3, Z), s = G.f / z;
    return { x: G.cx + (X - camX) * s, y: G.horizonte + (CAM_ALTURA - Y) * s, s };
  }
  // ponto da tela -> ponto no plano do gol (Z = Z_GOL)
  function telaParaGol(x, y) {
    const s = G.f / Z_GOL;
    return { X: (x - G.cx) / s + camX, Y: CAM_ALTURA - (y - G.horizonte) / s };
  }

  function poligono(pts, cor) {
    ctx.fillStyle = cor; ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath(); ctx.fill();
  }
  function linhaChao(x1, z1, x2, z2) {
    const a = proj(x1, 0, Math.max(0.6, z1)), b = proj(x2, 0, Math.max(0.6, z2));
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }

  function desenharEstadio() {
    const hz = G.horizonte;
    // céu e arquibancada com a torcida
    const ceu = ctx.createLinearGradient(0, 0, 0, hz);
    ceu.addColorStop(0, '#0d5bd1'); ceu.addColorStop(1, '#4fa8ff');
    ctx.fillStyle = ceu; ctx.fillRect(0, 0, W, hz + 2);
    const baseArq = proj(0, 0, 22).y, topoPlaca = proj(0, 1.1, 21).y;
    ctx.fillStyle = '#1556b8'; ctx.fillRect(0, hz - G.f * 0.12, W, baseArq - hz + G.f * 0.12);
    const passo = Math.max(4, G.f * 0.012);
    for (let y = hz - G.f * 0.12; y < topoPlaca; y += passo) {
      for (let x = ((y / passo) % 2) * passo / 2; x < W; x += passo) {
        const k = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const pulo = partida && partida.festa && relogio - partida.festa < 1.5 ? Math.sin(relogio * 18 + x) * passo * 0.25 : 0;
        ctx.fillStyle = ['#0f4aa3', '#2f7fe0', '#ffffff', '#7fc0ff', '#1e66c9', '#ffd54f'][Math.floor((k - Math.floor(k)) * 6)];
        ctx.fillRect(x, y + pulo, passo * 0.55, passo * 0.55);
      }
    }
    // placas de publicidade atrás do gol
    const pa = proj(-30, 1.1, 21), pb = proj(30, 0, 21);
    ctx.fillStyle = '#0b3d91'; ctx.fillRect(0, pa.y, W, pb.y - pa.y);
    ctx.fillStyle = '#ffd54f'; ctx.font = `900 ${Math.round((pb.y - pa.y) * 0.62)}px Fredoka, sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const textos = ['GOLEIRO ORELHA', '⚽', 'PEDAGOGIA GAMIFICADA', '🧤'];
    let x = (relogio * 18) % (W * 0.6) - W * 0.6;
    for (let i = 0; x < W * 1.6; i++, x += W * 0.6) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ffd54f'; ctx.fillText(textos[i % 4], x, (pa.y + pb.y) / 2); }
    ctx.textBaseline = 'alphabetic';
  }

  function desenharGramado() {
    const hz = G.horizonte;
    ctx.fillStyle = '#4caf3a'; ctx.fillRect(0, proj(0, 0, 21).y, W, H);
    // faixas do gramado (cortadas de 2 em 2 metros), em perspectiva
    for (let z = 0.6; z < 21; z += 2) {
      const a = proj(-40, 0, z), b = proj(40, 0, z), c = proj(40, 0, z + 1), d = proj(-40, 0, z + 1);
      poligono([a, b, c, d], '#5cc447');
    }
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1.5, G.f * 0.004); ctx.lineCap = 'round';
    ctx.beginPath();
    linhaChao(-40, Z_GOL, 40, Z_GOL);                                   // linha de fundo
    const pa = 5.5, ga = 16.5;
    linhaChao(-9.16, Z_GOL, -9.16, Z_GOL - pa); linhaChao(-9.16, Z_GOL - pa, 9.16, Z_GOL - pa); linhaChao(9.16, Z_GOL - pa, 9.16, Z_GOL);   // pequena área
    linhaChao(-20.16, Z_GOL, -20.16, Z_GOL - ga); linhaChao(20.16, Z_GOL, 20.16, Z_GOL - ga);   // grande área
    ctx.stroke();
    // marca do pênalti
    const m = proj(0, 0, Z_BOLA);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(m.x, m.y, m.s * 0.12, m.s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    void hz;
  }

  // gol em 3D: traves, travessão e a rede (fundo, laterais e teto), que balança no gol
  function desenharRede() {
    const r = estadoRede();
    const desloca = (X, Y) => (r ? r.f * Math.exp(-((X - r.X) ** 2 + (Y - r.Y) ** 2) / 1.6) : 0);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    const Zf = Z_GOL + FUNDO_REDE;
    ctx.beginPath();
    for (let X = -GOL_L; X <= GOL_L + 0.01; X += 0.3) {   // fundo: verticais
      for (let Y = 0; Y <= GOL_A - 0.3 + 0.01; Y += 0.15) { const p = proj(X, Y, Zf + desloca(X, Y)); Y === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }
    }
    for (let Y = 0; Y <= GOL_A - 0.3 + 0.01; Y += 0.3) {  // fundo: horizontais
      for (let X = -GOL_L; X <= GOL_L + 0.01; X += 0.15) { const p = proj(X, Y, Zf + desloca(X, Y)); X === -GOL_L ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }
    }
    [-GOL_L, GOL_L].forEach((X) => {                       // laterais
      for (let z = Z_GOL; z <= Zf + 0.01; z += 0.3) { const a = proj(X, 0, z), b = proj(X, GOL_A - 0.3 * (z - Z_GOL) / FUNDO_REDE, z); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    });
    for (let X = -GOL_L; X <= GOL_L + 0.01; X += 0.3) { const a = proj(X, GOL_A, Z_GOL), b = proj(X, GOL_A - 0.3, Zf); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }   // teto
    ctx.stroke();
  }
  function desenharTraves() {
    const e = proj(-GOL_L, 0, Z_GOL), d = proj(GOL_L, 0, Z_GOL), te = proj(-GOL_L, GOL_A, Z_GOL), td = proj(GOL_L, GOL_A, Z_GOL);
    const t = Math.max(3, e.s * 0.12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(te.x - t, te.y - t, td.x - te.x + 2 * t, t);
    ctx.fillRect(te.x - t, te.y - t, t, e.y - te.y + t);
    ctx.fillRect(td.x, td.y - t, t, d.y - td.y + t);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(te.x - t, te.y - t * 0.3, td.x - te.x + 2 * t, t * 0.3);
  }

  function sombra(X, Z, rx) {
    const p = proj(X, 0, Z);
    ctx.fillStyle = 'rgba(10,40,10,.32)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * p.s, rx * p.s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  }

  // desenha um quadro do sprite com o pé no ponto (X, Y, Z) do mundo; altura do personagem em metros
  function sprite(id, ator, X, Y, Z, altura = 1.8) {
    const p = PERSONAGENS[id], img = IMG[id];
    if (!img.complete || !img.naturalWidth) return;
    const e = p.estados[ator.estado];
    const t = relogio - ator.desde;
    let q = Math.floor(t * e.fps);
    q = e.repete ? q % e.quadros : Math.min(e.quadros - 1, q);
    const pe = proj(X, Y, Z);
    const tam = altura * pe.s * (QUADRO / (QUADRO * 0.63));   // o personagem ocupa ~63% da altura do quadro
    const dx = pe.x - tam * (PE_DO_QUADRO.x / QUADRO), dy = pe.y - tam * (PE_DO_QUADRO.y / QUADRO);
    ctx.drawImage(img, q * QUADRO, e.linha * QUADRO, QUADRO, QUADRO, dx, dy, tam, tam);
  }

  function desenharBola(x, y, r, amasso) {
    ctx.save(); ctx.translate(x, y);
    if (amasso) { const k = clamp((relogio - amasso.t0) / amasso.dur, 0, 1); ctx.scale(lerp(amasso.sx, 1, k), lerp(amasso.sy, 1, k)); }
    ctx.rotate(relogio * (partida && partida.bola.voando ? 14 : 0));
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); i ? ctx.lineTo(Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38) : ctx.moveTo(Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38); }
    ctx.fill();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88, r * 0.2, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // barreira da falta: quatro jogadores rivais (de frente para o cobrador)
  function desenharBarreira(X0, Z) {
    for (let i = 0; i < 4; i++) {
      const X = X0 + (i - 1.5) * 0.55;
      sombra(X, Z, 0.3);
      const pe = proj(X, 0, Z), s = pe.s;
      const pulo = partida.cobranca.fase === 'voo' ? Math.sin(clamp((relogio - partida.cobranca.inicioVoo) / 0.5, 0, 1) * Math.PI) * 0.35 * s : 0;
      const y = pe.y - pulo;
      ctx.fillStyle = '#111'; ctx.fillRect(pe.x - s * 0.13, y - s * 0.12, s * 0.1, s * 0.12); ctx.fillRect(pe.x + s * 0.03, y - s * 0.12, s * 0.1, s * 0.12);
      ctx.fillStyle = '#e53935'; ctx.fillRect(pe.x - s * 0.13, y - s * 0.5, s * 0.1, s * 0.38); ctx.fillRect(pe.x + s * 0.03, y - s * 0.5, s * 0.1, s * 0.38);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(pe.x - s * 0.2, y - s * 0.85, s * 0.4, s * 0.36);
      ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.roundRect(pe.x - s * 0.22, y - s * 1.45, s * 0.44, s * 0.62, s * 0.08); ctx.fill();
      ctx.fillStyle = '#c98c63'; ctx.beginPath(); ctx.arc(pe.x - s * 0.06, y - s * 0.9, s * 0.07, 0, 7); ctx.arc(pe.x + s * 0.06, y - s * 0.9, s * 0.07, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(pe.x, y - s * 1.62, s * 0.15, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(pe.x, y - s * 1.68, s * 0.15, Math.PI, 2 * Math.PI); ctx.fill();
    }
  }

  // setas em volta do goleiro (guia do modo Goleiro)
  function desenharSetas() {
    const a = 0.5 + 0.5 * Math.sin(relogio * 5);
    ctx.save(); ctx.globalAlpha = 0.45 + a * 0.45; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const seta = (X, Y, ang) => {
      const p = proj(X, Y, Z_GOL), s = p.s * 0.22;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.5); ctx.lineTo(0, 0); ctx.lineTo(-s * 0.5, s * 0.5); ctx.stroke(); ctx.restore();
    };
    seta(-1.5, 1.9, Math.PI + 0.6); seta(1.5, 1.9, -0.6); seta(-1.5, 0.5, Math.PI); seta(1.5, 0.5, 0); seta(0, 2.25, -Math.PI / 2);
    ctx.restore();
  }

  // ---------- Partida ----------
  let partida = null, relogio = 0, ultimo = 0, pausado = false, quadro = null;

  function novaPartida() {
    partida = {
      n: 0, a: 0, b: 0, total: qtd, encerrada: false, historico: [],
      goleiro: { id: modo === 'goleiro' ? 'orelhaGoleiro' : 'rivalGoleiro', estado: 'pronto', desde: 0, X: 0, lift: 0, zona: null },
      atacante: { id: modo === 'goleiro' ? 'rivalAtacante' : 'orelhaAtacante', estado: 'pronto', desde: 0, X: 0, Z: 0 },
      bola: { X: 0, Y: RAIO, Z: Z_BOLA, voando: false, visivel: true, rastro: [] },
      jaExplicou: false,
    };
    $('rotulo-a').textContent = modo === 'goleiro' ? 'DEFESAS' : 'GOLS';
    $('rotulo-b').textContent = modo === 'goleiro' ? 'GOLS' : 'DEFESAS';
    $('controles').hidden = modo !== 'goleiro';
    mostrar('tela-jogo');
    medir();
    atualizarPlacar();
    torcidaFundo(true);
    pausado = false;
    ultimo = performance.now();
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(laco);
    explicar();
  }

  function explicar() {
    $('ajuda-titulo').textContent = modo === 'goleiro' ? '🧤 Você é o goleiro!' : '⚽ Você é o atacante!';
    $('ajuda-texto').innerHTML = modo === 'goleiro'
      ? `<ul><li>O atacante corre e chuta. <b>Espere o chute!</b></li>
         <li>Quando a bola sair, toque na direção para o Orelha pular: <b>⬅ ↖ ⬆ ↗ ➡</b>, ou toque direto no canto do gol (ou use as setas do teclado).</li>
         <li>${nivel === 'facil' ? 'No fácil, basta acertar o lado.' : 'No difícil, acerte o lado <b>e</b> a altura (alto ou baixo).'}</li>
         <li>Defenda o máximo que puder! ${partida.total} cobranças.</li></ul>`
      : `<ul><li><b>Arraste o dedo</b> da bola até o canto do gol onde quer chutar.</li>
         <li>Faça uma <b>curva</b> no traço para dar efeito e enganar o goleiro.</li>
         <li>Quanto mais alto no gol você soltar, mais alto vai a bola. Cuidado com a trave!</li>
         <li>Faça o máximo de gols! ${partida.total} cobranças.</li></ul>`;
    pausado = true;
    $('modal-ajuda').hidden = false;
    $('ajuda-ok').focus({ preventScroll: true });
  }
  $('ajuda-ok').onclick = () => {
    som('clique');
    $('modal-ajuda').hidden = true;
    pausado = false; ultimo = performance.now();
    if (partida && !partida.jaExplicou) { partida.jaExplicou = true; proximaCobranca(); }
  };

  function atualizarPlacar() {
    $('placar-a').textContent = partida.a;
    $('placar-b').textContent = partida.b;
    $('placar-cobranca').textContent = `${Math.min(partida.n, partida.total) || 1}/${partida.total}`;
    // estrelas no alto (como nos jogos de pênalti): dourada = acerto, ✖ = erro
    $('estrelas-hud').innerHTML = Array.from({ length: partida.total }, (_, i) => {
      const h = partida.historico[i];
      return h === undefined ? '<span>⭐</span>' : h ? '<span class="bom">⭐</span>' : '<span class="ruim">❌</span>';
    }).join('');
  }

  const estado = (ator, e) => { if (ator.estado !== e) { ator.estado = e; ator.desde = relogio; } };
  function avisar(texto) {
    const a = $('aviso'); a.textContent = texto; a.classList.remove('mostrar'); void a.offsetWidth; a.classList.add('mostrar');
  }
  function dica(texto) { $('dica').hidden = !texto; $('dica').textContent = texto || ''; }

  function proximaCobranca() {
    const p = partida;
    if (p.n >= p.total) return fimDaPartida();
    p.n++;
    atualizarPlacar();
    const falta = tipo === 'falta' || (tipo === 'misto' && p.n % 2 === 0);
    p.cobranca = {
      falta, fase: 'preparar', desde: relogio, zonaJogador: null, apertou: null, resultado: null,
      bolaX: falta ? sortear([-1, 1]) * (0.75 + Math.random() * 0.45) : 0, caminho: [], alvo: null, efeito: 0, buffer: null,
    };
    Object.assign(p.goleiro, { estado: 'pronto', desde: relogio, X: 0, lift: 0, zona: null, inicioMergulho: null, caiu: false });
    Object.assign(p.atacante, { estado: 'pronto', desde: relogio });
    Object.assign(p.bola, { X: p.cobranca.bolaX, Y: RAIO, Z: Z_BOLA, voando: false, visivel: true, rastro: [], rebote: null, amasso: null });
    camXAlvo = p.cobranca.falta ? p.cobranca.bolaX * 0.8 : 0;
    p.rede = null;
    $('controles').classList.add('travado');
    if (modo === 'goleiro') dica(p.n === 1 ? 'Espere o chute e escolha o canto!' : '');
    else dica(p.n <= 2 ? 'Arraste da bola até o canto do gol ✍️' : '');
  }

  // ---------- Modo Goleiro: o computador chuta ----------
  function chuteDoComputador() {
    const c = partida.cobranca;
    const zona = sortear(Object.keys(ZONAS));
    const z = ZONAS[zona];
    c.zonaChute = zona;
    c.alvo = { tx: clamp(z.tx + (Math.random() - 0.5) * 0.16, -0.9, 0.9), tz: clamp(z.tz + (Math.random() - 0.5) * 0.14, 0.08, 0.9) };
    c.efeito = c.falta ? -Math.sign(c.bolaX) * 0.25 : (Math.random() - 0.5) * 0.06;
    lancarBola(c.falta ? NIVEIS[nivel].vooFalta : NIVEIS[nivel].voo);
    $('controles').classList.remove('travado');
    dica(partida.n === 1 ? 'AGORA! Escolha o canto!' : '');
    // toque feito um instante antes do chute também vale (tolerância)
    if (c.buffer && relogio - c.buffer.t < 0.18) pular(c.buffer.zona);
  }

  function pular(zona) {
    const p = partida;
    if (!p || modo !== 'goleiro' || pausado) return;
    const c = p.cobranca;
    if (!c || c.zonaJogador) return;
    if (c.fase !== 'voo') {
      if (c.fase === 'chute' || c.fase === 'corrida') { c.buffer = { zona, t: relogio }; }
      if (c.fase === 'preparar' || c.fase === 'corrida') dica('Calma! Espere a bola sair do pé ⚽');
      return;
    }
    c.zonaJogador = zona;
    c.apertou = (relogio - c.inicioVoo) / c.voo;   // 0 = no chute, 1 = bola chegando
    mergulhar(p.goleiro, zona);
    $('controles').classList.add('travado');
    const b = document.querySelector(`.dir[data-zona="${zona}"]`);
    if (b) { b.classList.add('apertado'); setTimeout(() => b.classList.remove('apertado'), 250); }
    dica('');
  }
  document.querySelectorAll('.dir').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); pular(b.dataset.zona); }));

  const TECLAS = { ArrowLeft: 'esqBaixo', a: 'esqBaixo', 4: 'esqBaixo', ArrowRight: 'dirBaixo', d: 'dirBaixo', 6: 'dirBaixo', ArrowUp: 'centro', w: 'centro', 8: 'centro', ' ': 'centro', q: 'esqAlto', 7: 'esqAlto', e: 'dirAlto', 9: 'dirAlto' };
  document.addEventListener('keydown', (e) => {
    if (!$('tela-jogo').classList.contains('ativa')) return;
    if (e.key === 'Escape') { pausar(!pausado); return; }
    let z = TECLAS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!z) return;
    if (e.shiftKey && z === 'esqBaixo') z = 'esqAlto';
    if (e.shiftKey && z === 'dirBaixo') z = 'dirAlto';
    e.preventDefault();
    pular(z);
  });

  function mergulhar(gol, zona) {
    const z = ZONAS[zona];
    gol.zona = zona;
    gol.inicioMergulho = relogio;
    const alto = partida.cobranca.alvo && partida.cobranca.alvo.tz > 0.55;
    estado(gol, zona === 'centro' ? (alto ? 'pulo' : 'pronto') : zona);
    gol.destinoX = z.tx * GOL_L * 0.62;
    gol.destinoLift = z.alto ? 0.45 : zona === 'centro' && alto ? 0.5 : 0;
  }

  // ---------- Modo Jogador: arrastar o dedo para chutar ----------
  let desenhando = false;
  const ponto = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', (e) => {
    const p = partida;
    if (!p || pausado) return;
    // modo Goleiro: tocar no canto do gol também faz o Orelha pular
    if (modo === 'goleiro') {
      const g = telaParaGol(ponto(e).x, ponto(e).y);
      if (Math.abs(g.X) < GOL_L * 1.4 && g.Y > -0.5 && g.Y < GOL_A * 1.4) {
        const lado = g.X < -GOL_L * 0.33 ? -1 : g.X > GOL_L * 0.33 ? 1 : 0;
        pular(!lado ? 'centro' : lado < 0 ? (g.Y > GOL_A * 0.5 ? 'esqAlto' : 'esqBaixo') : (g.Y > GOL_A * 0.5 ? 'dirAlto' : 'dirBaixo'));
      }
      return;
    }
    if (p.cobranca.fase !== 'preparar') return;
    const b = proj(p.bola.X, RAIO, Z_BOLA), q = ponto(e);
    if (Math.hypot(q.x - b.x, q.y - b.y) > b.s * RAIO * 5 + 40) { dica('Comece o traço em cima da bola ⚽'); return; }
    desenhando = true;
    p.cobranca.caminho = [{ x: b.x, y: b.y }, q];
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* toque sintético */ }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!desenhando) return;
    const cam = partida.cobranca.caminho, q = ponto(e), u = cam[cam.length - 1];
    if (Math.hypot(q.x - u.x, q.y - u.y) > 5) cam.push(q);
  });
  const soltar = () => {
    if (!desenhando) return;
    desenhando = false;
    const c = partida.cobranca, cam = c.caminho;
    const ini = cam[0], fim = cam[cam.length - 1];
    if (cam.length < 4 || ini.y - fim.y < H * 0.12) { c.caminho = []; dica('Arraste para cima, até o gol ⬆'); return; }
    prepararChuteDesenhado(c);
  };
  cv.addEventListener('pointerup', soltar);
  cv.addEventListener('pointercancel', soltar);

  function prepararChuteDesenhado(c) {
    const cam = c.caminho, ini = cam[0];
    let fim = cam[cam.length - 1];
    const linhaGol = proj(0, 0, Z_GOL).y;
    // se o traço parou antes do gol, segue a direção final até a linha do gol (chute mais baixo)
    if (fim.y > linhaGol) {
      const k = Math.max(0, cam.length - 1 - Math.max(2, Math.floor(cam.length * 0.3)));
      const a = cam[k], dx = fim.x - a.x, dy = fim.y - a.y;
      const yAlvo = linhaGol - proj(0, 0, Z_GOL).s * 0.35;
      fim = dy < -1 ? { x: fim.x + dx * ((yAlvo - fim.y) / dy), y: yAlvo } : { x: fim.x, y: yAlvo };
    }
    const g = telaParaGol(fim.x, fim.y);
    // efeito: quanto o traço se afasta da linha reta (curva)
    const L = Math.hypot(fim.x - ini.x, fim.y - ini.y) || 1;
    let maior = 0;
    for (const q of cam) {
      const d = ((fim.x - ini.x) * (ini.y - q.y) - (ini.x - q.x) * (fim.y - ini.y)) / L;
      if (Math.abs(d) > Math.abs(maior)) maior = d;
    }
    c.efeito = clamp(maior / L, -0.6, 0.6);
    c.alvo = { tx: g.X / GOL_L, tz: g.Y / GOL_A };
    c.fase = 'corrida'; c.desde = relogio;
    estado(partida.atacante, 'corrida');
    dica('');
  }

  function resultadoDoAlvo(alvo) {
    const ax = Math.abs(alvo.tx);
    if (alvo.tz > 1.1 || ax > 1.12 || alvo.tz < -0.2) return 'fora';
    if ((ax > 0.94 && ax <= 1.12 && alvo.tz <= 1.06) || (alvo.tz > 0.94 && alvo.tz <= 1.1 && ax <= 1.06)) return 'trave';
    return 'dentro';
  }
  function zonaDoAlvo(alvo) {
    const lado = alvo.tx < -0.33 ? -1 : alvo.tx > 0.33 ? 1 : 0;
    if (!lado) return 'centro';
    const alto = alvo.tz > 0.5;
    return lado < 0 ? (alto ? 'esqAlto' : 'esqBaixo') : (alto ? 'dirAlto' : 'dirBaixo');
  }

  // goleiro do computador escolhe o canto
  function escolhaDoGoleiro(c) {
    const certa = zonaDoAlvo(c.alvo);
    let p = NIVEIS[nivel].acertoGoleiro - Math.min(0.2, Math.abs(c.efeito) * 0.8);
    if (certa === 'centro') p += 0.4;
    if (Math.abs(c.alvo.tx) > 0.7 && (c.alvo.tz > 0.65 || c.alvo.tz < 0.25)) p -= 0.08;
    if (Math.random() < p) return certa;
    return sortear(Object.keys(ZONAS).filter((z) => z !== certa));
  }

  // ---------- Voo da bola em 3D ----------
  // a bola vai da marca até o plano do gol; o efeito entorta para o lado e a altura faz uma parábola.
  // Como é projetada pela câmera, ela diminui sozinha conforme se afasta (noção de profundidade).
  function lancarBola(voo) {
    const c = partida.cobranca;
    c.fase = 'voo'; c.inicioVoo = relogio; c.voo = voo;
    c.S = { X: c.bolaX, Y: RAIO, Z: Z_BOLA };
    c.T = { X: c.alvo.tx * GOL_L, Y: Math.max(RAIO, c.alvo.tz * GOL_A), Z: Z_GOL };
    c.curva = c.efeito * 3.2;                    // metros de desvio no meio do caminho
    c.arco = c.falta ? 1.6 : 0.35;               // a falta sobe por cima da barreira
    const bo = partida.bola;
    bo.voando = true; bo.rastro = [];
    amassar(1.4, 0.65);
    const p = proj(c.S.X, 0, c.S.Z);
    particulas(p.x, p.y, 10, ['#8bc34a', '#c5e1a5', '#d7ccc8'], 0.6, p.s * 0.05);
    som('chute');
  }
  function posBola(c, f) {
    const X = lerp(c.S.X, c.T.X, f) - c.curva * 4 * f * (1 - f) * (f < 1 ? 1 : 0);
    const Y = lerp(c.S.Y, c.T.Y, f) + c.arco * 4 * f * (1 - f);
    const Z = lerp(c.S.Z, c.T.Z, f);
    return { X, Y, Z };
  }

  // ---------- Sensação de jogo: tremor, congelamento, amassar a bola e partículas ----------
  let tremor = null, congelar = 0, zoom = 1;
  const parts = [];
  function tremer(forca, dur = 0.16) { tremor = { forca, dur, t0: relogio }; }
  function amassar(sx, sy, dur = 0.12) { partida.bola.amasso = { sx, sy, dur, t0: relogio }; }
  function particulas(x, y, n, cores, vel, tam, tipo = 'bolinha') {
    const v0 = vel * W * 0.5;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * v0;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - v0 * 0.6, vida: 0.6 + Math.random() * 0.5, idade: 0, cor: sortear(cores), tam: Math.max(2, tam * (0.6 + Math.random() * 0.8)), tipo, giro: Math.random() * 6 });
    }
  }
  function atualizarParticulas(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.idade += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += H * 1.2 * dt; q.vx *= 0.98; q.giro += dt * 8;
      if (q.idade >= q.vida) parts.splice(i, 1);
    }
  }
  function desenharParticulas() {
    for (const q of parts) {
      ctx.save(); ctx.globalAlpha = 1 - q.idade / q.vida; ctx.translate(q.x, q.y); ctx.rotate(q.giro);
      ctx.fillStyle = q.cor;
      if (q.tipo === 'estrela') {
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const r = k % 2 ? q.tam * 0.45 : q.tam; const a = k * Math.PI / 5; k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(r, 0); }
        ctx.fill();
      } else if (q.tipo === 'papel') ctx.fillRect(-q.tam, -q.tam * 0.5, q.tam * 2, q.tam);
      else { ctx.beginPath(); ctx.arc(0, 0, q.tam, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  function resolver() {
    const p = partida, c = p.cobranca;
    c.fase = 'resultado'; c.desde = relogio;
    p.bola.voando = false;
    const res = resultadoDoAlvo(c.alvo);
    const zonaChute = zonaDoAlvo(c.alvo);
    let defendeu = false;
    if (res === 'dentro') {
      const zg = p.goleiro.zona;
      if (modo === 'goleiro') {
        const z1 = ZONAS[zg || 'centro'], z2 = ZONAS[zonaChute];
        const noTempo = zg ? c.apertou <= (nivel === 'facil' ? 0.92 : 0.8) : true;
        const certo = !zg ? zonaChute === 'centro' : (NIVEIS[nivel].mesmoLadoDefende ? z1.lado === z2.lado : zg === zonaChute);
        defendeu = certo && noTempo;
      } else {
        defendeu = zg === zonaChute;
      }
    }
    c.resultado = res === 'dentro' ? (defendeu ? 'defesa' : 'gol') : res;
    const b = p.bola;
    b.saida = { X: b.X, Y: b.Y, Z: b.Z, t0: relogio };
    const tela = proj(b.X, b.Y, b.Z);
    congelar = 0.07;   // micro pausa no impacto
    const acertou = modo === 'goleiro' ? c.resultado !== 'gol' : c.resultado === 'gol';
    p.historico.push(acertou);
    if (c.resultado === 'gol') {
      p.rede = { X: b.X, Y: b.Y, t0: relogio };
      p.festa = relogio;
      som('rede'); festaDoGol();
      avisar(sortear(FRASES.gol));
      tremer(W * 0.02);
      amassar(0.7, 1.3, 0.18);
      particulas(tela.x, tela.y, 28, ['#ffd54f', '#e53935', '#38a8ef', '#ffffff', '#2e9e5b'], 0.6, W * 0.012, 'papel');
      estado(p.atacante, 'comemora');
      setTimeout(() => partida === p && estado(p.goleiro, 'triste'), 450);
      if (modo === 'goleiro') p.b++; else p.a++;
    } else if (c.resultado === 'defesa') {
      som('defesa'); som('torcida', 0.9);
      avisar(sortear(FRASES.defesa));
      tremer(W * 0.012, 0.12);
      amassar(1.35, 0.7);
      particulas(tela.x, tela.y, 14, ['#ffd54f', '#ffffff', '#ffe082'], 0.45, W * 0.02, 'estrela');
      if (p.goleiro.zona === 'centro' || !p.goleiro.zona) { if (c.alvo.tz <= 0.55) estado(p.goleiro, 'defesa'); b.visivel = c.alvo.tz > 0.55; if (b.visivel) b.rebote = { vX: 0, vY: 6, vZ: 3 }; }
      else b.rebote = { vX: (ZONAS[p.goleiro.zona].lado || 1) * 7, vY: 3.5, vZ: -1 };
      estado(p.atacante, 'triste');
      setTimeout(() => partida === p && p.goleiro.estado !== 'defesa' && estado(p.goleiro, 'comemora'), 700);
      if (modo === 'goleiro') p.a++; else p.b++;
    } else {
      som(c.resultado === 'trave' ? 'trave' : 'uhh');
      avisar(sortear(FRASES[c.resultado]));
      if (c.resultado === 'trave') { tremer(W * 0.024, 0.2); amassar(0.65, 1.35); particulas(tela.x, tela.y, 10, ['#ffffff', '#cfd8dc'], 0.4, W * 0.008); }
      b.rebote = c.resultado === 'trave' ? { vX: -Math.sign(c.alvo.tx || 1) * 2, vY: 2, vZ: -7 } : { vX: Math.sign(c.alvo.tx || 1) * 2, vY: 1, vZ: 6 };
      estado(p.atacante, 'triste');
      setTimeout(() => partida === p && estado(p.goleiro, 'comemora'), 500);
      if (modo === 'goleiro') p.a++;   // bola fora também conta como chute parado para o goleiro
    }
    atualizarPlacar();
  }

  function estadoRede() {
    const r = partida && partida.rede;
    if (!r) return null;
    const t = relogio - r.t0;
    return { X: r.X, Y: r.Y, f: t > 1.2 ? 0.25 : 0.9 * Math.exp(-t * 3) * Math.cos(t * 14) + 0.25 };
  }

  // ---------- Laço principal ----------
  function atualizar(dt) {
    const p = partida, c = p.cobranca;
    atualizarParticulas(dt);
    if (!c) return;
    const t = relogio - c.desde;
    const at = p.atacante, bo = p.bola;
    // cobrador: atrás da bola e um pouco à esquerda (chuta de direita), bem perto da câmera
    const parado = { X: c.bolaX - 0.42, Z: Z_BOLA - 0.2 };
    const recuado = { X: c.bolaX - 1.1, Z: Z_BOLA - 0.5 };

    if (c.fase === 'preparar') {
      at.X = recuado.X; at.Z = recuado.Z;
      if (modo === 'goleiro' && t > 1.1) { c.fase = 'corrida'; c.desde = relogio; estado(at, 'corrida'); }
    } else if (c.fase === 'corrida') {
      // preparação: o cobrador desacelera nos últimos passos antes do chute
      const dur = modo === 'goleiro' ? 0.95 : 0.6;
      const f = easeOut(clamp(t / dur, 0, 1));
      at.X = lerp(recuado.X, parado.X, f); at.Z = lerp(recuado.Z, parado.Z, f);
      if (t >= dur) { c.fase = 'chute'; c.desde = relogio; estado(at, 'chute'); }
    } else if (c.fase === 'chute') {
      if (t >= 0.12) {
        if (modo === 'goleiro') chuteDoComputador();
        else {
          const dist = Math.hypot(c.alvo.tx * GOL_L, 11);
          lancarBola(clamp(0.55 + dist / 22 + Math.abs(c.efeito) * 0.4, 0.75, 1.25) * (nivel === 'dificil' ? 0.9 : 1));
          const zona = escolhaDoGoleiro(c);
          c.reacaoGoleiro = { zona, em: relogio + (nivel === 'dificil' ? 0.12 : 0.22) * c.voo };
        }
      }
    } else if (c.fase === 'voo') {
      if (c.reacaoGoleiro && relogio >= c.reacaoGoleiro.em) { mergulhar(p.goleiro, c.reacaoGoleiro.zona); c.reacaoGoleiro = null; }
      const f = clamp((relogio - c.inicioVoo) / c.voo, 0, 1);
      Object.assign(bo, posBola(c, f));
      bo.rastro.push({ X: bo.X, Y: bo.Y, Z: bo.Z }); if (bo.rastro.length > 7) bo.rastro.shift();
      if (f >= 1) resolver();
    } else if (c.fase === 'resultado') {
      const tt = relogio - bo.saida.t0;
      if (bo.rastro.length) bo.rastro.shift();
      if (c.resultado === 'gol') {
        // entra na rede e para no fundo
        const g = easeOut(clamp(tt / 0.4, 0, 1));
        bo.Z = lerp(Z_GOL, Z_GOL + FUNDO_REDE * 0.85, g);
        bo.Y = Math.max(RAIO, bo.saida.Y - g * 0.3);
      } else if (bo.rebote) {
        bo.X = bo.saida.X + bo.rebote.vX * tt;
        bo.Z = bo.saida.Z + bo.rebote.vZ * tt;
        bo.Y = Math.max(RAIO, bo.saida.Y + bo.rebote.vY * tt - 4.9 * tt * tt);
      }
      if (t > 2.3) proximaCobranca();
    }

    // goleiro: desliza até o canto, voa e depois cai no chão (continuação do movimento), levantando poeira
    const gl = p.goleiro;
    if (gl.inicioMergulho != null) {
      const tm = relogio - gl.inicioMergulho;
      const f = easeOut(clamp(tm / 0.3, 0, 1));
      gl.X = lerp(0, gl.destinoX, f);
      const queda = clamp((tm - 0.5) / 0.3, 0, 1);
      gl.lift = lerp(0, gl.destinoLift, f) * (1 - queda * queda);
      if (queda >= 1 && !gl.caiu && gl.zona !== 'centro') {
        gl.caiu = true;
        const q = proj(gl.X, 0, Z_GOL);
        particulas(q.x, q.y, 12, ['#cfd8dc', '#b0bec5', '#a5d6a7'], 0.25, q.s * 0.08);
      }
    } else { gl.X = 0; gl.lift = 0; }
    if (gl.estado === 'defesa') gl.X = lerp(gl.X, 0, 0.1);

    // câmera: aproxima um pouco do gol enquanto a bola voa (suave, sem tremer)
    const alvoZoom = c.fase === 'voo' ? 1.08 : c.fase === 'resultado' && t < 1.2 ? 1.06 : 1;
    zoom = lerp(zoom, alvoZoom, 1 - Math.exp(-dt * 5));
    camX = lerp(camX, camXAlvo, 1 - Math.exp(-dt * 4));
  }

  function desenhar() {
    const p = partida, c = p.cobranca;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    // câmera: zoom em direção ao gol + tremor curto que vai diminuindo
    const alvoCam = proj(0, GOL_A * 0.5, Z_GOL);
    ctx.translate(alvoCam.x, alvoCam.y); ctx.scale(zoom, zoom); ctx.translate(-alvoCam.x, -alvoCam.y);
    if (tremor) {
      const k = (relogio - tremor.t0) / tremor.dur;
      if (k >= 1) tremor = null;
      else ctx.translate((Math.random() - 0.5) * 2 * tremor.forca * (1 - k), (Math.random() - 0.5) * 2 * tremor.forca * (1 - k));
    }
    desenharEstadio();
    desenharGramado();
    desenharRede();
    if (!c) { desenharTraves(); ctx.restore(); return; }

    const at = p.atacante, bo = p.bola, gl = p.goleiro;
    // tudo em ordem de profundidade: o mais longe (Z maior) primeiro
    const camada = [];
    const bolaNaRede = c.fase === 'resultado' && c.resultado === 'gol';
    camada.push({ z: Z_GOL + 0.05, d: () => {
      sombra(gl.X, Z_GOL, 0.45);
      sprite(gl.id, gl, gl.X, gl.lift, Z_GOL, 1.85);
      if (modo === 'goleiro' && (c.fase === 'preparar' || c.fase === 'corrida' || (c.fase === 'voo' && !c.zonaJogador))) desenharSetas();
    } });
    camada.push({ z: Z_GOL - 0.01, d: desenharTraves });
    if (c.falta) camada.push({ z: Z_BOLA + 5.5, d: () => desenharBarreira(lerp(c.bolaX, 0, 0.55), Z_BOLA + 5.5) });
    camada.push({ z: at.Z, d: () => { sombra(at.X, at.Z, 0.35); sprite(at.id, at, at.X, 0, at.Z, 1.4); } });
    if (bo.visivel) {
      camada.push({ z: bolaNaRede ? Z_GOL + 0.5 : bo.Z, d: () => {
        sombra(bo.X, bo.Z, RAIO * 1.1);
        (bo.rastro || []).forEach((q, i, l) => { const s = proj(q.X, q.Y, q.Z); ctx.globalAlpha = (i + 1) / l.length * 0.28; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, RAIO * s.s * 0.85, 0, 7); ctx.fill(); });
        ctx.globalAlpha = 1;
        const s = proj(bo.X, bo.Y, bo.Z);
        desenharBola(s.x, s.y, Math.max(2.5, RAIO * s.s), bo.amasso);
      } });
    }
    camada.sort((a, z) => z.z - a.z).forEach((e) => e.d());
    desenharParticulas();

    // traço do chute (modo Jogador)
    if (modo === 'jogador' && c.caminho && c.caminho.length > 1 && (c.fase === 'preparar' || c.fase === 'corrida' || c.fase === 'chute')) {
      ctx.save(); ctx.strokeStyle = 'rgba(200,255,250,.95)'; ctx.lineWidth = 5; ctx.setLineDash([14, 10]); ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(120,255,240,.9)'; ctx.shadowBlur = 12;
      ctx.beginPath(); c.caminho.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
      ctx.restore();
    }
    // guia pontilhada antes dos primeiros chutes
    if (modo === 'jogador' && c.fase === 'preparar' && (!c.caminho || c.caminho.length < 2) && p.n <= 2) {
      const b = proj(bo.X, RAIO, Z_BOLA);
      ctx.save(); ctx.globalAlpha = 0.45 + 0.35 * Math.sin(relogio * 4);
      ctx.strokeStyle = '#d8fffa'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]);
      [-1, 1].forEach((l) => {
        const alvo = proj(l * GOL_L * 0.7, GOL_A * 0.75, Z_GOL);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(b.x + l * W * 0.35, (b.y + alvo.y) / 2, alvo.x, alvo.y); ctx.stroke();
      });
      const k = (relogio % 2) / 2, alvo = proj(GOL_L * 0.6, GOL_A * 0.6, Z_GOL);
      ctx.globalAlpha = 1; ctx.setLineDash([]);
      ctx.font = `${Math.round(W * 0.1)}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('👆', lerp(b.x, alvo.x, k), lerp(b.y + W * 0.08, alvo.y + W * 0.05, k));
      ctx.restore();
    }
    ctx.restore();
  }

  // passo de física fixo (1/120 s): o jogo corre igual em qualquer aparelho
  const PASSO = 1 / 120;
  let acumulado = 0;
  function laco(agora) {
    const dt = Math.min(0.05, (agora - ultimo) / 1000);
    ultimo = agora;
    if (!pausado && partida && !partida.encerrada) {
      if (congelar > 0) congelar -= dt;
      else {
        acumulado += dt;
        while (acumulado >= PASSO) { relogio += PASSO; atualizar(PASSO); acumulado -= PASSO; }
      }
    }
    if (partida && G) desenhar();
    if (partida && !partida.encerrada) quadro = requestAnimationFrame(laco);
  }

  // ---------- Painel lateral ----------
  function atualizarSom() {
    $('btn-som').setAttribute('aria-pressed', String(pref.som));
    $('btn-som').setAttribute('aria-label', pref.som ? 'Som ligado' : 'Som desligado');
    $('btn-som').textContent = pref.som ? '🔊' : '🔇';
  }
  $('btn-som').onclick = () => { pref.som = !pref.som; guardar(CHAVE_PREF, pref); atualizarSom(); torcidaFundo(pref.som && !!partida); som('clique'); };
  atualizarSom();
  function pausar(sim) {
    if (!partida || partida.encerrada || !$('modal-ajuda').hidden) return;
    pausado = sim;
    $('modal-pausa').hidden = !sim;
    $('btn-pausa').textContent = sim ? '▶' : '⏸';
    if (!sim) ultimo = performance.now();
    torcidaFundo(!sim);
  }
  $('btn-pausa').onclick = () => { som('clique'); pausar(!pausado); };
  $('pausa-continuar').onclick = () => { som('clique'); pausar(false); };
  $('pausa-sair').onclick = () => { som('clique'); sair(); };
  $('btn-sair').onclick = () => { som('clique'); pausar(true); };
  $('btn-ajuda').onclick = () => { som('clique'); if (!pausado) explicar(); };
  $('btn-config').onclick = () => {
    som('clique'); if (!partida) return;
    pausado = true;
    $('config-nivel').querySelectorAll('.chip').forEach((c) => c.classList.toggle('ativo', c.dataset.nivel === nivel));
    $('config-torcida').querySelectorAll('.chip').forEach((c) => c.classList.toggle('ativo', (c.dataset.torcida === '1') === pref.torcida));
    $('modal-config').hidden = false;
  };
  chips('config-nivel', 'nivel', (v) => { nivel = v; document.querySelectorAll('#chips-nivel .chip').forEach((c) => c.classList.toggle('ativo', c.dataset.nivel === v)); });
  chips('config-torcida', 'torcida', (v) => { pref.torcida = v === '1'; guardar(CHAVE_PREF, pref); });
  $('config-ok').onclick = () => { som('clique'); $('modal-config').hidden = true; pausado = false; ultimo = performance.now(); torcidaFundo(true); };

  // ligação, troca de app ou tela bloqueada: pausa
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && partida && !partida.encerrada && $('tela-jogo').classList.contains('ativa') && !pausado) pausar(true);
  });

  function sair() {
    if (partida) partida.encerrada = true;
    cancelAnimationFrame(quadro);
    torcidaFundo(false);
    $('modal-pausa').hidden = true;
    pausado = false;
    $('btn-pausa').textContent = '⏸';
    telaModo();
  }

  // ---------- Fim ----------
  function fimDaPartida() {
    const p = partida;
    p.encerrada = true;
    torcidaFundo(false);
    dica('');
    const pontos = p.a, total = p.total, taxa = pontos / total;
    const estrelas = taxa >= 0.8 ? 3 : taxa >= 0.6 ? 2 : taxa >= 0.3 ? 1 : 0;
    $('fim-titulo').textContent = estrelas >= 2 ? `Mandou bem, ${jogador}!` : `Boa tentativa, ${jogador}!`;
    $('fim-placar').textContent = modo === 'goleiro' ? `${pontos} defesa${pontos === 1 ? '' : 's'} em ${total}` : `${pontos} gol${pontos === 1 ? '' : 's'} em ${total}`;
    $('fim-estrelas').textContent = '⭐'.repeat(estrelas) + '☆'.repeat(3 - estrelas);
    $('fim-texto').textContent = modo === 'goleiro'
      ? (estrelas === 3 ? 'Paredão! O Orelha fechou o gol! 🧤' : 'Observe o pé do atacante e pule na hora do chute!')
      : (estrelas === 3 ? 'Artilheiro! Que pontaria! ⚽' : 'Tente os cantos e use a curva para enganar o goleiro!');
    const chave = `${CHAVE_RECORDE}${modo}:${total}`;
    const rec = ler(chave, 0);
    if (pontos > rec) { guardar(chave, pontos); $('fim-recorde').textContent = `🏆 Novo recorde: ${pontos} de ${total}!`; }
    else $('fim-recorde').textContent = `🏆 Recorde: ${rec} de ${total}`;
    const el = $('fim-sprite');
    spriteCSS(el, modo === 'goleiro' ? 'orelhaGoleiro' : 'orelhaAtacante', estrelas >= 2 ? 'comemora' : 'triste');
    mostrar('tela-fim');
    if (estrelas >= 2) { som('vitoria'); confete(); } else som('apito');
  }
  function confete() {
    const c = $('confete'); c.innerHTML = '';
    for (let i = 0; i < 34; i++) {
      const s = document.createElement('span');
      s.textContent = sortear(['⚽', '⭐', '🧤', '🎉', '🏆']);
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDuration = 2 + Math.random() * 2.5 + 's';
      s.style.animationDelay = Math.random() * 0.8 + 's';
      c.append(s);
    }
    setTimeout(() => { c.innerHTML = ''; }, 5500);
  }
  $('btn-de-novo').onclick = () => { som('apito'); novaPartida(); };
  $('btn-trocar-modo').onclick = () => { som('clique'); telaModo(); };

  // ---------- Instalar como app ----------
  let pedidoInstalacao = null;
  const rodandoComoApp = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalacao = e; $('btn-instalar').hidden = false; });
  window.addEventListener('appinstalled', () => { pedidoInstalacao = null; $('btn-instalar').hidden = true; });
  if (!rodandoComoApp()) $('btn-instalar').hidden = false;
  $('btn-instalar').onclick = async () => {
    if (pedidoInstalacao) { pedidoInstalacao.prompt(); await pedidoInstalacao.userChoice; pedidoInstalacao = null; return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    alert(ios
      ? 'Para instalar: toque em Compartilhar (quadrado com a seta ⬆) e escolha "Adicionar à Tela de Início".'
      : 'Para instalar: toque no menu ⋮ do navegador e escolha "Instalar app" ou "Adicionar à tela inicial".');
  };

  // atalho para testes
  window.__goleiro = { get partida() { return partida; }, get G() { return G; }, pular, resolver: () => resolver(), fim: () => fimDaPartida(), desenhar: () => { medir(); desenhar(); } };
})();
