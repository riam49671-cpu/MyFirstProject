#!/usr/bin/env python3
"""
Krone Spiel – gemeinsamer Spielstand für mehrere Computer (WebSocket).
Host startet:  python3 server/krone_server.py
Alle Spieler öffnen die gleiche Seite, wählen „Online“ und dieselbe Server-Adresse.
Standard-Port: 8770
"""
from __future__ import annotations

import asyncio
import json
import math
import random
import time
from typing import Any

try:
    import websockets
except ImportError:
    print("Bitte installieren: pip install websockets")
    raise

# —— Konstanten (müssen zu js/game.js passen) ——
ARENA_W, ARENA_H = 960, 540
PLAYER_R = 26
SPEED = 220.0
CROWN_SPEED = 198.0
TAG_DIST = PLAYER_R * 2 + 4
OBSTACLES = [
    {"x": 100, "y": 70, "w": 130, "h": 36},
    {"x": 730, "y": 434, "w": 130, "h": 36},
    {"x": 440, "y": 90, "w": 36, "h": 140},
    {"x": 484, "y": 310, "w": 36, "h": 140},
    {"x": 200, "y": 240, "w": 90, "h": 36},
    {"x": 670, "y": 264, "w": 90, "h": 36},
]
SHIRT = ["#dc2626", "#2563eb", "#16a34a", "#eab308"]
WS_PORT = 8770
TOTAL_PLAYERS = 4
GAME_DURATION_MS = 120_000  # wird vom ersten Client-„config“ überschrieben optional


def clamp(v: float, a: float, b: float) -> float:
    return max(a, min(b, v))


def circle_obstacle_overlap(px: float, py: float) -> bool:
    for o in OBSTACLES:
        ox, oy, ow, oh = o["x"], o["y"], o["w"], o["h"]
        cx = clamp(px, ox, ox + ow)
        cy = clamp(py, oy, oy + oh)
        if math.hypot(px - cx, py - cy) < PLAYER_R - 0.5:
            return True
    return False


def spawn_position(i: int) -> tuple[float, float]:
    for attempt in range(40):
        ang = (i / TOTAL_PLAYERS) * math.pi * 2 + 0.3 + attempt * 0.12
        rad = min(ARENA_W, ARENA_H) * (0.24 + (attempt % 5) * 0.02)
        x = ARENA_W / 2 + math.cos(ang) * rad
        y = ARENA_H / 2 + math.sin(ang) * rad
        x = clamp(x, PLAYER_R, ARENA_W - PLAYER_R)
        y = clamp(y, PLAYER_R, ARENA_H - PLAYER_R)
        if not circle_obstacle_overlap(x, y):
            return circle_obstacle_resolve(x, y)
    return circle_obstacle_resolve(ARENA_W / 2 + 80, ARENA_H / 2)


def circle_obstacle_resolve(px: float, py: float) -> tuple[float, float]:
    x, y = px, py
    for o in OBSTACLES:
        ox, oy, ow, oh = o["x"], o["y"], o["w"], o["h"]
        cx = clamp(x, ox, ox + ow)
        cy = clamp(y, oy, oy + oh)
        dx = x - cx
        dy = y - cy
        dist = math.hypot(dx, dy)
        if dist < PLAYER_R and dist > 1e-6:
            push = (PLAYER_R - dist) / dist
            x += dx * push
            y += dy * push
        elif dist < 1e-6:
            # Mitte in der Kiste – zur nächsten Seite schieben
            dl = x - ox
            dr = ox + ow - x
            dt = y - oy
            db = oy + oh - y
            m = min(dl, dr, dt, db)
            if m == dl:
                x = ox - PLAYER_R
            elif m == dr:
                x = ox + ow + PLAYER_R
            elif m == dt:
                y = oy - PLAYER_R
            else:
                y = oy + oh + PLAYER_R
    x = clamp(x, PLAYER_R, ARENA_W - PLAYER_R)
    y = clamp(y, PLAYER_R, ARENA_H - PLAYER_R)
    return x, y


