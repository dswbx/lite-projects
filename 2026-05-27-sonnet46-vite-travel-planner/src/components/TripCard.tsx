import type { Trip } from '../lib/supabase'

type Props = {
  trip: Trip
  onClick: () => void
  onDelete: () => void
}

const DESTINATION_COLORS = [
  'from-violet-500 to-purple-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
]

function colorForTrip(id: string) {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return DESTINATION_COLORS[sum % DESTINATION_COLORS.length]
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function daysCount(start: string, end: string) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export default function TripCard({ trip, onClick, onDelete }: Props) {
  const color = colorForTrip(trip.id)
  const days = daysCount(trip.start_date, trip.end_date)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm(`Delete trip "${trip.title}"? This cannot be undone.`)) {
      onDelete()
    }
  }

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
    >
      <div className={`bg-gradient-to-br ${color} h-24 relative flex items-end p-4`}>
        <div className="absolute top-3 right-3">
          <button
            onClick={handleDelete}
            className="w-7 h-7 bg-white/20 hover:bg-white/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <div className="text-white">
          <div className="flex items-center gap-1.5 text-white/80 text-xs mb-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {trip.destination}
          </div>
          <h3 className="font-bold text-base leading-tight">{trip.title}</h3>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(trip.start_date)} &ndash; {formatDate(trip.end_date)}
          </div>
          <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {days} day{days !== 1 ? 's' : ''}
          </span>
        </div>
        {trip.notes && (
          <p className="text-xs text-slate-400 mt-2 truncate">{trip.notes}</p>
        )}
      </div>
    </div>
  )
}
