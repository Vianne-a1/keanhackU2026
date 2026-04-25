import os
from functools import partial
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer


class ReusableTCPServer(TCPServer):
    allow_reuse_address = True


class FrontendRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path in ("/", ""):
            self.path = "/HTML/home.html"
        return super().do_GET()


def main() -> None:
    host = "0.0.0.0"
    port = int(os.getenv("PORT", "8000"))
    frontend_root = os.path.join(os.path.dirname(__file__), "Frontend")
    handler = partial(FrontendRequestHandler, directory=frontend_root)

    with ReusableTCPServer((host, port), handler) as server:
        print(f"Server running at http://localhost:{port}")
        print(f"Serving frontend from: {frontend_root}")
        server.serve_forever()


if __name__ == "__main__":
    main()