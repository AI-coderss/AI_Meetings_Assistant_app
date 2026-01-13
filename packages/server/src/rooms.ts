import type mediasoup from 'mediasoup'

interface Peer {
  id: string
  name?: string
}

interface Room {
  id: string
  router?: mediasoup.types.Router
  peers: Map<string, Peer>
}

const rooms = new Map<string, Room>()

export function createRoom(id: string) {
  if (rooms.has(id)) return rooms.get(id)!
  const r: Room = { id, peers: new Map() }
  rooms.set(id, r)
  return r
}

export function getRoom(id: string) {
  return rooms.get(id)
}

export function setRoomRouter(id: string, router: mediasoup.types.Router) {
  const room = rooms.get(id) || createRoom(id)
  room.router = router
}

export function addPeerToRoom(roomId: string, peer: Peer) {
  const room = rooms.get(roomId) || createRoom(roomId)
  room.peers.set(peer.id, peer)
  return room
}

export function removePeerFromRoom(roomId: string, peerId: string) {
  const room = rooms.get(roomId)
  if (!room) return
  room.peers.delete(peerId)
  if (room.peers.size === 0) {
    // cleanup router if present
    if (room.router) {
      try { room.router.close() } catch (err) { /* ignore */ }
    }
    rooms.delete(roomId)
  }
}

export function listPeers(roomId: string) {
  const room = rooms.get(roomId)
  if (!room) return []
  return Array.from(room.peers.values())
}
