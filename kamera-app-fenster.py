#!/usr/bin/env python3
"""
Kamera-App — lokaler Server (Galerie-API). Chrome: ./sofort-kamera-app.sh
"""
from __future__ import annotations

import json
import cgi
import http.server
import os
import shutil
import socket
import socketserver
import subprocess
import sys
import tempfile
import threading
import time

PORT = 8773
DIR = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR = os.path.join(DIR, "kamera-app-media")
URL = f"http://127.0.0.1:{PORT}/kamera-app.html"


class KameraHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def guess_type(self, path):
        if path.endswith(".js"):
            return "application/javascript"
        if path.endswith(".mjs"):
            return "application/javascript"
        if path.endswith(".mp4"):
            return "video/mp4"
        if path.endswith(".jpg") or path.endswith(".jpeg"):
            return "image/jpeg"
        return super().guess_type(path)

    def parse_form(self):
        length = int(self.headers.get("Content-Length", "0"))
        env = {
            "REQUEST_METHOD": "POST",
            "CONTENT_TYPE": self.headers.get("Content-Type", ""),
            "CONTENT_LENGTH": str(length),
        }
        return cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ=env)

    def send_json(self, data: dict, code: int = 200) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/gallery-list":
            self.handle_gallery_list()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/save-photo":
            self.handle_save_photo()
        elif self.path == "/api/save-frames":
            self.handle_save_frames()
        elif self.path == "/api/encode-video":
            self.handle_encode_video()
        elif self.path == "/api/delete-media":
            self.handle_delete_media()
        else:
            self.send_error(404)

    def read_upload(self, field):
        if field is None:
            return None
        if isinstance(field, list):
            field = field[0]
        if not getattr(field, "file", None):
            return None
        return field.file.read()

    def handle_save_photo(self):
        try:
            form = self.parse_form()
            if "photo" not in form:
                self.send_error(400, "Kein Foto")
                return
            data = self.read_upload(form["photo"])
            if not data:
                self.send_error(400, "Kein Foto")
                return
            os.makedirs(MEDIA_DIR, exist_ok=True)
            name = f"foto-{int(time.time() * 1000)}.jpg"
            with open(os.path.join(MEDIA_DIR, name), "wb") as f:
                f.write(data)
            self.send_json({"url": f"/kamera-app-media/{name}"})
        except Exception as exc:
            self.send_error(500, str(exc))

    def handle_save_frames(self):
        try:
            form = self.parse_form()
            raw = form.getlist("frame")
            if not raw:
                self.send_error(400, "Keine Bilder")
                return
            os.makedirs(MEDIA_DIR, exist_ok=True)
            base = int(time.time() * 1000)
            urls = []
            for i, field in enumerate(raw):
                data = self.read_upload(field)
                if not data:
                    continue
                name = f"frame-{base}-{i:05d}.jpg"
                with open(os.path.join(MEDIA_DIR, name), "wb") as f:
                    f.write(data)
                urls.append(f"/kamera-app-media/{name}")
            if not urls:
                self.send_error(400, "Keine Bilder")
                return
            fps = float(form.getvalue("fps", "10") or "10")
            label = form.getvalue("label", "video") or "video"
            self.write_film_meta(str(base), urls, fps, label)
            self.send_json({"urls": urls, "base": str(base)})
        except Exception as exc:
            self.send_error(500, str(exc))

    def write_film_meta(self, base: str, frames: list, fps: float, label: str, download_url=None):
        meta = {
            "type": "film",
            "id": f"film-{base}.json",
            "frames": frames,
            "fps": fps,
            "label": label,
            "url": frames[0] if frames else "",
            "downloadUrl": download_url,
        }
        with open(os.path.join(MEDIA_DIR, f"film-{base}.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f)
        return meta

    def handle_gallery_list(self):
        try:
            os.makedirs(MEDIA_DIR, exist_ok=True)
            items = []
            seen_vids = set()
            for name in sorted(os.listdir(MEDIA_DIR), reverse=True):
                if name.startswith("film-") and name.endswith(".json"):
                    with open(os.path.join(MEDIA_DIR, name), encoding="utf-8") as f:
                        meta = json.load(f)
                    if meta.get("downloadUrl"):
                        seen_vids.add(os.path.basename(meta["downloadUrl"]))
                    items.append(meta)
                elif name.startswith("foto-") and name.endswith(".jpg"):
                    items.append({
                        "id": name,
                        "type": "photo",
                        "url": f"/kamera-app-media/{name}",
                        "label": "Foto",
                    })
                elif name.startswith("vid-") and name.endswith(".mp4"):
                    if name in seen_vids:
                        continue
                    url = f"/kamera-app-media/{name}"
                    items.append({
                        "id": name,
                        "type": "video",
                        "url": url,
                        "downloadUrl": url,
                        "label": "Video",
                    })
            self.send_json({"items": items})
        except Exception as exc:
            self.send_error(500, str(exc))

    def handle_delete_media(self):
        try:
            form = self.parse_form()
            name = form.getvalue("name", "")
            if not name or ".." in name or "/" in name:
                self.send_error(400, "Ungültiger Name")
                return
            path = os.path.join(MEDIA_DIR, name)
            if name.startswith("film-") and name.endswith(".json") and os.path.isfile(path):
                with open(path, encoding="utf-8") as f:
                    meta = json.load(f)
                for u in meta.get("frames", []):
                    fp = os.path.join(MEDIA_DIR, os.path.basename(u))
                    if os.path.isfile(fp):
                        os.remove(fp)
                dl = meta.get("downloadUrl")
                if dl:
                    fp = os.path.join(MEDIA_DIR, os.path.basename(dl))
                    if os.path.isfile(fp):
                        os.remove(fp)
                os.remove(path)
            elif os.path.isfile(path):
                os.remove(path)
            self.send_json({"ok": True})
        except Exception as exc:
            self.send_error(500, str(exc))

    def handle_encode_video(self):
        try:
            form = self.parse_form()
            fps = float(form.getvalue("fps", "24") or "24")
            raw = form.getlist("frame")
            if not raw:
                self.send_error(400, "Keine Bilder")
                return

            if not shutil.which("ffmpeg"):
                self.send_error(503, "ffmpeg fehlt — ./kamera-app-install.sh")
                return

            with tempfile.TemporaryDirectory() as tmp:
                idx = 0
                for field in raw:
                    data = self.read_upload(field)
                    if not data:
                        continue
                    with open(os.path.join(tmp, f"f{idx:05d}.jpg"), "wb") as f:
                        f.write(data)
                    idx += 1
                if idx == 0:
                    self.send_error(400, "Keine Bilder")
                    return
                out = os.path.join(tmp, "out.mp4")
                cmd = [
                    "ffmpeg", "-y", "-loglevel", "error",
                    "-framerate", str(fps),
                    "-i", os.path.join(tmp, "f%05d.jpg"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    out,
                ]
                subprocess.run(cmd, check=True, timeout=120)
                os.makedirs(MEDIA_DIR, exist_ok=True)
                vid_name = f"vid-{int(time.time() * 1000)}.mp4"
                final_path = os.path.join(MEDIA_DIR, vid_name)
                shutil.copy2(out, final_path)

            vid_url = f"/kamera-app-media/{vid_name}"
            film_base = form.getvalue("film_base", "")
            if film_base:
                meta_path = os.path.join(MEDIA_DIR, f"film-{film_base}.json")
                if os.path.isfile(meta_path):
                    with open(meta_path, encoding="utf-8") as f:
                        meta = json.load(f)
                    meta["downloadUrl"] = vid_url
                    with open(meta_path, "w", encoding="utf-8") as f:
                        json.dump(meta, f)

            self.send_json({"url": vid_url})
        except subprocess.CalledProcessError:
            self.send_error(500, "Video konnte nicht erstellt werden")
        except Exception as exc:
            self.send_error(500, str(exc))


def port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.12)
        return s.connect_ex(("127.0.0.1", port)) == 0


def kill_port(port: int) -> None:
    """Alter simple HTTP-Server blockiert die Galerie-API — immer beenden."""
    try:
        subprocess.run(
            ["fuser", "-k", f"{port}/tcp"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
        )
        time.sleep(0.2)
    except Exception:
        pass


def start_server() -> None:
    os.makedirs(MEDIA_DIR, exist_ok=True)
    kill_port(PORT)
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), KameraHandler)
    httpd.allow_reuse_address = True
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    for _ in range(40):
        if port_open(PORT):
            return
        time.sleep(0.05)


def run_gtk_window() -> None:
    import gi

    gi.require_version("Gtk", "3.0")
    gi.require_version("WebKit2", "4.1")
    from gi.repository import GLib, Gtk, WebKit2

    start_server()

    settings = WebKit2.Settings()
    for name, value in (
        ("enable_media_stream", True),
        ("enable_webaudio", True),
        ("enable_mediasource", True),
        ("enable_media_capabilities", True),
        ("media_playback_requires_user_gesture", False),
        ("media_playback_allows_inline", True),
    ):
        fn = getattr(settings, f"set_{name}", None)
        if fn:
            try:
                fn(value)
            except Exception:
                pass

    win = Gtk.Window(title="Kamera-App")
    win.set_default_size(980, 820)
    win.set_position(Gtk.WindowPosition.CENTER)

    web = WebKit2.WebView.new_with_settings(settings)
    web.load_uri(URL)

    def on_permission_request(_view, request):
        try:
            if isinstance(request, WebKit2.UserMediaPermissionRequest):
                request.allow()
            elif hasattr(request, "allow"):
                request.allow()
        except Exception:
            pass

    def on_destroy(_win):
        Gtk.main_quit()

    web.connect("permission-request", on_permission_request)
    win.connect("destroy", on_destroy)
    win.add(web)
    win.show_all()
    Gtk.main()


def run_server_only() -> int:
    start_server()
    print(f"Kamera-Server: {URL}", file=sys.stderr)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        pass
    return 0


def main() -> int:
    os.chdir(DIR)
    if "--server-only" in sys.argv:
        return run_server_only()
    if "--gtk" in sys.argv:
        try:
            run_gtk_window()
            return 0
        except ValueError as e:
            print("WebKit fehlt. Nutze Chrome: ./sofort-kamera-app.sh", file=sys.stderr)
            print(e, file=sys.stderr)
            return 1
        except Exception as e:
            print(f"Kamera-App Fehler: {e}", file=sys.stderr)
            return 1
    return run_server_only()


if __name__ == "__main__":
    sys.exit(main())
