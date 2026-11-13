# -*- coding: utf-8 -*-
"""Статический сервер для демо «Приложение для врачей».

Умеет:
- brotli (файлы .br) и gzip — чтобы демо проходило через узкий туннель;
- чанковую выдачу PDF (туннель не пропускает большие файлы целиком).
"""

import gzip
import mimetypes
import os
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
COMPRESSIBLE = {'.html', '.css', '.js', '.json', '.svg', '.webmanifest', '.txt', '.xml', '.md'}
_gzip_cache = {}


def gz_bytes(path):
    st = os.stat(path)
    key = (path, st.st_mtime_ns, st.st_size)
    hit = _gzip_cache.get(path)
    if hit and hit[0] == key:
        return hit[1]
    with open(path, 'rb') as f:
        data = f.read()
    packed = gzip.compress(data, 6)
    _gzip_cache[path] = (key, packed)
    return packed


def br_available(fs_path):
    br = fs_path + '.br'
    if not os.path.isfile(br):
        return None
    try:
        if os.path.getmtime(br) + 0.001 < os.path.getmtime(fs_path):
            return None
    except OSError:
        return None
    return br


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_body(self, body, ctype, encoding=None):
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        if encoding:
            self.send_header('Content-Encoding', encoding)
            self.send_header('Vary', 'Accept-Encoding')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = self.path.split('?', 1)[0].split('#', 1)[0]
        query = self.path.split('?', 1)[1] if '?' in self.path else ''
        if parsed in ('', '/'):
            parsed = '/index.html'
        fs_path = os.path.normpath(os.path.join(ROOT, parsed.lstrip('/')))
        if not fs_path.startswith(ROOT) or not os.path.isfile(fs_path):
            self.send_error(404, 'Not found')
            return

        # --- чанковая выдача PDF ---
        if parsed.lower().endswith('.pdf') and 'chunk=' in query:
            params = dict(p.split('=', 1) for p in query.split('&') if '=' in p)
            size = int(params.get('size', 8192))
            idx = int(params.get('chunk', 0))
            with open(fs_path, 'rb') as f:
                data = f.read()
            total = len(data)
            start = idx * size
            end = min(start + size, total)
            body = data[start:end]
            self.send_response(200)
            self.send_header('Content-Type', 'application/pdf')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('X-File-Size', str(total))
            self.send_header('X-Chunk-Index', str(idx))
            self.send_header('X-Chunk-Count', str((total + size - 1) // size))
            self.end_headers()
            self.wfile.write(body)
            return

        ext = os.path.splitext(fs_path)[1].lower()
        ctype = mimetypes.guess_type(fs_path)[0] or 'application/octet-stream'
        accept = self.headers.get('Accept-Encoding', '')

        if ext in COMPRESSIBLE:
            if 'br' in accept:
                br = br_available(fs_path)
                if br:
                    with open(br, 'rb') as f:
                        self.send_body(f.read(), ctype, 'br')
                    return
            if 'gzip' in accept:
                self.send_body(gz_bytes(fs_path), ctype, 'gzip')
                return

        with open(fs_path, 'rb') as f:
            self.send_body(f.read(), ctype)

    def log_message(self, fmt, *args):
        sys.stdout.write('%s - %s\n' % (self.address_string(), fmt % args))
        sys.stdout.flush()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8789
    srv = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print('serving %s on http://127.0.0.1:%d (br+gzip, pdf chunks)' % (ROOT, port), flush=True)
    srv.serve_forever()
