/* Goleiro Orelha — o que gerar no Gemini (método "animated-sprite-gen": âncora + tiras inteiras + normalização).
   Cada personagem: a vista (frente = goleiro, costas = atacante), as animações na ordem das linhas da folha
   e quantos quadros pedir em cada tira (de 2 a 6: acima disso a IA perde a consistência).
   As tiras "esq" são o espelho das "dir" (não precisa gerar). © Marco Nunes — Todos os direitos reservados. */
const ESTILO_EN = 'high quality 2D mobile game character art, clean flat vector shapes with soft cel shading, '
  + 'crisp edges, no outline or a thin dark outline, full body from head to feet, nothing cropped, '
  + 'solid pure green background (#00FF00), no shadows on the background, no text, no watermark';

const ORELHA_EN = 'an 11-year-old Brazilian boy goalkeeper nicknamed "Orelha": medium-brown skin, short dark wavy hair '
  + 'with a small fringe, thick dark eyebrows, calm serious dark eyes, slim face, VERY BIG protruding ears (his trademark), '
  + 'sky-blue goalkeeper jersey with dark navy shoulder panels, sky-blue shorts, sky-blue long socks, black knee pads, '
  + 'black football boots';
const RIVAL_GOL_EN = 'a teenage rival goalkeeper with light skin and brown hair, yellow goalkeeper jersey, dark grey shorts, '
  + 'white socks, red boots, grey goalkeeper gloves';
const RIVAL_ATK_EN = 'a teenage rival striker with tan skin and short black hair, red jersey with white number 9, white shorts, '
  + 'red socks, black boots';

const PERSONAGENS_ESTUDIO = {
  orelha: {
    nome: 'Orelha goleiro', descricao: ORELHA_EN + ', grey goalkeeper gloves', vista: 'front view, facing the camera',
    linhas: ['pronto', 'dirAlto', 'dirBaixo', 'esqAlto', 'esqBaixo', 'pulo', 'defesa', 'comemora', 'triste'],
    espelhos: { esqAlto: 'dirAlto', esqBaixo: 'dirBaixo' },
    tiras: {
      pronto: [4, 3, true, 'idle ready stance: knees bent, arms open at the sides with gloves up, slight breathing bounce'],
      dirAlto: [4, 11, false, 'diving HIGH to the RIGHT side of the image to save a shot: push-off, flying horizontally with both arms stretched up-right, fully extended, landing'],
      dirBaixo: [4, 11, false, 'diving LOW to the RIGHT side of the image along the ground: step, low dive, body horizontal near the ground with arms stretched right, landing on the grass'],
      pulo: [3, 10, false, 'jumping straight UP in the centre to catch a high ball: crouch, jump with both arms up, top of the jump'],
      defesa: [3, 5, false, 'catching the ball and hugging it to the chest (ball visible in his arms)'],
      comemora: [4, 6, true, 'celebrating a great save: jumping with fists in the air, big smile'],
      triste: [3, 2, false, 'sad after conceding a goal: head down, then hands on the head'],
    },
  },
  'orelha-atacante': {
    nome: 'Orelha atacante', descricao: ORELHA_EN.replace('goalkeeper jersey', 'football jersey with white "ORELHA 10" on the back'),
    vista: 'seen FROM BEHIND (back view), we see his back, the back of his head and his big ears',
    linhas: ['pronto', 'corrida', 'chute', 'comemora', 'triste'], espelhos: {},
    tiras: {
      pronto: [3, 3, true, 'standing behind the ball ready to shoot, slight breathing bounce'],
      corrida: [6, 10, true, 'running forward away from the camera (run cycle), arms swinging'],
      chute: [4, 10, false, 'kicking a penalty with the right foot: plant left foot, swing right leg, contact, follow-through'],
      comemora: [4, 6, true, 'celebrating a goal with both arms raised, jumping'],
      triste: [3, 2, false, 'disappointed after missing: hands on the head'],
    },
  },
  'rival-goleiro': {
    nome: 'Goleiro rival', descricao: RIVAL_GOL_EN, vista: 'front view, facing the camera',
    linhas: ['pronto', 'dirAlto', 'dirBaixo', 'esqAlto', 'esqBaixo', 'pulo', 'defesa', 'comemora', 'triste'],
    espelhos: { esqAlto: 'dirAlto', esqBaixo: 'dirBaixo' },
    tiras: null,   // usa as mesmas tiras do Orelha goleiro
  },
  'rival-atacante': {
    nome: 'Atacante rival', descricao: RIVAL_ATK_EN, vista: 'seen FROM BEHIND (back view)',
    linhas: ['pronto', 'corrida', 'chute', 'comemora', 'triste'], espelhos: {},
    tiras: null,   // usa as mesmas tiras do Orelha atacante
  },
};
PERSONAGENS_ESTUDIO['rival-goleiro'].tiras = PERSONAGENS_ESTUDIO.orelha.tiras;
PERSONAGENS_ESTUDIO['rival-atacante'].tiras = PERSONAGENS_ESTUDIO['orelha-atacante'].tiras;

// textos para colar no Gemini
function promptAncora(id) {
  const p = PERSONAGENS_ESTUDIO[id];
  return `Create the main character sprite (anchor frame) for a mobile penalty game. `
    + `Character: ${p.descricao}. View: ${p.vista}. Pose: ${p.tiras.pronto[3]}. `
    + `Use the attached pose guide only for the pose and proportions (realistic proportions, not chibi). `
    + (id === 'orelha' || id === 'orelha-atacante' ? 'Use the attached photo of the boy for his face, hair and ears. ' : '')
    + `Style: ${ESTILO_EN}. One single character, centered, square image.`;
}
function promptTira(id, estado) {
  const p = PERSONAGENS_ESTUDIO[id], [n, , , acao] = p.tiras[estado];
  return `This image is a sprite reference canvas. The character in the FIRST slot (top-left) is the anchor. `
    + `Generate a ${n + 1}-frame animation strip of THIS SAME character in the slots, reading left to right, top to bottom. `
    + `Frame 1 must be an exact copy of the anchor. Frames 2 to ${n + 1}: ${acao}. `
    + `View: ${p.vista}. Keep the character 100% consistent across all frames: same face, ears, kit, colors, proportions and size. `
    + `Every frame shows the full body, separated from the others, nothing touching or cropped. `
    + `Style: ${ESTILO_EN}.`;
}