class Game:
    def __init__(self) -> None:
        self.players: list[dict[str, Any]] = []
        self.crown_index = 0
        self.inputs: list[dict[str, float]] = [{"dx": 0, "dy": 0} for _ in range(TOTAL_PLAYERS)]
        self.human_connected: list[bool] = [False] * TOTAL_PLAYERS
        self.end_at = 0.0
        self.running = False
        self.ai_angle = [random.random() * 6.28 for _ in range(TOTAL_PLAYERS)]
        self.duration_ms = GAME_DURATION_MS
        self.lock = asyncio.Lock()
        self.clients: dict[Any, int] = {}
        self.game_over_sent = False

    def reset(self) -> None:
        self.players = []
        for i in range(TOTAL_PLAYERS):
            x, y = spawn_position(i)
            human = self.human_connected[i]
            self.players.append(
                {
                    "x": x,
                    "y": y,
                    "color": SHIRT[i],
                    "human": human,
                    "name": (f"Spieler {i + 1}" if human else f"Roboter {i + 1}"),
                    "faceDir": 1.0,
                    "bob": 0.0,
                }
            )
            self.ai_angle[i] = random.random() * 6.28
        self.crown_index = random.randint(0, TOTAL_PLAYERS - 1)
        self.end_at = time.monotonic() * 1000 + self.duration_ms
        self.running = True
        self.game_over_sent = False

    def ai_velocity(self, i: int, now_ms: float) -> tuple[float, float]:
        p = self.players[i]
        spd = CROWN_SPEED if i == self.crown_index else SPEED
        if i == self.crown_index:
            bx, by = 0.0, 0.0
            for j in range(TOTAL_PLAYERS):
                if j == i:
                    continue
                q = self.players[j]
                dx = p["x"] - q["x"]
                dy = p["y"] - q["y"]
                d = math.hypot(dx, dy) or 1.0
                pull = SPEED * 1.2 / (d * d) * 800
                bx += (dx / d) * pull
                by += (dy / d) * pull
            bx += (ARENA_W / 2 - p["x"]) * 0.0008
            by += (ARENA_H / 2 - p["y"]) * 0.0008
            self.ai_angle[i] += 0.05 + math.sin(now_ms * 0.002 + i) * 0.02
            bx += math.cos(self.ai_angle[i]) * 0.35
            by += math.sin(self.ai_angle[i]) * 0.35
            ln = math.hypot(bx, by) or 1.0
            return (bx / ln) * spd, (by / ln) * spd
        tgt = self.players[self.crown_index]
        dx = tgt["x"] - p["x"]
        dy = tgt["y"] - p["y"]
        ln = math.hypot(dx, dy) or 1.0
        return (dx / ln) * SPEED, (dy / ln) * SPEED

    def tick(self, dt: float, now_ms: float) -> None:
        if not self.running:
            return
        for i in range(TOTAL_PLAYERS):
            p = self.players[i]
            spd = CROWN_SPEED if i == self.crown_index else SPEED
            if p["human"]:
                inp = self.inputs[i]
                vx = inp["dx"] * spd
                vy = inp["dy"] * spd
            else:
                vx, vy = self.ai_velocity(i, now_ms)
            if abs(vx) > 2:
                p["faceDir"] = 1.0 if vx > 0 else -1.0
            p["bob"] += dt * 12
            p["x"] += vx * dt
            p["y"] += vy * dt
            p["x"] = clamp(p["x"], PLAYER_R, ARENA_W - PLAYER_R)
            p["y"] = clamp(p["y"], PLAYER_R, ARENA_H - PLAYER_R)
            p["x"], p["y"] = circle_obstacle_resolve(p["x"], p["y"])

        # Spieler–Spieler
        for i in range(TOTAL_PLAYERS):
            for j in range(i + 1, TOTAL_PLAYERS):
                a, b = self.players[i], self.players[j]
                dx = b["x"] - a["x"]
                dy = b["y"] - a["y"]
                dist = math.hypot(dx, dy)
                mn = PLAYER_R * 2
                if dist < mn and dist > 0:
                    push = (mn - dist) / 2
                    nx, ny = dx / dist, dy / dist
                    a["x"] -= nx * push
                    a["y"] -= ny * push
                    b["x"] += nx * push
                    b["y"] += ny * push
                    a["x"] = clamp(a["x"], PLAYER_R, ARENA_W - PLAYER_R)
                    a["y"] = clamp(a["y"], PLAYER_R, ARENA_H - PLAYER_R)
                    b["x"] = clamp(b["x"], PLAYER_R, ARENA_W - PLAYER_R)
                    b["y"] = clamp(b["y"], PLAYER_R, ARENA_H - PLAYER_R)
                    a["x"], a["y"] = circle_obstacle_resolve(a["x"], a["y"])
                    b["x"], b["y"] = circle_obstacle_resolve(b["x"], b["y"])
                    if dist < TAG_DIST:
                        if i == self.crown_index and j != self.crown_index:
                            self.crown_index = j
                        elif j == self.crown_index and i != self.crown_index:
                            self.crown_index = i

        now_real = time.monotonic() * 1000
        if now_real >= self.end_at:
            self.running = False

    def state_json(self) -> dict[str, Any]:
        now_real = time.monotonic() * 1000
        left = max(0, int(self.end_at - now_real))
        return {
            "type": "state",
            "crownIndex": self.crown_index,
            "timeLeftMs": left,
            "running": self.running,
            "players": [
                {
                    "x": p["x"],
                    "y": p["y"],
                    "human": p["human"],
                    "name": p["name"],
                    "color": p["color"],
                    "faceDir": p["faceDir"],
                    "bob": p["bob"],
                }
                for p in self.players
            ],
        }


