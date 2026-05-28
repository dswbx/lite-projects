import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

type Project = { id: string; name: string; owner_id: string }
type Task = { id: string; project_id: string; title: string; status: 'todo' | 'in_progress' | 'done' }

const supabase = createClient(window.location.origin, 'local-dev-key')
const statuses: Task['status'][] = ['todo', 'in_progress', 'done']

const getUserId = () => {
  const key = 'board_user_id'
  let v = localStorage.getItem(key)
  if (!v) {
    v = crypto.randomUUID()
    localStorage.setItem(key, v)
  }
  return v
}

export default function App() {
  const userId = useMemo(() => getUserId(), [])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectName, setProjectName] = useState('')
  const [taskTitle, setTaskTitle] = useState('')

  const load = async () => {
    const { data: p } = await supabase.from('projects').select('*').eq('owner_id', userId).order('created_at')
    setProjects((p as Project[]) ?? [])
    if (!selectedProjectId && p?.[0]?.id) setSelectedProjectId(p[0].id)
  }

  const loadTasks = async (projectId: string) => {
    if (!projectId) return setTasks([])
    const { data } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at')
    setTasks((data as Task[]) ?? [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadTasks(selectedProjectId) }, [selectedProjectId])

  const addProject = async () => {
    if (!projectName.trim()) return
    await supabase.from('projects').insert({ name: projectName.trim(), owner_id: userId })
    setProjectName('')
    await load()
  }

  const addTask = async () => {
    if (!taskTitle.trim() || !selectedProjectId) return
    await supabase.from('tasks').insert({ title: taskTitle.trim(), project_id: selectedProjectId, status: 'todo' })
    setTaskTitle('')
    await loadTasks(selectedProjectId)
  }

  const onDrop = async (taskId: string, status: Task['status']) => {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    await loadTasks(selectedProjectId)
  }

  return (
    <main style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 20 }}>
      <h1>My Project Board</h1>
      <p>User workspace id: <code>{userId}</code></p>
      <section>
        <h2>Projects</h2>
        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder='New project name' />
        <button onClick={addProject}>Create project</button>
        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
          <option value=''>Select a project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </section>
      <section>
        <h2>Tasks</h2>
        <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder='Task title' />
        <button onClick={addTask} disabled={!selectedProjectId}>Add task</button>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 20 }}>
        {statuses.map((status) => (
          <div key={status} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e.dataTransfer.getData('text/task-id'), status)} style={{ border: '1px solid #ccc', minHeight: 160, borderRadius: 8, padding: 8 }}>
            <h3>{status.replace('_', ' ')}</h3>
            {tasks.filter((t) => t.status === status).map((t) => (
              <article key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/task-id', t.id)} style={{ background: '#f4f4f4', marginBottom: 8, padding: 8, borderRadius: 6, cursor: 'grab' }}>
                {t.title}
              </article>
            ))}
          </div>
        ))}
      </section>
    </main>
  )
}
