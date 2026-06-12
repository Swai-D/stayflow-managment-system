import { Room } from '@/types/room'
import RoomCard from './RoomCard'

interface Props {
  rooms: Room[]
  onRoomClick: (room: Room) => void
}

export default function RoomGrid({ rooms, onRoomClick }: Props) {
  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">Hakuna vyumba vinavyopatikana</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
      {rooms.map(room => (
        <RoomCard
          key={room.id}
          room={room}
          onClick={() => onRoomClick(room)}
        />
      ))}
    </div>
  )
}
