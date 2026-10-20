# Como deixar os sprites profissionais (método animated-sprite-gen)

Baseado na skill [animated-sprite-gen](https://github.com/jamditis/claude-skills-journalism/blob/master/animated-sprite-gen/SKILL.md) (MIT):
gerar **tiras inteiras** de animação a partir de **uma âncora aprovada**, e depois **normalizar** com uma escala só.
A IA de imagem recomendada é o **Gemini (Nano Banana)**, a mais consistente entre os quadros.

## 1. Abrir o estúdio

```bash
python ferramentas/receber.py
```

Depois abra http://localhost:5570/ferramentas/estudio.html e escolha o personagem na aba de cima.

## 2. Âncora (uma vez por personagem)

1. Clique em **Baixar guia de pose** (o boneco atual, só para a pose e as proporções).
2. No Gemini, anexe o guia e, no caso do Orelha, **uma foto do menino**. Cole o texto e gere até gostar.
3. Solte a imagem aprovada no estúdio. Ela vira a **âncora**: estilo, cores e proporções de todas as animações saem dela.

## 3. Tiras (uma por animação)

1. Em cada animação, clique em **Tela de referência**. A âncora já vai no primeiro espaço, e os outros espaços ficam reservados.
2. No Gemini, anexe a tela, cole o **Texto** e gere.
3. Solte a tira no estúdio. Ele tira o fundo verde, acha cada quadro na ordem de leitura e usa o primeiro (a cópia da âncora)
   para medir a **escala única** da tira, que depois é descartado. Também alinha os pés e mostra os quadros prontos.
4. Se algum quadro sair errado, gere a tira de novo, sempre com a mesma tela de referência.

Dicas da skill:
- de **4 a 6 quadros** por tira, porque acima disso a IA perde a consistência;
- nunca gere quadro por quadro, porque o personagem "muda" entre um e outro;
- fundo **verde liso** (#00FF00), nunca o xadrez "transparente".

## 4. Montar e salvar

Clique em **Montar e salvar no jogo**. O estúdio grava `personagens/<id>/sprites.png` e `estados.json`
(quantidade de quadros e velocidade de cada animação). O jogo lê esse arquivo sozinho, sem mexer no código.
O que não tiver tira nova continua com o desenho atual, e os pulos para a esquerda saem espelhados dos da direita.

Depois aumente a `VERSAO` no `service-worker.js` (e o `?v=` no `index.html`) e publique.
