"""
WebSocket real-time sync endpoint.
Broadcasts data change events to all connected clients so dashboards
stay in sync without manual refresh.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
import asyncio

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts messages."""

    def __init__(self):
        # user_id -> List[WebSocket]
        self.user_connections: Dict[int, List[WebSocket]] = {}
        # websocket -> user_id (for easy cleanup)
        self.connection_to_user: Dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)
        self.connection_to_user[websocket] = user_id
        
        print(f"[WS] User {user_id} connected. Active users: {len(self.user_connections)}")
        
        # Notify everyone that presence changed
        await self.broadcast_presence()

    async def disconnect(self, websocket: WebSocket):
        user_id = self.connection_to_user.get(websocket)
        if user_id:
            if websocket in self.user_connections.get(user_id, []):
                self.user_connections[user_id].remove(websocket)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            del self.connection_to_user[websocket]
        
        print(f"[WS] User {user_id} disconnected. Active users: {len(self.user_connections)}")
        
        # Notify everyone that presence changed
        await self.broadcast_presence()

    async def broadcast(self, message: Dict[str, Any]):
        """Send a message to all connected clients."""
        payload = json.dumps(message)
        for user_id, connections in list(self.user_connections.items()):
            for connection in list(connections):
                try:
                    await connection.send_text(payload)
                except Exception:
                    await self.disconnect(connection)

    async def broadcast_presence(self):
        """Broadcast the list of currently online user IDs."""
        online_users = list(self.user_connections.keys())
        await self.broadcast({
            "event": "presence_update",
            "online_user_ids": online_users
        })

    async def send_personal(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send a message to a specific client."""
        await websocket.send_text(json.dumps(message))


# Singleton manager — imported by other API modules to broadcast events
manager = ConnectionManager()


@router.websocket("/ws/sync")
async def websocket_sync(websocket: WebSocket, user_id: int = None):
    """
    Main WebSocket endpoint for real-time data sync and presence.
    
    Query Params:
        user_id: The ID of the authenticated user.
    """
    if user_id is None:
        # Check query params manually if FastAPI injection fails
        try:
            user_id = int(websocket.query_params.get("user_id", 0))
        except:
            user_id = 0

    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await manager.send_personal(websocket, {"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS] Error in loop: {e}")
        await manager.disconnect(websocket)


async def broadcast_change(entity: str, action: str, data: Any = None):
    """
    Helper function to broadcast a data change event.
    Call from any API endpoint after a successful mutation.
    
    Example:
        await broadcast_change("enrollment", "create", {"session_id": 1, "user_id": 5})
    """
    await manager.broadcast({
        "event": "data_changed",
        "entity": entity,
        "action": action,
        "data": data,
    })
