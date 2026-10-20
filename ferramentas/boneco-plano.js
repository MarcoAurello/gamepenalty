/* Goleiro Orelha — personagens no estilo vetorial "flat" (proporções reais, cores chapadas, sem contorno),
   como na referência de sprites de goleiro. Usa as cores de Boneco.ESTILOS e as mesmas poses (ângulos).
   0 = para baixo, 90 = para a direita da tela, 180 = para cima. © Marco Nunes — Todos os direitos reservados. */
const BonecoPlano = (() => {
  const RAD = Math.PI / 180;
  const dir = (a, l) => [Math.sin(a * RAD) * l, Math.cos(a * RAD) * l];
  const EXTRA = {
    orelha: { luva: '#7d8794', luvaClaro: '#9aa4b1', chuteira: '#151515', meia: '#2f97e0', sombraCamisa: '#2b8fd6' },
    orelhaAtacante: { chuteira: '#151515', meia: '#2f97e0', sombraCamisa: '#2b8fd6' },
    rivalGoleiro: { luva: '#7d8794', luvaClaro: '#9aa4b1', chuteira: '#d32f2f', meia: '#ffffff', camisa: '#f5b800', camisaSombra: '#e0a500', sombraCamisa: '#e8ab00', detalhe: '#3c3c3c', calcao: '#3c3c3c', joelheira: '#3c3c3c' },
    rivalAtacante: { chuteira: '#111', meia: '#e53935', sombraCamisa: '#c62828' },
  };

  function cap(ctx, x1, y1, x2, y2, w, cor) {
    ctx.lineCap = 'round'; ctx.strokeStyle = cor; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function circ(ctx, x, y, r, cor) { ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  function bola(ctx, x, y, r) {
    circ(ctx, x, y, r, '#ffffff');
    ctx.fillStyle = '#222';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); i ? ctx.lineTo(x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.38) : ctx.moveTo(x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.38); }
    ctx.fill();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); circ(ctx, x + Math.cos(a) * r * 0.88, y + Math.sin(a) * r * 0.88, r * 0.2, '#222'); }
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }

  function orelha(ctx, x, y, lado, e) {
    const t = e.orelhaTam * 1.2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(lado * -0.22); ctx.scale(1, 1.25);
    // orelha de abano: grande e bem aberta para fora
    ctx.fillStyle = e.pele;
    ctx.beginPath();
    ctx.moveTo(0, -6 * t);
    ctx.bezierCurveTo(lado * 4 * t, -10 * t, lado * 11 * t, -8.5 * t, lado * 11 * t, -1 * t);
    ctx.bezierCurveTo(lado * 11 * t, 5 * t, lado * 6.5 * t, 9 * t, lado * 2.5 * t, 7.5 * t);
    ctx.lineTo(0, 4 * t); ctx.closePath(); ctx.fill();
    ctx.fillStyle = e.orelhaDentro;
    ctx.beginPath(); ctx.ellipse(lado * 6 * t, -0.5 * t, 3 * t, 4.6 * t, lado * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function cabeca(ctx, e, p, costas) {
    ctx.save();
    ctx.translate(0, -86);
    ctx.rotate((p.cab || 0) * RAD);
    ctx.fillStyle = e.pele; ctx.fillRect(-5, 8, 10, 12);   // pescoço
    orelha(ctx, -14, 1, -1, e);
    orelha(ctx, 14, 1, 1, e);
    // rosto oval (mais fino no Orelha)
    ctx.fillStyle = e.pele;
    ctx.beginPath(); ctx.ellipse(0, 0, e.rosto === 'fino' ? 14 : 15, 17, 0, 0, Math.PI * 2); ctx.fill();
    // cabelo
    ctx.fillStyle = e.cabelo;
    ctx.beginPath();
    if (costas) {
      ctx.ellipse(0, -2, 15, 16, 0, 0, Math.PI * 2);
    } else if (e.cabeloTipo === 'raspado') {
      ctx.ellipse(0, -5, 14.5, 13, 0, Math.PI, Math.PI * 2);
    } else {
      ctx.moveTo(-15, 0);
      ctx.bezierCurveTo(-17, -16, -8, -21, 1, -21);
      ctx.bezierCurveTo(11, -21, 18, -15, 15, 0);
      ctx.lineTo(13, -3);
      ctx.quadraticCurveTo(10, -9, 6, -7);
      ctx.quadraticCurveTo(3, -12, -1, -8);
      ctx.quadraticCurveTo(-5, -12, -8, -7);
      ctx.quadraticCurveTo(-12, -9, -13, -3);
      ctx.closePath();
    }
    ctx.fill();
    if (!costas) {
      const ex = p.rosto || 'foco', [ox, oy] = p.olhar || [0, 0];
      ctx.fillStyle = '#2b1a10';
      if (ex === 'feliz') {
        ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        [-5, 5].forEach((x) => { ctx.beginPath(); ctx.arc(x, 0, 2.4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
        ctx.fillStyle = '#7a2e22'; ctx.beginPath(); ctx.arc(0, 7, 4, 0, Math.PI); ctx.fill();
      } else {
        [-5, 5].forEach((x) => circ(ctx, x + ox * 0.8, 0 + oy * 0.8, 1.9, '#2b1a10'));
        ctx.strokeStyle = e.cabelo; ctx.lineWidth = 2; ctx.lineCap = 'round';
        const sob = ex === 'triste' ? 1.5 : ex === 'foco' || ex === 'grito' ? -1 : 0;
        [-1, 1].forEach((l) => { ctx.beginPath(); ctx.moveTo(l * 8, -4 - (ex === 'triste' ? -1 : 0)); ctx.lineTo(l * 2.5, -4 + sob); ctx.stroke(); });
        ctx.strokeStyle = '#6b2f22'; ctx.lineWidth = 1.6;
        if (ex === 'grito') { ctx.fillStyle = '#6b2f22'; ctx.beginPath(); ctx.ellipse(0, 8, 2.6, 3.2, 0, 0, Math.PI * 2); ctx.fill(); }
        else if (ex === 'triste') { ctx.beginPath(); ctx.arc(0, 11, 3.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(-3.5, 8); ctx.lineTo(3.5, 8); ctx.stroke(); }
      }
    }
    ctx.restore();
  }

  function camisa(ctx, e, costas) {
    ctx.fillStyle = e.camisa;
    ctx.beginPath();
    ctx.moveTo(-25, -66); ctx.quadraticCurveTo(0, -70, 25, -66);
    ctx.lineTo(21, -2); ctx.quadraticCurveTo(0, 2, -21, -2); ctx.closePath(); ctx.fill();
    // sombra lateral (volume do estilo flat)
    ctx.fillStyle = e.sombraCamisa;
    ctx.beginPath(); ctx.moveTo(8, -68); ctx.quadraticCurveTo(20, -67, 25, -66); ctx.lineTo(21, -2); ctx.quadraticCurveTo(14, 0, 8, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = e.detalhe;
    if (costas) {
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = '900 8px Arial'; ctx.fillText(e.nome, 0, -50);
      ctx.font = '900 24px Arial'; ctx.fillText(e.numero, 0, -24);
    } else {
      ctx.beginPath(); ctx.moveTo(-7, -68); ctx.lineTo(0, -59); ctx.lineTo(7, -68); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd54f'; ctx.fillRect(8, -56, 6, 7);
    }
    // painéis escuros nos ombros (como a camisa da foto do Orelha)
    if (e.detalhe && e.goleiro && e.camisa === '#38a8ef') {
      ctx.fillStyle = e.detalhe;
      ctx.beginPath(); ctx.moveTo(-25, -66); ctx.lineTo(-14, -68); ctx.lineTo(-23, -50); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(25, -66); ctx.lineTo(14, -68); ctx.lineTo(23, -50); ctx.closePath(); ctx.fill();
    }
  }

  function braco(ctx, e, lado, b, a) {
    const ox = lado * 23, oy = -62;
    const [ex, ey] = dir(b, 31); const [mx, my] = dir(a, 29);
    const cotX = ox + ex, cotY = oy + ey, maoX = cotX + mx, maoY = cotY + my;
    cap(ctx, ox, oy, cotX, cotY, 12.5, e.camisa);
    cap(ctx, cotX, cotY, maoX, maoY, 11, e.goleiro ? e.camisa : e.pele);
    if (e.goleiro) {
      // luva cinza grande
      cap(ctx, cotX + mx * 0.82, cotY + my * 0.82, maoX, maoY, 10, e.luva);
      ctx.save(); ctx.translate(maoX, maoY); ctx.rotate(-a * RAD);
      ctx.fillStyle = e.luva; ctx.beginPath(); ctx.ellipse(0, 6, 7.5, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.luvaClaro; ctx.beginPath(); ctx.ellipse(-lado * 6, 3, 3, 5, lado * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      cap(ctx, ox, oy, ox + ex * 0.6, oy + ey * 0.6, 11.5, e.camisa);
      circ(ctx, maoX, maoY, 5, e.pele);
    }
  }

  function perna(ctx, e, lado, c, j) {
    const ox = lado * 11, oy = 6;
    const [kx, ky] = dir(c, 42); const [sx, sy] = dir(j, 41);
    const jx = ox + kx, jy = oy + ky, px = jx + sx, py = jy + sy;
    cap(ctx, ox, oy, jx, jy, 15, e.pele);
    cap(ctx, ox, oy, ox + kx * 0.45, oy + ky * 0.45, 17.5, e.calcao);
    cap(ctx, jx + sx * 0.2, jy + sy * 0.2, px, py, 12.5, e.meia);
    if (e.joelheira === '#151515') circ(ctx, jx, jy, 7, '#151515');   // joelheira preta do Orelha
    // chuteira
    ctx.save(); ctx.translate(px, py); ctx.rotate(-j * RAD);
    ctx.fillStyle = e.chuteira; ctx.beginPath(); ctx.roundRect(lado < 0 ? -15 : -4, -2, 19, 8, 4); ctx.fill();
    ctx.restore();
  }

  function calcao(ctx, e) {
    ctx.fillStyle = e.calcao;
    ctx.beginPath(); ctx.moveTo(-21, -6); ctx.lineTo(21, -6); ctx.lineTo(24, 14); ctx.lineTo(2, 15); ctx.lineTo(0, 9); ctx.lineTo(-2, 15); ctx.lineTo(-24, 14); ctx.closePath(); ctx.fill();
  }

  // desenha o personagem com a pose p (quadril em p.x, p.y)
  function desenhar(ctx, nome, p) {
    const e = { ...Boneco.ESTILOS[nome], ...EXTRA[nome] };
    const costas = !!p.costas;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rot || 0) * RAD);
    perna(ctx, e, -1, p.cE ?? -10, p.pE ?? -3);
    perna(ctx, e, 1, p.cD ?? 10, p.pD ?? 3);
    calcao(ctx, e);
    camisa(ctx, e, costas);
    braco(ctx, e, -1, p.bE ?? -15, p.aE ?? -8);
    braco(ctx, e, 1, p.bD ?? 15, p.aD ?? 8);
    cabeca(ctx, e, p, costas);
    if (p.bola) bola(ctx, p.bola[0] * 0.85, p.bola[1] * 1.15, 11);
    ctx.restore();
  }

  return { desenhar };
})();
