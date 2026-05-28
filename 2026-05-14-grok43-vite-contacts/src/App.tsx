import { useState, useEffect } from 'react'
import { createClient, User, Session } from '@supabase/supabase-js'
import { Plus, Search, Edit2, Trash2, X, LogOut, User as UserIcon } from 'lucide-react'

const supabase = createClient(window.location.origin, 'any-string-works-for-now')

interface Contact {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      fetchContacts()
    } else {
      setContacts([])
    }
  }, [user])

  async function fetchContacts() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setContacts(data as Contact[])
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function openAddModal() {
    setEditingContact(null)
    setFormData({ name: '', email: '', phone: '', notes: '' })
    setIsModalOpen(true)
  }

  function openEditModal(contact: Contact) {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      notes: contact.notes || ''
    })
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingContact(null)
    setFormData({ name: '', email: '', phone: '', notes: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim() || !user) return

    setLoading(true)

    const contactData = {
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      notes: formData.notes.trim() || null,
      user_id: user.id
    }

    if (editingContact) {
      const { error } = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', editingContact.id)

      if (!error) {
        await fetchContacts()
        closeModal()
      }
    } else {
      const { error } = await supabase.from('contacts').insert(contactData)

      if (!error) {
        await fetchContacts()
        closeModal()
      }
    }

    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return

    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (!error) {
      await fetchContacts()
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password
        })
        if (error) throw error
      }
      setAuthForm({ email: '', password: '' })
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4">
              <UserIcon className="w-8 h-8 text-zinc-950" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">Contacts</h1>
            <p className="text-zinc-400 mt-2">Your private contact book</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-8 shadow-xl">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-2xl transition ${authMode === 'signin' ? 'bg-white text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              >
                Sign in
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-2xl transition ${authMode === 'signup' ? 'bg-white text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                  required
                  minLength={6}
                />
              </div>

              {authError && (
                <p className="text-red-400 text-sm">{authError}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-zinc-950 font-medium py-3 rounded-2xl hover:bg-zinc-200 active:bg-white transition disabled:opacity-50"
              >
                {loading ? 'Please wait...' : authMode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-xs text-zinc-500 mt-6">
              Private by default. Only you can see your contacts.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">Contacts</div>
              <div className="text-[10px] text-zinc-500 -mt-0.5">private</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="text-zinc-400">{user?.email}</div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 transition"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 pt-8 pb-24">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-5xl font-semibold tracking-tighter">Your contacts</h1>
            <p className="text-zinc-400 mt-1">{contacts.length} saved</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-white text-zinc-950 px-5 py-2.5 rounded-2xl font-medium hover:bg-zinc-200 active:bg-white transition"
          >
            <Plus className="w-4 h-4" /> Add contact
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 pl-11 pr-4 py-3 rounded-2xl text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            {searchTerm ? 'No contacts match your search.' : 'No contacts yet. Add your first one!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 group">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-xl tracking-tight">{contact.name}</div>
                    {contact.email && <div className="text-sm text-zinc-400 mt-0.5">{contact.email}</div>}
                    {contact.phone && <div className="text-sm text-zinc-400">{contact.phone}</div>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openEditModal(contact)} className="p-2 hover:bg-zinc-800 rounded-xl">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(contact.id)} className="p-2 hover:bg-zinc-800 rounded-xl text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {contact.notes && (
                  <div className="mt-4 text-sm text-zinc-400 border-l-2 border-zinc-800 pl-3 leading-snug">
                    {contact.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50" onClick={closeModal}>
          <div className="bg-zinc-900 rounded-3xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">{editingContact ? 'Edit contact' : 'New contact'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-zinc-800 rounded-xl"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full resize-y bg-zinc-950 border border-zinc-800 rounded-3xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition">Cancel</button>
                <button type="submit" disabled={loading || !formData.name.trim()} className="flex-1 py-3 rounded-2xl bg-white text-zinc-950 font-medium disabled:opacity-50 hover:bg-zinc-200 transition">
                  {loading ? 'Saving...' : editingContact ? 'Save changes' : 'Add contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
