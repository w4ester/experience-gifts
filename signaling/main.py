# WebRTC Signaling Server for Experience Gifts
# Simple room-code based signaling - no giant SDP blobs to copy!

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import secrets
from datetime import datetime, timedelta

app = FastAPI(title="Experience Gifts Signaling")

# CORS - allow the frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory room storage (rooms auto-expire)
rooms: dict = {}


class Room:
    def __init__(self, offer: str):
        self.offer = offer
        self.answer = None
        self.created = datetime.now()


class SDPData(BaseModel):
    sdp: str


def generate_code() -> str:
    """Generate a friendly 4-character room code"""
    # Use only uppercase letters and numbers, avoid confusing chars (0/O, 1/I/L)
    chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(chars) for _ in range(4))


def cleanup_old_rooms():
    """Remove rooms older than 5 minutes"""
    cutoff = datetime.now() - timedelta(minutes=5)
    expired = [code for code, room in rooms.items() if room.created < cutoff]
    for code in expired:
        del rooms[code]


# === API Endpoints ===

@app.post("/create")
async def create_room(data: SDPData):
    """Host creates a room with their WebRTC offer"""
    cleanup_old_rooms()

    # Generate unique code
    code = generate_code()
    attempts = 0
    while code in rooms and attempts < 10:
        code = generate_code()
        attempts += 1

    rooms[code] = Room(offer=data.sdp)
    return {"code": code}


@app.get("/join/{code}")
async def get_offer(code: str):
    """Guest retrieves the host's offer to create their answer"""
    code = code.upper().strip()
    if code not in rooms:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    return {"offer": rooms[code].offer}


@app.post("/answer/{code}")
async def submit_answer(code: str, data: SDPData):
    """Guest submits their WebRTC answer"""
    code = code.upper().strip()
    if code not in rooms:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    rooms[code].answer = data.sdp
    return {"success": True}


@app.get("/answer/{code}")
async def get_answer(code: str):
    """Host polls for guest's answer"""
    code = code.upper().strip()
    if code not in rooms:
        raise HTTPException(status_code=404, detail="Room not found or expired")

    if not rooms[code].answer:
        # Still waiting - return 202 Accepted
        raise HTTPException(status_code=202, detail="Waiting for guest")

    # Got the answer - return it and clean up
    answer = rooms[code].answer
    del rooms[code]
    return {"answer": answer}


@app.get("/health")
async def health():
    """Health check endpoint"""
    cleanup_old_rooms()
    return {"status": "ok", "active_rooms": len(rooms)}


@app.get("/")
async def root():
    return {"service": "Experience Gifts Signaling", "status": "running"}
