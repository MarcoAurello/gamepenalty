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

  // murmúrio da torcida ao fundo durante a partida
  function torcidaFundo(ligar) {
    if (torcidaNo) { try { torcidaNo.stop(); } catch (e) { /* já parou */ } torcidaNo = null; }
    if (!ligar || !pref.som || !pref.torcida || !audio()) return;
    const a = actx;
    const s = a.createBufferSource(); s.buffer = ruido(3); s.loop = true;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = a.createGain(); g.gain.value = 0.035;
    s.connect(f).connect(g).connect(a.destination); s.start(); torcidaNo = s;
  }

  // ---------- Telas ----------
  function mostrar(id) {
    document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
    document.body.classList.toggle('jogando', id === 'tela-jogo');
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

  // ---------- Campo (canvas) ----------
  const cv = $('campo');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, G = null;

  function medir() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    // geometria do campo: gol em cima, cobrador embaixo (vista de cima, como no protótipo)
    const deitado = W > H * 1.15;
    const gw = Math.min(W * (deitado ? 0.42 : 0.72), H * 0.9);
    const gh = gw * 0.34;
    const gTop = H * 0.03 + gh * 0.55;   // espaço em cima para o pulo alto do goleiro e a rede
    const gy = gTop + gh;
    const resto = H - gy;
    G = {
      cx: W / 2, gw, gh, gTop, gy, resto,
      areaW: Math.min(W * 0.96, gw * 2.0), areaH: resto * 0.4,
      pequenaW: gw * 1.3, pequenaH: resto * 0.15,
      penalti: { x: W / 2, y: gy + resto * 0.56 },
      bola: gw * 0.045,
      goleiro: gh * 1.55,     // tamanho do quadro do sprite do goleiro
      atacante: Math.min(resto * 0.46, gw * 0.62),
    };
  }
  window.addEventListener('resize', () => { if ($('tela-jogo').classList.contains('ativa')) medir(); });

  function desenharCampo() {
    const { cx, gw, gh, gTop, gy } = G;
    ctx.fillStyle = '#5f8aa0'; ctx.fillRect(0, 0, W, H);
    // faixas do gramado
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    const faixa = (H - gy) / 6;
    for (let i = 0; i < 7; i += 2) ctx.fillRect(0, gy + i * faixa, W, faixa);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(2, gw * 0.008);
    // linha de fundo, grande área, pequena área, meia-lua e marca do pênalti
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    ctx.strokeRect(cx - G.areaW / 2, gy, G.areaW, G.areaH);
    ctx.strokeRect(cx - G.pequenaW / 2, gy, G.pequenaW, G.pequenaH);
    ctx.beginPath(); ctx.arc(cx, gy + G.areaH, G.areaH * 0.45, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(G.penalti.x, G.penalti.y, Math.max(3, gw * 0.012), 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, H + G.resto * 0.25, G.resto * 0.5, Math.PI, 2 * Math.PI); ctx.stroke();
    // escanteios
    ctx.beginPath(); ctx.arc(0, gy, gw * 0.06, 0, Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W, gy, gw * 0.06, Math.PI / 2, Math.PI); ctx.stroke();
    // fundo do gol (rede)
    const recuo = gh * 0.28;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(cx - gw / 2, gTop - recuo, gw, gh + recuo);
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - gw / 2, gTop - recuo, gw, gh + recuo); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    const malha = gw / 26;
    const rede = estadoRede();
    for (let x = cx - gw / 2; x <= cx + gw / 2 + 1; x += malha) {
      ctx.beginPath();
      for (let y = gTop - recuo; y <= gy; y += malha / 2) {
        const d = rede ? rede.f * Math.exp(-((x - rede.x) ** 2 + (y - rede.y) ** 2) / (2 * (gw * 0.12) ** 2)) : 0;
        y === gTop - recuo ? ctx.moveTo(x, y - d) : ctx.lineTo(x, y - d);
      }
      ctx.stroke();
    }
    for (let y = gTop - recuo; y <= gy; y += malha) {
      ctx.beginPath();
      for (let x = cx - gw / 2; x <= cx + gw / 2 + 1; x += malha / 2) {
        const d = rede ? rede.f * Math.exp(-((x - rede.x) ** 2 + (y - rede.y) ** 2) / (2 * (gw * 0.12) ** 2)) : 0;
        x === cx - gw / 2 ? ctx.moveTo(x, y - d) : ctx.lineTo(x, y - d);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function desenharTraves() {
    const { cx, gw, gh, gTop, gy } = G;
    const t = Math.max(4, gw * 0.022), recuo = gh * 0.28;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#9fb6c6'; ctx.lineWidth = 1.5;
    ctx.fillRect(cx - gw / 2 - t, gTop - t, gw + 2 * t, t);   // travessão
    ctx.fillRect(cx - gw / 2 - t, gTop - t, t, gh + t);       // trave esquerda
    ctx.fillRect(cx + gw / 2, gTop - t, t, gh + t);           // trave direita
    ctx.strokeRect(cx - gw / 2 - t, gTop - t, gw + 2 * t, gh + t);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = t * 0.5;
    ctx.beginPath(); ctx.moveTo(cx - gw / 2 - t / 2, gTop - t); ctx.lineTo(cx - gw / 2 - t / 2 - recuo * 0.4, gTop - recuo); ctx.lineTo(cx + gw / 2 + t / 2 + recuo * 0.4, gTop - recuo); ctx.lineTo(cx + gw / 2 + t / 2, gTop - t); ctx.stroke();
  }

  function sombra(x, y, rx) {
    ctx.fillStyle = 'rgba(10,30,45,.28)';
    ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  }

  // desenha um quadro do sprite com o pé em (x, y)
  function sprite(id, ator, x, y, tam) {
    const p = PERSONAGENS[id], img = IMG[id];
    if (!img.complete || !img.naturalWidth) return;
    const e = p.estados[ator.estado];
    const t = relogio - ator.desde;
    let q = Math.floor(t * e.fps);
    q = e.repete ? q % e.quadros : Math.min(e.quadros - 1, q);
    const dx = x - tam * (PE_DO_QUADRO.x / QUADRO), dy = y - tam * (PE_DO_QUADRO.y / QUADRO);
    ctx.drawImage(img, q * QUADRO, e.linha * QUADRO, QUADRO, QUADRO, dx, dy, tam, tam);
  }

  function desenharBola(x, y, r) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(relogio * (partida && partida.bola.voando ? 12 : 0));
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); i ? ctx.lineTo(Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38) : ctx.moveTo(Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38); }
    ctx.fill();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.2, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  // barreira da falta: três jogadores rivais de mão na frente
  function desenharBarreira(b) {
    const s = G.atacante * 0.36;
    for (let i = -1; i <= 1; i++) {
      const x = b.x + i * s * 0.62, y = b.y;
      sombra(x, y, s * 0.3);
      ctx.fillStyle = '#e53935'; ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(x - s * 0.24, y - s * 0.95, s * 0.48, s * 0.62, s * 0.1); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - s * 0.22, y - s * 0.36, s * 0.44, s * 0.16);
      ctx.fillStyle = '#c98c63'; ctx.beginPath(); ctx.arc(x, y - s * 1.12, s * 0.2, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y - s * 1.2, s * 0.2, Math.PI, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#c98c63'; ctx.beginPath(); ctx.arc(x, y - s * 0.55, s * 0.09, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - s * 0.1, y - s * 0.32); ctx.lineTo(x - s * 0.12, y); ctx.moveTo(x + s * 0.1, y - s * 0.32); ctx.lineTo(x + s * 0.12, y); ctx.stroke();
    }
  }

  // setas em volta do goleiro (guia do modo Goleiro)
  function desenharSetas(x, y) {
    const a = 0.5 + 0.5 * Math.sin(relogio * 5);
    ctx.save(); ctx.globalAlpha = 0.45 + a * 0.4; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const s = G.gh * 0.12;
    const seta = (px, py, ang) => {
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.5); ctx.lineTo(0, 0); ctx.lineTo(-s * 0.5, s * 0.5); ctx.stroke(); ctx.restore();
    };
    const d = G.gw * 0.33;
    seta(x - d, y - G.gh * 0.55, Math.PI + 0.5); seta(x + d, y - G.gh * 0.55, -0.5);
    seta(x - d, y + G.gh * 0.08, Math.PI); seta(x + d, y + G.gh * 0.08, 0);
    seta(x, y + G.gh * 0.28, -Math.PI / 2);
    ctx.restore();
  }

  // ---------- Partida ----------
  let partida = null, relogio = 0, ultimo = 0, pausado = false, quadro = null;

  function novaPartida() {
    partida = {
      n: 0, a: 0, b: 0, total: qtd, encerrada: false,
      goleiro: { id: modo === 'goleiro' ? 'orelhaGoleiro' : 'rivalGoleiro', estado: 'pronto', desde: 0, x: 0, lift: 0, zona: null },
      atacante: { id: modo === 'goleiro' ? 'rivalAtacante' : 'orelhaAtacante', estado: 'pronto', desde: 0, x: 0, y: 0 },
      bola: { x: 0, y: 0, r: 0, voando: false, visivel: true },
      jaExplicou: false,
    };
    $('rotulo-a').textContent = modo === 'goleiro' ? 'DEFESAS' : 'GOLS';
    $('rotulo-b').textContent = modo === 'goleiro' ? 'GOLS SOFRIDOS' : 'DEFESAS';
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
         <li>Quando a bola sair, toque na direção para o Orelha pular: <b>⬅ ↖ ⬆ ↗ ➡</b> (ou as setas do teclado).</li>
         <li>${nivel === 'facil' ? 'No fácil, basta acertar o lado.' : 'No difícil, acerte o lado <b>e</b> a altura (alto ou baixo).'}</li>
         <li>Defenda o máximo que puder! ${partida.total} cobranças.</li></ul>`
      : `<ul><li><b>Desenhe o chute</b> com o dedo ou o mouse: comece na bola e arraste até o gol.</li>
         <li>Faça uma <b>curva</b> para dar efeito e enganar o goleiro.</li>
         <li>Os cantos são mais difíceis de defender, mas cuidado com a trave!</li>
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
      lado: falta ? sortear([-1, 1]) : 0, caminho: [], alvo: null, efeito: 0,
    };
    Object.assign(p.goleiro, { estado: 'pronto', desde: relogio, x: 0, lift: 0, zona: null, inicioMergulho: null });
    Object.assign(p.atacante, { estado: 'pronto', desde: relogio });
    p.bola.voando = false; p.bola.visivel = true; p.rede = null;
    $('controles').classList.add('travado');
    if (modo === 'goleiro') dica(p.n === 1 ? 'Espere o chute e escolha o canto!' : '');
    else dica('Desenhe o chute: arraste da bola até o gol ✍️');
  }

  // posição da bola parada e do cobrador
  function pontoDaBola() {
    const c = partida.cobranca;
    if (!c.falta) return { ...G.penalti };
    return { x: G.cx + c.lado * G.gw * 0.55, y: G.gy + G.resto * 0.64 };
  }

  // ---------- Modo Goleiro: o computador chuta ----------
  function chuteDoComputador() {
    const c = partida.cobranca;
    const zona = sortear(Object.keys(ZONAS));
    const z = ZONAS[zona];
    c.zonaChute = zona;
    c.alvo = { tx: clamp(z.tx + (Math.random() - 0.5) * 0.16, -0.9, 0.9), tz: clamp(z.tz + (Math.random() - 0.5) * 0.14, 0.06, 0.9) };
    c.efeito = c.falta ? -c.lado * 0.22 : (Math.random() - 0.5) * 0.06;
    lancarBola(c.falta ? NIVEIS[nivel].vooFalta : NIVEIS[nivel].voo);
    $('controles').classList.remove('travado');
    dica(partida.n === 1 ? 'AGORA! Escolha o canto!' : '');
  }

  function pular(zona) {
    const p = partida;
    if (!p || modo !== 'goleiro' || pausado) return;
    const c = p.cobranca;
    if (!c || c.zonaJogador) return;
    if (c.fase !== 'voo') { if (c.fase === 'preparar' || c.fase === 'corrida') dica('Calma! Espere a bola sair do pé ⚽'); return; }
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
    estado(gol, zona === 'centro' ? (partida.cobranca.alvo && partida.cobranca.alvo.tz > 0.55 ? 'pulo' : 'defesa') : zona);
    if (zona === 'centro' && gol.estado === 'defesa') gol.estado = 'pronto';   // o encaixe só aparece quando pega a bola
    gol.destinoX = z.tx * G.gw / 2 * 0.62;
    gol.destinoLift = z.alto ? G.gh * 0.1 : 0;
  }

  // ---------- Modo Jogador: desenhar o chute ----------
  let desenhando = false;
  const ponto = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', (e) => {
    const p = partida;
    if (!p || modo !== 'jogador' || pausado || p.cobranca.fase !== 'preparar') return;
    const b = pontoDaBola(), q = ponto(e);
    if (Math.hypot(q.x - b.x, q.y - b.y) > G.bola * 4 + 30) { dica('Comece o traço em cima da bola ⚽'); return; }
    desenhando = true;
    p.cobranca.caminho = [b, q];
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
    if (cam.length < 4 || ini.y - fim.y < G.resto * 0.25) { c.caminho = []; dica('Arraste até o gol, para cima ⬆'); return; }
    prepararChuteDesenhado(c);
  };
  cv.addEventListener('pointerup', soltar);
  cv.addEventListener('pointercancel', soltar);

  function prepararChuteDesenhado(c) {
    const cam = c.caminho, ini = cam[0];
    let fim = cam[cam.length - 1];
    // se o traço parou antes do gol, segue a direção final até a linha do gol (chute rasteiro)
    if (fim.y > G.gy - G.gh * 0.1) {
      const k = Math.max(0, cam.length - 1 - Math.max(2, Math.floor(cam.length * 0.3)));
      const a = cam[k], dx = fim.x - a.x, dy = fim.y - a.y;
      const yAlvo = G.gy - G.gh * 0.2;
      if (dy < -1) { const s = (yAlvo - fim.y) / dy; fim = { x: fim.x + dx * s, y: yAlvo }; cam.push(fim); }
      else { fim = { x: fim.x, y: yAlvo }; cam.push(fim); }
    }
    const tx = (fim.x - G.cx) / (G.gw / 2);
    const tz = (G.gy - fim.y) / G.gh;
    // efeito: quanto o traço se afasta da linha reta (curva)
    const L = Math.hypot(fim.x - ini.x, fim.y - ini.y) || 1;
    let maior = 0;
    for (const q of cam) {
      const d = ((fim.x - ini.x) * (ini.y - q.y) - (ini.x - q.x) * (fim.y - ini.y)) / L;
      if (Math.abs(d) > Math.abs(maior)) maior = d;
    }
    c.efeito = clamp(maior / L, -0.6, 0.6);
    c.alvo = { tx, tz };
    c.fase = 'corrida'; c.desde = relogio;
    estado(partida.atacante, 'corrida');
    dica('');
  }

  function resultadoDoAlvo(alvo) {
    const ax = Math.abs(alvo.tx);
    if (alvo.tz > 1.1 || ax > 1.12 || alvo.tz < -0.2) return 'fora';
    if ((ax > 0.93 && ax <= 1.12 && alvo.tz <= 1.06) || (alvo.tz > 0.93 && alvo.tz <= 1.1 && ax <= 1.06)) return 'trave';
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

  // ---------- Voo da bola ----------
  function lancarBola(voo) {
    const c = partida.cobranca, b = pontoDaBola();
    c.fase = 'voo'; c.inicioVoo = relogio; c.voo = voo;
    const T = { x: G.cx + c.alvo.tx * G.gw / 2, y: G.gy - c.alvo.tz * G.gh };
    c.T = T; c.S = b;
    if (!c.caminho || c.caminho.length < 2) {
      // trajetória do computador: curva suave (com efeito na falta)
      const pts = [];
      const C = { x: (b.x + T.x) / 2 + c.efeito * G.gw, y: (b.y + T.y) / 2 - (b.y - T.y) * 0.08 };
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        pts.push({ x: (1 - t) ** 2 * b.x + 2 * (1 - t) * t * C.x + t * t * T.x, y: (1 - t) ** 2 * b.y + 2 * (1 - t) * t * C.y + t * t * T.y });
      }
      c.rota = pts;
    } else {
      c.rota = c.caminho.slice();
    }
    // comprimento acumulado para andar pela rota com velocidade constante
    c.acum = [0];
    for (let i = 1; i < c.rota.length; i++) c.acum.push(c.acum[i - 1] + Math.hypot(c.rota[i].x - c.rota[i - 1].x, c.rota[i].y - c.rota[i - 1].y));
    partida.bola.voando = true;
    som('chute');
  }
  function pontoNaRota(c, f) {
    const total = c.acum[c.acum.length - 1], alvo = f * total;
    let i = 1;
    while (i < c.acum.length - 1 && c.acum[i] < alvo) i++;
    const a = c.rota[i - 1], b = c.rota[i], seg = (c.acum[i] - c.acum[i - 1]) || 1;
    const t = clamp((alvo - c.acum[i - 1]) / seg, 0, 1);
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
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
    b.saida = { x: b.x, y: b.y, t0: relogio };
    if (c.resultado === 'gol') {
      p.rede = { x: b.x, y: b.y, t0: relogio };
      som('rede'); som('torcida', 1.2);
      avisar(sortear(FRASES.gol));
      estado(p.atacante, 'comemora');
      setTimeout(() => partida === p && estado(p.goleiro, 'triste'), 450);
      if (modo === 'goleiro') p.b++; else p.a++;
    } else if (c.resultado === 'defesa') {
      som('defesa'); som('torcida', 0.9);
      avisar(sortear(FRASES.defesa));
      if (p.goleiro.zona === 'centro' || !p.goleiro.zona) { estado(p.goleiro, 'defesa'); b.visivel = false; }
      else b.rebote = { vx: (ZONAS[p.goleiro.zona].lado || 1) * G.gw * 0.9, vy: -G.gh * 1.6 };
      estado(p.atacante, 'triste');
      setTimeout(() => partida === p && p.goleiro.estado !== 'defesa' && estado(p.goleiro, 'comemora'), 700);
      if (modo === 'goleiro') p.a++; else p.b++;
    } else {
      som(c.resultado === 'trave' ? 'trave' : 'uhh');
      avisar(sortear(FRASES[c.resultado]));
      b.rebote = c.resultado === 'trave' ? { vx: -Math.sign(c.alvo.tx || 1) * G.gw * 0.4, vy: G.gh * 1.4 } : { vx: Math.sign(c.alvo.tx || 1) * G.gw * 0.3, vy: -G.gh * 0.8 };
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
    if (t > 1.2) return { x: r.x, y: r.y, f: G.gh * 0.05 };
    return { x: r.x, y: r.y, f: G.gh * 0.22 * Math.exp(-t * 3) * Math.cos(t * 14) + G.gh * 0.05 };
  }

  // ---------- Laço principal ----------
  function atualizar(dt) {
    const p = partida, c = p.cobranca;
    if (!c) return;
    const t = relogio - c.desde;
    const b = pontoDaBola();
    const at = p.atacante;
    // posições do cobrador: parado atrás da bola e um pouco à esquerda (chuta de direita)
    const parado = { x: b.x - G.atacante * 0.16, y: b.y + G.atacante * 0.14 };
    const recuado = { x: b.x - G.atacante * 0.5, y: b.y + G.atacante * 0.42 };

    if (c.fase === 'preparar') {
      at.x = recuado.x; at.y = recuado.y;
      if (modo === 'goleiro' && t > 1.1) { c.fase = 'corrida'; c.desde = relogio; estado(at, 'corrida'); }
    } else if (c.fase === 'corrida') {
      const dur = modo === 'goleiro' ? 0.9 : 0.55;
      const f = clamp(t / dur, 0, 1);
      at.x = lerp(recuado.x, parado.x, f); at.y = lerp(recuado.y, parado.y, f);
      if (f >= 1) { c.fase = 'chute'; c.desde = relogio; estado(at, 'chute'); }
    } else if (c.fase === 'chute') {
      if (t >= 0.12) {
        if (modo === 'goleiro') chuteDoComputador();
        else {
          lancarBola(clamp(0.75 + Math.hypot(c.caminho[c.caminho.length - 1].x - b.x, c.caminho[c.caminho.length - 1].y - b.y) / (G.resto * 2.2), 0.75, 1.3) * (nivel === 'dificil' ? 0.9 : 1));
          // goleiro do computador reage depois de um instante
          const zona = escolhaDoGoleiro(c);
          const reacao = (nivel === 'dificil' ? 0.12 : 0.22) * c.voo;
          setTimeout(() => { if (partida === p && p.cobranca === c && c.fase === 'voo') mergulhar(p.goleiro, zona); }, reacao * 1000);
        }
      }
    } else if (c.fase === 'voo') {
      const f = clamp((relogio - c.inicioVoo) / c.voo, 0, 1);
      const q = pontoNaRota(c, f);
      p.bola.x = q.x; p.bola.y = q.y;
      p.bola.r = G.bola * lerp(1, 0.62, f);
      // altura da bola para a sombra: cresce ao longo do voo até a altura do alvo
      p.bola.sombra = { x: lerp(c.S.x, c.T.x, f), y: lerp(c.S.y, G.gy + G.gh * 0.04, f) };
      if (f >= 1) resolver();
    } else if (c.fase === 'resultado') {
      const bo = p.bola;
      const tt = relogio - bo.saida.t0;
      if (c.resultado === 'gol') {
        const g = clamp(tt / 0.35, 0, 1);
        bo.y = lerp(bo.saida.y, Math.max(G.gTop - G.gh * 0.15, bo.saida.y - G.gh * 0.3), easeOut(g));
        bo.r = G.bola * lerp(0.62, 0.52, g);
      } else if (bo.rebote) {
        bo.x = bo.saida.x + bo.rebote.vx * tt;
        bo.y = bo.saida.y + bo.rebote.vy * tt + (c.resultado === 'trave' ? 0 : G.gh * 2.4 * tt * tt);
      }
      if (t > 2.3) proximaCobranca();
    }

    // goleiro: desliza até o canto escolhido durante o mergulho
    const gl = p.goleiro;
    if (gl.inicioMergulho != null) {
      const f = easeOut(clamp((relogio - gl.inicioMergulho) / 0.3, 0, 1));
      gl.x = lerp(0, gl.destinoX, f);
      gl.lift = lerp(0, gl.destinoLift, f) * (1 - clamp((relogio - gl.inicioMergulho - 0.55) / 0.5, 0, 1) * 0.6);
    } else { gl.x = 0; gl.lift = 0; }
    if (gl.estado === 'defesa') { gl.x = lerp(gl.x, 0, 0.1); }
  }

  function desenhar() {
    const p = partida, c = p.cobranca;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    desenharCampo();
    // goleiro
    const gl = p.goleiro, gx = G.cx + gl.x, gyPe = G.gy + G.gh * 0.03 - gl.lift;
    sombra(G.cx + gl.x, G.gy + G.gh * 0.05, G.goleiro * 0.16);
    sprite(gl.id, gl, gx, gyPe, G.goleiro);
    if (modo === 'goleiro' && c && (c.fase === 'preparar' || c.fase === 'corrida' || (c.fase === 'voo' && !c.zonaJogador))) desenharSetas(G.cx, G.gy - G.gh * 0.35);
    desenharTraves();
    if (!c) return;
    // bola e cobrador (a bola fica na frente quando está voando para o gol)
    const b = pontoDaBola();
    if (c.falta) desenharBarreira({ x: lerp(b.x, G.cx, 0.45), y: lerp(b.y, G.gy, 0.42) });
    const at = p.atacante;
    sombra(at.x, at.y, G.atacante * 0.13);
    sprite(at.id, at, at.x, at.y, G.atacante);
    const bo = p.bola;
    if (c.fase === 'preparar' || c.fase === 'corrida' || c.fase === 'chute') {
      bo.x = b.x; bo.y = b.y; bo.r = G.bola;
      sombra(b.x, b.y + G.bola * 0.8, G.bola);
      desenharBola(b.x, b.y, G.bola);
    } else if (bo.visivel) {
      if (bo.sombra && c.fase === 'voo') sombra(bo.sombra.x, bo.sombra.y, bo.r);
      desenharBola(bo.x, bo.y, bo.r);
    }
    // traço do chute (modo Jogador)
    if (modo === 'jogador' && c.caminho && c.caminho.length > 1 && (c.fase === 'preparar' || c.fase === 'corrida' || c.fase === 'chute')) {
      ctx.save(); ctx.strokeStyle = 'rgba(190,255,250,.95)'; ctx.lineWidth = 4; ctx.setLineDash([12, 10]); ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(120,255,240,.8)'; ctx.shadowBlur = 10;
      ctx.beginPath(); c.caminho.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
      ctx.restore();
    }
    // guia de trajetória pontilhada antes do primeiro chute (como no protótipo)
    if (modo === 'jogador' && c.fase === 'preparar' && (!c.caminho || c.caminho.length < 2) && p.n <= 2) {
      ctx.save(); ctx.globalAlpha = 0.45 + 0.35 * Math.sin(relogio * 4);
      ctx.strokeStyle = '#bff8f2'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]);
      [-1, 1].forEach((l) => {
        ctx.beginPath(); ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(b.x + l * G.gw * 0.5, (b.y + G.gy) / 2, G.cx + l * G.gw * 0.38, G.gy - G.gh * 0.7); ctx.stroke();
      });
      const k = (relogio % 2) / 2;
      ctx.globalAlpha = 1; ctx.setLineDash([]);
      ctx.font = `${Math.round(G.bola * 2.4)}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('👆', lerp(b.x, G.cx + G.gw * 0.3, k), lerp(b.y + G.bola * 2, G.gy - G.gh * 0.5, k));
      ctx.restore();
    }
  }

  function laco(agora) {
    const dt = Math.min(0.05, (agora - ultimo) / 1000);
    ultimo = agora;
    if (!pausado && partida && !partida.encerrada) { relogio += dt; atualizar(dt); }
    if (partida && G) desenhar();
    if (partida && !partida.encerrada) quadro = requestAnimationFrame(laco);
  }

  // ---------- Painel lateral ----------
  function atualizarSom() {
    $('btn-som').setAttribute('aria-pressed', String(pref.som));
    $('btn-som').setAttribute('aria-label', pref.som ? 'Som ligado' : 'Som desligado');
  }
  $('btn-som').onclick = () => { pref.som = !pref.som; guardar(CHAVE_PREF, pref); atualizarSom(); torcidaFundo(pref.som && !!partida); som('clique'); };
  atualizarSom();
  function pausar(sim) {
    if (!partida || partida.encerrada || !$('modal-ajuda').hidden) return;
    pausado = sim;
    $('modal-pausa').hidden = !sim;
    $('btn-pausa').querySelector('.ic').textContent = sim ? '▶' : '⏸';
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
    $('btn-pausa').querySelector('.ic').textContent = '⏸';
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
