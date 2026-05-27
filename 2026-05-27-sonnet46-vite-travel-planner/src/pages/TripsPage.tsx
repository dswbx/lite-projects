import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, type Trip } from '../lib/supabase'
import TripCard from '../components/TripCard'
import TripForm from '../components/TripForm'

type Props = {
  user: User
  onSelectTrip: (tripId: string) => void
}

export default function TripsPage({ user, onSelectTrip }: Props) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const loadTrips = useCallback(async () => {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('start_date', { ascending: true })

    if (!error && data) setTrips(data as Trip[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTrips()
  }, [loadTrips])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  async function handleDeleteTrip(tripId: string) {
    await supabase.from('trips').delete().eq('id', tripId)
    setTrips((prev) => prev.filter((t) => t.id !== tripId))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="font-bold text-slate-900 text-lg">Travel Planner</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">My Trips</h2>
            <p className="text-slate-500 text-sm mt-0.5">{trips.length} trip{trips.length !== 1 ? 's' : ''} planned</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Trip
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex w-16 h-16 bg-indigo-50 rounded-2xl items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No trips yet</h3>
            <p className="text-slate-400 mb-6">Start planning your first adventure!</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Create your first trip
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => onSelectTrip(trip.id)}
                onDelete={() => handleDeleteTrip(trip.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <TripForm
          userId={user.id}
          onClose={() => setShowForm(false)}
          onSaved={(trip) => {
            setTrips((prev) => [...prev, trip].sort((a, b) => a.start_date.localeCompare(b.start_date)))
            setShowForm(false)
          }}
        />
      )}
    </div>
  )
}
