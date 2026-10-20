/* Goleiro Orelha — dados do jogo. © Marco Nunes — Todos os direitos reservados. */

// Folhas de sprites (quadros de 320x320) geradas por ferramentas/sprites.html.
// Em cada quadro, o pé do personagem fica no ponto PE_DO_QUADRO.
const QUADRO = 320;
const PE_DO_QUADRO = { x: 160, y: 288 };

const ESTADOS_GOLEIRO = {
  pronto: { linha: 0, quadros: 2, fps: 3, repete: true },
  dirAlto: { linha: 1, quadros: 3, fps: 11 },
  dirBaixo: { linha: 2, quadros: 3, fps: 11 },
  esqAlto: { linha: 3, quadros: 3, fps: 11 },
  esqBaixo: { linha: 4, quadros: 3, fps: 11 },
  pulo: { linha: 5, quadros: 3, fps: 10 },
  defesa: { linha: 6, quadros: 2, fps: 4 },
  comemora: { linha: 7, quadros: 3, fps: 6, repete: true },
  triste: { linha: 8, quadros: 2, fps: 2 },
};
const ESTADOS_ATACANTE = {
  pronto: { linha: 0, quadros: 2, fps: 3, repete: true },
  corrida: { linha: 1, quadros: 4, fps: 10, repete: true },
  chute: { linha: 2, quadros: 3, fps: 10 },
  comemora: { linha: 3, quadros: 3, fps: 6, repete: true },
  triste: { linha: 4, quadros: 2, fps: 2 },
};

const PERSONAGENS = {
  orelhaGoleiro: { src: 'personagens/orelha/sprites.png', colunas: 3, estados: ESTADOS_GOLEIRO },
  orelhaAtacante: { src: 'personagens/orelha-atacante/sprites.png', colunas: 4, estados: ESTADOS_ATACANTE },
  rivalGoleiro: { src: 'personagens/rival-goleiro/sprites.png', colunas: 3, estados: ESTADOS_GOLEIRO },
  rivalAtacante: { src: 'personagens/rival-atacante/sprites.png', colunas: 4, estados: ESTADOS_ATACANTE },
};

// As 5 direções do chute e da defesa (tx: -1 trave esquerda … 1 trave direita; tz: 0 chão … 1 travessão)
const ZONAS = {
  esqBaixo: { nome: 'Esquerda', lado: -1, alto: false, tx: -0.72, tz: 0.18, tecla: '←' },
  esqAlto: { nome: 'Alto esquerda', lado: -1, alto: true, tx: -0.72, tz: 0.74, tecla: '↖' },
  centro: { nome: 'Centro', lado: 0, alto: false, tx: 0, tz: 0.3, tecla: '↑' },
  dirAlto: { nome: 'Alto direita', lado: 1, alto: true, tx: 0.72, tz: 0.74, tecla: '↗' },
  dirBaixo: { nome: 'Direita', lado: 1, alto: false, tx: 0.72, tz: 0.18, tecla: '→' },
};

// Níveis: tempo de voo da bola (s) e quanto o goleiro do computador acerta o canto no modo Jogador
const NIVEIS = {
  facil: { nome: 'Fácil', voo: 1.25, vooFalta: 1.5, acertoGoleiro: 0.22, mesmoLadoDefende: true },
  dificil: { nome: 'Difícil', voo: 0.82, vooFalta: 1.0, acertoGoleiro: 0.42, mesmoLadoDefende: false },
};

const TIPOS = {
  penalti: { nome: 'Pênalti', icone: '⚽' },
  falta: { nome: 'Falta', icone: '🧱' },
  misto: { nome: 'Pênalti e falta', icone: '🔁' },
};

const FRASES = {
  defesa: ['QUE DEFESA!', 'PEGOU!', 'PAREDÃO!', 'ESPALMOU!'],
  gol: ['GOOOL!', 'É GOL!', 'NO ÂNGULO!', 'GOLAÇO!'],
  trave: ['NA TRAVE!', 'UHH, NA TRAVE!'],
  fora: ['PRA FORA!', 'POR CIMA!'],
};
