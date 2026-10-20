/* Goleiro Orelha — desenho vetorial dos personagens (estilo figurinha, contorno grosso).
   Usado por ferramentas/sprites.html para gerar as folhas de sprites de cada personagem.
   Ângulos em graus no referencial do corpo: 0 = para baixo, 90 = para a direita da tela, 180 = para cima.
   © Marco Nunes — Todos os direitos reservados. */
const Boneco = (() => {
  const RAD = Math.PI / 180;
  const dir = (a, l) => [Math.sin(a * RAD) * l, Math.cos(a * RAD) * l];
  const CONTORNO = '#1a1410';

  // ---------- estilos (cores e traços de cada personagem) ----------
  const ESTILOS = {
    orelha: {
      pele: '#a86b45', peleSombra: '#8a5232', orelhaDentro: '#c4825c',
      cabelo: '#1f140d', cabeloBrilho: '#3a271b', olhos: '#2b1a10',
      camisa: '#38a8ef', camisaSombra: '#2387cf', detalhe: '#16213d', calcao: '#2f97e0',
      meia: '#2f97e0', joelheira: '#151515', chuteira: '#111', chuteiraFaixa: '#e8e8e8',
      luva: '#f4f8ff', luvaDetalhe: '#2f7fd6', numero: '1', nome: 'ORELHA',
      orelhaTam: 1.45,   // orelhas de abano: o charme do Orelha
      cabeloTipo: 'ondulado', rosto: 'fino', goleiro: true,
    },
    orelhaAtacante: null,   // preenchido abaixo (mesmo menino, camisa 10 e sem luvas)
    rivalGoleiro: {
      pele: '#e8b48f', peleSombra: '#c98f6b', orelhaDentro: '#f0c3a2',
      cabelo: '#7a4a24', cabeloBrilho: '#9a6436', olhos: '#3a2a1a',
      camisa: '#ff8a1f', camisaSombra: '#e06d08', detalhe: '#3b2a1a', calcao: '#2f3540',
      meia: '#ff8a1f', joelheira: '#2f3540', chuteira: '#222', chuteiraFaixa: '#ff8a1f',
      luva: '#ff9f3f', luvaDetalhe: '#2f3540', numero: '1', nome: 'RIVAL',
      orelhaTam: 0.95, cabeloTipo: 'liso', rosto: 'redondo', goleiro: true,
    },
    rivalAtacante: {
      pele: '#c98c63', peleSombra: '#a9704b', orelhaDentro: '#dca07a',
      cabelo: '#111', cabeloBrilho: '#2a2a2a', olhos: '#1f1a14',
      camisa: '#e53935', camisaSombra: '#c62828', detalhe: '#ffffff', calcao: '#ffffff',
      meia: '#e53935', joelheira: '#e53935', chuteira: '#111', chuteiraFaixa: '#ffd54f',
      luva: null, luvaDetalhe: null, numero: '9', nome: 'RIVAL',
      orelhaTam: 0.95, cabeloTipo: 'raspado', rosto: 'redondo', goleiro: false,
    },
  };
  ESTILOS.orelhaAtacante = { ...ESTILOS.orelha, luva: null, numero: '10', goleiro: false };

  // ---------- primitivas ----------
  function osso(ctx, x1, y1, x2, y2, w, cor) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = CONTORNO; ctx.lineWidth = w + 7;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = cor; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function forma(ctx, cor, desenhar, linha = 3.5) {
    ctx.beginPath(); desenhar(); ctx.closePath();
    ctx.fillStyle = cor; ctx.fill();
    ctx.lineWidth = linha; ctx.strokeStyle = CONTORNO; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function elipse(ctx, x, y, rx, ry, rot, cor, linha = 3.5) {
    forma(ctx, cor, () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2), linha);
  }

  function bola(ctx, x, y, r) {
    elipse(ctx, x, y, r, r, 0, '#ffffff', 3);
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); const px = x + Math.cos(a) * r * 0.36, py = y + Math.sin(a) * r * 0.36; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.88, y + Math.sin(a) * r * 0.88, r * 0.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // luva de goleiro (aberta) ou mão
  function mao(ctx, x, y, ang, e, grande = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-ang * RAD);
    if (e.luva) {
      const s = 1.15 * grande;
      // dedos
      for (let i = -1.5; i <= 1.5; i++) osso(ctx, i * 5.5 * s, 4 * s, i * 6.5 * s, 17 * s, 6 * s, e.luva);
      osso(ctx, -9 * s, 0, -16 * s, 7 * s, 6 * s, e.luva);   // polegar
      elipse(ctx, 0, 2 * s, 12 * s, 11 * s, 0, e.luva);
      forma(ctx, e.luvaDetalhe, () => ctx.roundRect(-11 * s, -9 * s, 22 * s, 7 * s, 3), 2.5);   // punho
    } else {
      elipse(ctx, 0, 3, 8, 8.5, 0, e.pele, 3);
    }
    ctx.restore();
  }

  function chuteira(ctx, x, y, ang, lado, e) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-ang * RAD);
    forma(ctx, e.chuteira, () => ctx.roundRect(lado < 0 ? -20 : -6, -3, 26, 13, 6), 3);
    ctx.fillStyle = e.chuteiraFaixa; ctx.fillRect(lado < 0 ? -12 : -1, 0, 10, 3);
    ctx.restore();
  }

  // ---------- cabeça ----------
  function orelha(ctx, x, y, lado, e) {
    const t = e.orelhaTam;
    ctx.save(); ctx.translate(x, y); ctx.rotate(lado * -0.18);
    // orelha de abano: sai da lateral da cabeça e abre bem para fora (formato de "C"), com lóbulo
    forma(ctx, e.pele, () => {
      ctx.moveTo(0, -13 * t);
      ctx.bezierCurveTo(lado * 9 * t, -23 * t, lado * 27 * t, -19 * t, lado * 26 * t, -2 * t);
      ctx.bezierCurveTo(lado * 25 * t, 11 * t, lado * 15 * t, 21 * t, lado * 6 * t, 18 * t);
      ctx.bezierCurveTo(lado * 1 * t, 16 * t, 0, 12 * t, 0, 8 * t);
    }, 3.5);
    // concha interna
    ctx.fillStyle = e.orelhaDentro;
    ctx.beginPath();
    ctx.moveTo(lado * 4 * t, -9 * t);
    ctx.bezierCurveTo(lado * 11 * t, -16 * t, lado * 22 * t, -12 * t, lado * 20 * t, -1 * t);
    ctx.bezierCurveTo(lado * 19 * t, 8 * t, lado * 12 * t, 13 * t, lado * 8 * t, 11 * t);
    ctx.bezierCurveTo(lado * 6 * t, 4 * t, lado * 7 * t, -3 * t, lado * 4 * t, -9 * t);
    ctx.fill();
    // dobra da borda (hélice) e o buraquinho
    ctx.strokeStyle = e.peleSombra; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lado * 7 * t, -12 * t); ctx.bezierCurveTo(lado * 18 * t, -15 * t, lado * 23 * t, -6 * t, lado * 21 * t, 3 * t); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lado * 9 * t, 2 * t); ctx.quadraticCurveTo(lado * 13 * t, -2 * t, lado * 14 * t, 5 * t); ctx.stroke();
    // brilho na borda
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lado * 12 * t, -18 * t); ctx.quadraticCurveTo(lado * 22 * t, -16 * t, lado * 24 * t, -6 * t); ctx.stroke();
    ctx.restore();
  }

  function cabelo(ctx, e, costas) {
    ctx.fillStyle = e.cabelo; ctx.strokeStyle = CONTORNO; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (costas) {
      // nuca: o cabelo cobre quase toda a parte de trás
      ctx.ellipse(0, -10, 39, 37, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = e.cabeloBrilho; ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 11, -38); ctx.quadraticCurveTo(i * 13 + 4, -18, i * 12, 2); ctx.stroke(); }
      return;
    }
    if (e.cabeloTipo === 'raspado') {
      ctx.ellipse(0, -8, 39, 36, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.lineTo(28, -14); ctx.quadraticCurveTo(0, -24, -28, -14);
      ctx.closePath(); ctx.fill(); ctx.stroke(); return;
    }
    // topo com volume e franja ondulada caindo na testa (como na foto do Orelha)
    ctx.moveTo(-37, -2);
    ctx.bezierCurveTo(-44, -38, -24, -56, 2, -55);
    ctx.bezierCurveTo(28, -56, 46, -38, 38, -2);
    ctx.lineTo(34, -6);
    if (e.cabeloTipo === 'ondulado') {
      ctx.quadraticCurveTo(30, -20, 22, -16);
      ctx.quadraticCurveTo(17, -27, 8, -19);
      ctx.quadraticCurveTo(1, -29, -7, -19);
      ctx.quadraticCurveTo(-15, -28, -21, -16);
      ctx.quadraticCurveTo(-30, -21, -33, -6);
    } else {
      ctx.quadraticCurveTo(10, -30, -20, -18);
      ctx.quadraticCurveTo(-30, -16, -33, -6);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // brilho e cachinhos no topo
    ctx.strokeStyle = e.cabeloBrilho; ctx.lineWidth = 3; ctx.lineCap = 'round';
    [[-18, -42], [-4, -47], [11, -46], [24, -38]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke(); });
  }

  function rosto(ctx, e, expr, olhar = [0, 0]) {
    const [ox, oy] = olhar;
    // sobrancelhas grossas
    const sob = { foco: [9, -2], feliz: [-3, 0], grito: [8, -3], triste: [-10, 2], serio: [4, 0] }[expr] || [0, 0];
    ctx.strokeStyle = e.cabelo; ctx.lineWidth = 5.5; ctx.lineCap = 'round';
    [-1, 1].forEach((l) => {
      ctx.beginPath();
      ctx.moveTo(l * 22, -13 + (expr === 'triste' ? 4 : 0) + sob[1]);
      ctx.lineTo(l * 7, -12 + sob[0] * 0.45 + sob[1]);
      ctx.stroke();
    });
    // olhos
    [-1, 1].forEach((l) => {
      const x = l * 14;
      if (expr === 'feliz') {
        ctx.strokeStyle = e.olhos; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, 0, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        return;
      }
      const ry = expr === 'grito' ? 7.5 : 6.5;
      elipse(ctx, x, -1, 7.5, ry, 0, '#ffffff', 2.5);
      ctx.fillStyle = e.olhos; ctx.beginPath(); ctx.arc(x + ox * 2.5, -0.5 + oy * 2, 4.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + ox * 2.5 + 1.6, -2.2 + oy * 2, 1.4, 0, Math.PI * 2); ctx.fill();
      // pálpebra de cima meio baixa: olhar calmo e sério, como na foto
      if (expr !== 'grito') {
        ctx.save(); ctx.beginPath(); ctx.ellipse(x, -1, 7.5, ry, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = e.pele; ctx.fillRect(x - 9, -1 - ry - 1, 18, ry * (expr === 'triste' ? 0.85 : 0.7));
        ctx.restore();
      }
      ctx.strokeStyle = CONTORNO; ctx.lineWidth = 2.8;
      const alt = expr === 'grito' ? -1 - ry : -1 - ry * 0.3;
      ctx.beginPath(); ctx.moveTo(x - 8, alt + 1); ctx.quadraticCurveTo(x, alt - 1.5, x + 8, alt + 1); ctx.stroke();
    });
    // nariz
    ctx.strokeStyle = e.peleSombra; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-1, 6); ctx.quadraticCurveTo(-5, 13, 0, 14); ctx.quadraticCurveTo(4, 14, 5, 12); ctx.stroke();
    // boca
    ctx.lineWidth = 3.2; ctx.strokeStyle = '#5a2a1a';
    if (expr === 'feliz') {
      forma(ctx, '#7a2e22', () => { ctx.moveTo(-12, 20); ctx.quadraticCurveTo(0, 36, 12, 20); ctx.quadraticCurveTo(0, 24, -12, 20); }, 2.5);
      ctx.fillStyle = '#fff'; ctx.fillRect(-8, 20.5, 16, 3.5);
    } else if (expr === 'grito') {
      elipse(ctx, 0, 24, 7, 8, 0, '#7a2e22', 2.5);
    } else if (expr === 'triste') {
      ctx.beginPath(); ctx.moveTo(-8, 26); ctx.quadraticCurveTo(0, 19, 8, 26); ctx.stroke();
    } else {
      // lábios cheios, boca fechada e concentrada
      ctx.beginPath(); ctx.moveTo(-9, 22); ctx.quadraticCurveTo(0, 25, 9, 22); ctx.stroke();
      ctx.strokeStyle = e.peleSombra; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-5, 27); ctx.quadraticCurveTo(0, 29, 5, 27); ctx.stroke();
    }
  }

  function cabeca(ctx, e, p, costas) {
    ctx.save();
    ctx.translate(0, -108);
    ctx.rotate((p.cab || 0) * RAD);
    // pescoço
    forma(ctx, e.pele, () => ctx.roundRect(-9, 26, 18, 22, 5), 3);
    // orelhas atrás do rosto
    orelha(ctx, -35, -4, -1, e);
    orelha(ctx, 35, -4, 1, e);
    // rosto: mais fino e com o queixo alongado no Orelha
    const fino = e.rosto === 'fino';
    forma(ctx, e.pele, () => {
      ctx.moveTo(0, -46);
      ctx.bezierCurveTo(30, -46, 39, -22, 37, 4);
      ctx.bezierCurveTo(fino ? 34 : 37, 26, fino ? 18 : 22, 40, 0, fino ? 42 : 39);
      ctx.bezierCurveTo(fino ? -18 : -22, 40, fino ? -34 : -37, 26, -37, 4);
      ctx.bezierCurveTo(-39, -22, -30, -46, 0, -46);
    }, 3.8);
    if (!costas) {
      // bochechas
      ctx.fillStyle = 'rgba(200,90,70,.18)';
      ctx.beginPath(); ctx.arc(-22, 13, 7, 0, 7); ctx.arc(22, 13, 7, 0, 7); ctx.fill();
      rosto(ctx, e, p.rosto || 'foco', p.olhar);
    }
    cabelo(ctx, e, costas);
    ctx.restore();
  }

  // ---------- corpo ----------
  function camisa(ctx, e, costas) {
    forma(ctx, e.camisa, () => {
      ctx.moveTo(-33, -60); ctx.quadraticCurveTo(0, -66, 33, -60);
      ctx.lineTo(27, -6); ctx.quadraticCurveTo(0, 2, -27, -6);
    }, 3.8);
    // painéis escuros nos ombros (como a camisa da foto)
    ctx.fillStyle = e.detalhe;
    ctx.beginPath(); ctx.moveTo(-33, -60); ctx.quadraticCurveTo(-18, -63, -14, -61); ctx.lineTo(-30, -40); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(33, -60); ctx.quadraticCurveTo(18, -63, 14, -61); ctx.lineTo(30, -40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = e.camisaSombra; ctx.fillRect(-27, -14, 54, 6);
    if (costas) {
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = '900 11px Arial'; ctx.fillText(e.nome, 0, -44);
      ctx.font = '900 30px Arial'; ctx.lineWidth = 3; ctx.strokeStyle = e.detalhe;
      ctx.strokeText(e.numero, 0, -16); ctx.fillText(e.numero, 0, -16);
    } else {
      // gola V e escudo
      forma(ctx, e.detalhe, () => { ctx.moveTo(-10, -62); ctx.lineTo(0, -50); ctx.lineTo(10, -62); }, 2.5);
      forma(ctx, '#ffd54f', () => { ctx.moveTo(10, -50); ctx.lineTo(22, -50); ctx.lineTo(22, -42); ctx.quadraticCurveTo(16, -34, 10, -42); }, 2);
      ctx.fillStyle = '#1e5bb8'; ctx.fillRect(13, -48, 6, 5);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '900 9px Arial'; ctx.textAlign = 'center';
      ctx.fillText(e.goleiro ? 'GOLEIRO' : 'ORELHA', 0, -24);
    }
  }

  function calcao(ctx, e) {
    forma(ctx, e.calcao, () => { ctx.moveTo(-28, -8); ctx.lineTo(28, -8); ctx.lineTo(31, 16); ctx.lineTo(3, 18); ctx.lineTo(0, 9); ctx.lineTo(-3, 18); ctx.lineTo(-31, 16); }, 3.5);
  }

  function braco(ctx, e, lado, b, a) {
    const ox = lado * 30, oy = -56;
    const [ex, ey] = dir(b, 28); const [mx, my] = dir(a, 26);
    osso(ctx, ox, oy, ox + ex, oy + ey, 15, e.camisa);           // manga
    osso(ctx, ox + ex, oy + ey, ox + ex + mx, oy + ey + my, 13, e.goleiro ? e.camisa : e.pele);
    if (e.goleiro) {   // punho escuro da manga longa
      const px = ox + ex + mx * 0.78, py = oy + ey + my * 0.78;
      osso(ctx, px, py, ox + ex + mx * 0.9, oy + ey + my * 0.9, 13, e.detalhe);
    }
    mao(ctx, ox + ex + mx, oy + ey + my, a, e);
  }

  function perna(ctx, e, lado, c, j) {
    const ox = lado * 14, oy = 8;
    const [kx, ky] = dir(c, 32); const [sx, sy] = dir(j, 32);
    osso(ctx, ox, oy, ox + kx, oy + ky, 18, e.calcao);
    osso(ctx, ox + kx * 0.55, oy + ky * 0.55, ox + kx, oy + ky, 15, e.pele);
    osso(ctx, ox + kx, oy + ky, ox + kx + sx, oy + ky + sy, 15, e.meia);
    elipse(ctx, ox + kx, oy + ky, 9.5, 8.5, 0, e.joelheira, 3);    // joelheira preta, como na foto
    chuteira(ctx, ox + kx + sx, oy + ky + sy, j, lado, e);
  }

  // desenha o personagem com a pose p, centrado no quadril (0,0)
  function desenhar(ctx, estiloNome, p) {
    const e = ESTILOS[estiloNome];
    const costas = !!p.costas;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rot || 0) * RAD);
    if (p.espelho) ctx.scale(-1, 1);
    const L = p;
    perna(ctx, e, -1, L.cE ?? -12, L.pE ?? -4);
    perna(ctx, e, 1, L.cD ?? 12, L.pD ?? 4);
    calcao(ctx, e);
    if (costas) cabeca(ctx, e, p, true);
    camisa(ctx, e, costas);
    braco(ctx, e, -1, L.bE ?? -20, L.aE ?? -10);
    braco(ctx, e, 1, L.bD ?? 20, L.aD ?? 10);
    if (!costas) cabeca(ctx, e, p, false);
    if (p.bola) bola(ctx, p.bola[0], p.bola[1], 15);
    ctx.restore();
  }

  return { desenhar, bola, ESTILOS };
})();
