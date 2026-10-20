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

## Tela (como no protótipo)

- **Painel lateral**: Som (on/off), Pausar, Ajustes (nível e torcida), Ajuda e Sair. No celular em pé vira uma barra em cima.
- **Campo**: visão de cima, gol com rede ao fundo, goleiro preparado, atacante na entrada da área.
  Setas em volta do goleiro (modo Goleiro) e linhas pontilhadas sugerindo o arco do chute (modo Jogador).
- **Placar**: defesas e gols; aviso grande de GOL, DEFESA, TRAVE ou FORA.

## Android e iPhone

- Som gerado no aparelho (apito, chute, rede, trave, torcida), destravado no primeiro toque (exigência do iPhone).
- Se o jogador troca de app, recebe ligação ou bloqueia a tela, o jogo pausa.
- Sem zoom de dois toques, sem "puxar para recarregar" no Android e respeito ao entalhe (notch).

## Arquivos

- `index.html`, `style.css`: telas e visual.
- `jogo.js`: fluxo, campo (canvas), cobranças, voo da bola, defesa, desenho do chute, sons e instalação.
- `dados.js`: sprites, direções (zonas), níveis e frases.
- `personagens/<id>/sprites.png`: folhas de sprites (quadros de 320x320):
  - `orelha`: goleiro (pronto, mergulhos alto/baixo para os dois lados, pulo, encaixe, comemoração, tristeza);
  - `orelha-atacante`: o Orelha de costas com a 10 (pronto, corrida, chute, comemoração, tristeza);
  - `rival-goleiro` e `rival-atacante`: os adversários.
- `personagens/orelha/capa.png`: figurinha do Orelha (tela inicial). `icons/`: ícones do app.
- `ferramentas/boneco.js` e `ferramentas/sprites.html`: o desenho vetorial dos personagens e o gerador das folhas
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
