# Goleiro Orelha

Jogo de futebol arcade 2D de pênaltis e faltas, com o **Orelha** (o goleiro das orelhas de abano 🧤).
A criança escolhe ser **goleiro** ou **jogador (atacante)**. Feito com HTML, CSS e JavaScript puro,
no mesmo padrão do My Day (DailyRoutinesGame): sem instalação, funciona no celular, no tablet e no computador,
e pode ser instalado como app (PWA, funciona offline).

## Como jogar

1. **Nome** do jogador.
2. **Modo**:
   - 🧤 **Goleiro**: o atacante rival corre e chuta. Depois que a bola sai do pé, toque na direção do pulo
     (⬅ esquerda, ↖ alto esquerda, ⬆ centro, ↗ alto direita, ➡ direita). Teclado: setas, A/D/W, Q/E (alto) ou Shift + seta.
   - ⚽ **Jogador**: desenhe o chute com o dedo ou o mouse, saindo da bola até o gol. A curva do traço dá efeito
     e ajuda a enganar o goleiro; os cantos são mais difíceis de defender, mas a trave está ali.
3. **Cobrança**: pênalti, falta (com barreira e bola com efeito) ou os dois alternando. **Nível**: fácil ou difícil. **5 ou 10 cobranças**.
4. **Fim**: placar, estrelas (até 3) e recorde salvo no aparelho.

## Regras

| | Fácil | Difícil |
|---|---|---|
| Tempo de voo da bola (pênalti / falta) | 1,25 s / 1,5 s | 0,82 s / 1,0 s |
| Modo Goleiro: para defender | acertar o lado | acertar lado **e** altura, pulando a tempo |
| Modo Jogador: goleiro adivinha o canto | 22% | 42% (menos com efeito; mais em chute no meio) |

Ajustes em `dados.js` (`NIVEIS`, `ZONAS`, `FRASES`).

## Tela (vertical, como os jogos de pênalti de celular)

- **Câmera atrás do cobrador**, em perspectiva 3D: o cobrador aparece grande embaixo, de costas, e o gol fica ao fundo,
  com torcida azul e placas. A bola voa em 3D (largura, altura e distância) e diminui conforme se afasta, com sombra no chão.
- Na falta, a câmera vai para o lado da bola, a barreira pula e a bola faz curva por cima dela.
- **Em cima**: pausar, som, as estrelas de cada cobrança (⭐ acerto, ❌ erro), ajuda, ajustes e sair.
- **Modo Goleiro**: botões redondos nas laterais e embaixo (ou toque direto no canto do gol).
- No computador o jogo aparece no formato de celular (9:16).
- **Tela inicial** com o pôster do Orelha.

## Sensação de jogo

Seguindo boas práticas de jogos 2D: animação com preparação e continuação (o cobrador desacelera antes do chute,
o goleiro cai e levanta poeira), bola que amassa no chute e no impacto, tremor de tela curto, micro pausa no impacto,
zoom suave da câmera durante o voo, partículas (grama, estrelas na defesa, confete no gol), ordem de desenho por
profundidade, passo de física fixo (1/120 s) e tolerância no toque um instante antes do chute.

## Sons

Tudo gerado no aparelho: batucada agitada de fundo (surdo, caixa, tamborim e agogô) com a torcida, e no gol uma
"música de torcida" (Olé, olé, olé na corneta, bumbo, palmas e a torcida explodindo). Também apito, chute, rede, trave e defesa.

## Android e iPhone

- Som gerado no aparelho (apito, chute, rede, trave, torcida), destravado no primeiro toque (exigência do iPhone).
- Se o jogador troca de app, recebe ligação ou bloqueia a tela, o jogo pausa.
- Sem zoom de dois toques, sem "puxar para recarregar" no Android e respeito ao entalhe (notch).

## Arquivos

- `index.html`, `style.css`: telas e visual.
- `jogo.js`: fluxo, campo (canvas), cobranças, voo da bola, defesa, desenho do chute, sons e instalação.
- `dados.js`: sprites, direções (zonas), níveis e frases.
- `personagens/<id>/sprites.png`: folhas de sprites no estilo vetorial flat (quadros de 448x448):
  - `orelha`: goleiro (pronto, mergulhos alto/baixo para os dois lados, pulo, encaixe, comemoração, tristeza);
  - `orelha-atacante`: o Orelha de costas com a 10 (pronto, corrida, chute, comemoração, tristeza);
  - `rival-goleiro` e `rival-atacante`: os adversários.
- `personagens/orelha/capa.png`: figurinha do Orelha (tela inicial). `icons/`: ícones do app.
- `ferramentas/boneco-plano.js` (estilo flat do jogo), `ferramentas/boneco.js` (estilo figurinha da capa e dos ícones)
  e `ferramentas/sprites.html` (gerador das folhas)
  (rode `python ferramentas/receber.py` e abra http://localhost:5570/ferramentas/sprites.html).
- `referencias/`: protótipo, regras e fotos de referência (fora do servidor).

## Publicar na VPS (Dokploy)

O `Dockerfile` monta um nginx que serve o jogo em `/goleiro/` (o `.dockerignore` deixa de fora referências e ferramentas).
No Dokploy: aplicação ligada a este repositório, Build Type **Dockerfile**, domínio com path `/goleiro`,
**Strip Path desligado**, porta **80** e HTTPS (Let's Encrypt).

## Para testar no computador

```bash
python -m http.server 5570
```

Depois abra http://localhost:5570. Ao publicar uma versão nova, aumente a `VERSAO` no `service-worker.js` e o `?v=` no `index.html`.

---

© **Marco Nunes** — Todos os direitos reservados.
