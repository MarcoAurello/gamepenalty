# Servidor local das ferramentas: serve a pasta do jogo e salva as imagens geradas por ferramentas/sprites.html
# Uso: python ferramentas/receber.py  (porta 5570) e abra http://localhost:5570/ferramentas/sprites.html
import http.server, os, re
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_POST(self):
        caminho = self.path.strip('/')
        if not re.fullmatch(r'(personagens/[a-z-]+|assets|icons|ferramentas/previa|ferramentas/ancoras)/[a-z0-9-]+\.(png|jpg|json)', caminho):
            self.send_error(400); return
        destino = os.path.join(RAIZ, *caminho.split('/'))
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        with open(destino, 'wb') as f:
            f.write(self.rfile.read(int(self.headers['Content-Length'])))
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')

http.server.ThreadingHTTPServer(('127.0.0.1', 5570), H).serve_forever()
