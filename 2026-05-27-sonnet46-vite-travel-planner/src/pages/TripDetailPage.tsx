import { useState, useEffect, useCallback } from 'react'
import { supabase, type Trip, type TripDay, type Activity, type PackingItem } from '../lib/supabase'
import ActivityForm from '../components/ActivityForm'
import PackingChecklist from '../components/PackingChecklist'
import DayNotes from '../components/DayNotes'

type Props = {
  tripId: string
  onBack: () => void
}

type Tab = 'itinerary' | 'packing'

export default function TripDetailPage({ tripId, onBack }: Props) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [days, setDays] = useState<TripDay[]>([])
  const [activitiesByDay, setActivitiesByDay] = useState<Record<string, Activity[]>>({})
  const [packingItems, setPackingItems] = useState<PackingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('itinerary')
  const [addingActivityForDay, setAddingActivityForDay] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [tripRes, daysRes, packingRes] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase.from('trip_days').select('*').eq('trip_id', tripId).order('day_date'),
      supabase.from('packing_items').select('*').eq('trip_id', tripId).order('category').order('name'),
    ])

    if (tripRes.data) setTrip(tripRes.data as Trip)

    let finalDays: TripDay[] = []
    if (daysRes.data) {
      finalDays = daysRes.data as TripDay[]
      setDays(finalDays)

      // generate days if there are none
      if (finalDays.length === 0 && tripRes.data) {
        const t = tripRes.data as Trip
        finalDays = await generateDays(t)
      }
    }

    // load activities for all days of this trip
    if (finalDays.length > 0) {
      const dayIds = finalDays.map((d) => d.id)
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .in('trip_day_id', dayIds)
        .order('created_at')

      if (activitiesData) {
        const byDay: Record<string, Activity[]> = {}
        for (const a of activitiesData as Activity[]) {
          const dayId = a.trip_day_id
          if (!byDay[dayId]) byDay[dayId] = []
          byDay[dayId].push(a)
        }
        setActivitiesByDay(byDay)
      }
    }

    if (packingRes.data) setPackingItems(packingRes.data as PackingItem[])

    setLoading(false)
  }, [tripId])

  async function generateDays(t: Trip): Promise<TripDay[]> {
    const start = new Date(t.start_date + 'T00:00:00')
    const end = new Date(t.end_date + 'T00:00:00')
    const newDays: Omit<TripDay, 'created_at' | 'updated_at'>[] = []

    const cur = new Date(start)
    while (cur <= end) {
      newDays.push({
        id: crypto.randomUUID(),
        trip_id: t.id,
        day_date: cur.toISOString().slice(0, 10),
        notes: null,
      })
      cur.setDate(cur.getDate() + 1)
    }

    const { data } = await supabase.from('trip_days').insert(newDays).select('*')
    if (data) {
      setDays(data as TripDay[])
      return data as TripDay[]
    }
    return []
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleUpdateDayNotes(dayId: string, notes: string) {
    await supabase.from('trip_days').update({ notes }).eq('id', dayId)
    setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, notes } : d)))
  }

  async function handleAddActivity(dayId: string, activity: Omit<Activity, 'id' | 'trip_day_id' | 'created_at' | 'updated_at'>) {
    const newActivity = { ...activity, trip_day_id: dayId }
    const { data, error } = await supabase.from('activities').insert(newActivity).select('*').single()
    if (!error && data) {
      setActivitiesByDay((prev) => ({
        ...prev,
        [dayId]: [...(prev[dayId] ?? []), data as Activity],
      }))
    }
    setAddingActivityForDay(null)
  }

  async function handleDeleteActivity(dayId: string, activityId: string) {
    await supabase.from('activities').delete().eq('id', activityId)
    setActivitiesByDay((prev) => ({
      ...prev,
      [dayId]: (prev[dayId] ?? []).filter((a) => a.id !== activityId),
    }))
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  function tripDuration() {
    if (!trip) return ''
    const start = new Date(trip.start_date + 'T00:00:00')
    const end = new Date(trip.end_date + 'T00:00:00')
    const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return `${nights + 1} day${nights !== 0 ? 's' : ''}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Trip not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-lg truncate">{trip.title}</h1>
              <p className="text-slate-500 text-sm">
                {trip.destination} &middot; {formatDate(trip.start_date)} &ndash; {formatDate(trip.end_date)} &middot; {tripDuration()}
              </p>
            </div>
          </div>

          <div className="flex gap-1">
            {(['itinerary', 'packing'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  tab === t
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t === 'packing'
                  ? `Packing (${packingItems.filter((i) => i.packed).length}/${packingItems.length})`
                  : 'Itinerary'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {tab === 'itinerary' && (
          <div className="space-y-4">
            {days.map((day, idx) => (
              <div key={day.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                      Day {idx + 1}
                    </span>
                    <h3 className="font-semibold text-slate-800">{formatDate(day.day_date)}</h3>
                  </div>
                  <button
                    onClick={() => setAddingActivityForDay(day.id)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add activity
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <DayNotes
                    notes={day.notes ?? ''}
                    onSave={(notes) => handleUpdateDayNotes(day.id, notes)}
                  />

                  {(activitiesByDay[day.id] ?? []).length > 0 && (
                    <div className="space-y-2">
                      {(activitiesByDay[day.id] ?? []).map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl group"
                        >
                          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800 text-sm">{activity.title}</span>
                              {activity.time_of_day && (
                                <span className="text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
                                  {activity.time_of_day}
                                </span>
                              )}
                            </div>
                            {activity.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteActivity(day.id, activity.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(activitiesByDay[day.id] ?? []).length === 0 && !addingActivityForDay && (
                    <p className="text-slate-400 text-sm italic">No activities yet for this day</p>
                  )}
                </div>
              </div>
            ))}

            {days.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p>No days found for this trip.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'packing' && (
          <PackingChecklist
            tripId={tripId}
            items={packingItems}
            onItemsChange={setPackingItems}
          />
        )}
      </main>

      {addingActivityForDay && (
        <ActivityForm
          onClose={() => setAddingActivityForDay(null)}
          onSave={(activity) => handleAddActivity(addingActivityForDay, activity)}
        />
      )}
    </div>
  )
}