game = Game()


async def broadcast(msg: str) -> None:
    dead = []
    for ws in list(game.clients.keys()):
        try:
            await ws.send(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        await unregister(ws)


async def unregister(ws: Any) -> None:
    if ws not in game.clients:
        return
    slot = game.clients.pop(ws)
    async with game.lock:
        game.human_connected[slot] = False
        if game.players:
            game.players[slot]["human"] = False
            game.players[slot]["name"] = f"Roboter {slot + 1}"
        if not game.clients:
            game.players = []
            game.running = False


async def handler(ws: Any) -> None:
    global game
    # freier Slot
    slot = None
    async with game.lock:
        for i in range(TOTAL_PLAYERS):
            if not game.human_connected[i]:
                slot = i
                break
        if slot is None:
            await ws.send(json.dumps({"type": "error", "msg": "Alle Plätze besetzt"}))
            await ws.close()
            return
        game.clients[ws] = slot
        game.human_connected[slot] = True
        if not game.players:
            game.duration_ms = GAME_DURATION_MS
            game.reset()
        else:
            game.players[slot]["human"] = True
            game.players[slot]["name"] = f"Spieler {slot + 1}"

    await ws.send(json.dumps({"type": "welcome", "slot": slot, "durationMs": game.duration_ms}))
    try:
        async for raw in ws:
            data = json.loads(raw)
            if data.get("type") == "input":
                s = game.clients.get(ws)
                if s is None:
                    continue
                game.inputs[s]["dx"] = float(data.get("dx", 0))
                game.inputs[s]["dy"] = float(data.get("dy", 0))
            elif data.get("type") == "restart":
                async with game.lock:
                    if game.clients and game.players:
                        game.reset()
    finally:
        await unregister(ws)


async def tick_loop() -> None:
    dt = 1 / 60
    while True:
        await asyncio.sleep(dt)
        async with game.lock:
            if not game.clients:
                game.running = False
                game.players = []
                game.game_over_sent = False
                continue
            if not game.players:
                game.reset()
            now_ms = time.monotonic() * 1000
            was_running = game.running
            game.tick(dt, now_ms)
            payload = json.dumps(game.state_json())
            if not game.running and was_running and game.players and not game.game_over_sent:
                game.game_over_sent = True
                w = game.players[game.crown_index]
                over = json.dumps({"type": "game_over", "winner": w["name"]})
                await broadcast(payload)
                await broadcast(over)
            elif game.running:
                await broadcast(payload)


async def main() -> None:
    game.duration_ms = GAME_DURATION_MS
    async with websockets.serve(handler, "0.0.0.0", WS_PORT):
        print(f"Krone Spiel Server ws://0.0.0.0:{WS_PORT}")
        print("Im Spiel „Online“ wählen und dieselbe Adresse eintragen (IP dieses Rechners).")
        await tick_loop()


if __name__ == "__main__":
    asyncio.run(main())
