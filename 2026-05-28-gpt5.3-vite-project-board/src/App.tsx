import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

type Status = 'todo' | 'in_progress' | 'done'
type Project = { id: string; name: string; owner_id: string; created_at?: string }
type Task = { id: string; project_id: string; title: string; status: Status; created_at?: string }

const createProjectBoardClient = () => createClient(window.location.origin, 'local-dev-key')
type ProjectBoardClient = ReturnType<typeof createProjectBoardClient>

declare global {
  var projectBoardSupabase: ProjectBoardClient | undefined
}

const supabase = globalThis.projectBoardSupabase ?? createProjectBoardClient()
globalThis.projectBoardSupabase = supabase
const statuses: Array<{ id: Status; label: string; shortLabel: string; hint: string }> = [
  { id: 'todo', label: 'To do', shortLabel: 'Todo', hint: 'Queued work' },
  { id: 'in_progress', label: 'In progress', shortLabel: 'Doing', hint: 'Active now' },
  { id: 'done', label: 'Done', shortLabel: 'Done', hint: 'Finished' },
]

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
  const [projectsReady, setProjectsReady] = useState(false)
  const [loadedTaskProjectId, setLoadedTaskProjectId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const selectedProjectTasks = tasks.filter((task) => task.project_id === selectedProjectId)
  const tasksReady = loadedTaskProjectId === selectedProjectId
  const totalTasks = selectedProjectTasks.length

  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as Project[]) ?? []
  }, [userId])

  const fetchTasks = useCallback(async (projectId: string) => {
    if (!projectId) return []

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as Task[]) ?? []
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchProjects()
      .then((projectList) => {
        if (cancelled) return
        setProjects(projectList)
        setSelectedProjectId((current) => {
          if (current && projectList.some((project) => project.id === current)) return current
          return projectList[0]?.id ?? ''
        })
        setMessage('')
      })
      .catch((error: Error) => {
        if (cancelled) return
        setMessage(`Project data could not load: ${error.message}`)
      })
      .finally(() => {
        if (!cancelled) setProjectsReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [fetchProjects])

  useEffect(() => {
    let cancelled = false

    fetchTasks(selectedProjectId)
      .then((taskList) => {
        if (cancelled) return
        setTasks(taskList)
        setLoadedTaskProjectId(selectedProjectId)
        setMessage('')
      })
      .catch((error: Error) => {
        if (cancelled) return
        setLoadedTaskProjectId(selectedProjectId)
        setMessage(`Tasks could not load: ${error.message}`)
      })

    return () => {
      cancelled = true
    }
  }, [fetchTasks, selectedProjectId])

  const addProject = async () => {
    const name = projectName.trim()
    if (!name) return

    const { data, error } = await supabase
      .from('projects')
      .insert({ name, owner_id: userId })
      .select('*')
      .single()

    if (error) {
      setMessage(`Project could not be created: ${error.message}`)
      return
    }

    const project = data as Project
    setProjects((current) => [...current, project])
    setSelectedProjectId(project.id)
    setProjectName('')
    setMessage('')
  }

  const addTask = async () => {
    const title = taskTitle.trim()
    if (!title || !selectedProjectId) return

    const { data, error } = await supabase
      .from('tasks')
      .insert({ title, project_id: selectedProjectId, status: 'todo' })
      .select('*')
      .single()

    if (error) {
      setMessage(`Task could not be added: ${error.message}`)
      return
    }

    setTasks((current) => [...current, data as Task])
    setLoadedTaskProjectId(selectedProjectId)
    setTaskTitle('')
    setMessage('')
  }

  const onDrop = async (taskId: string, status: Status) => {
    if (!taskId) return

    const previousTasks = tasks
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)))

    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)

    if (error) {
      setTasks(previousTasks)
      setMessage(`Task could not be moved: ${error.message}`)
      return
    }

    setMessage('')
  }

  return (
    <main className="app-shell">
      <aside className="project-rail" aria-label="Projects">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">PB</span>
          <div>
            <p className="eyebrow">Local workspace</p>
            <h1>Project Board</h1>
          </div>
        </div>

        <form
          className="stacked-form"
          onSubmit={(event) => {
            event.preventDefault()
            void addProject()
          }}
        >
          <label htmlFor="project-name">New project</label>
          <div className="input-row">
            <input
              id="project-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Campaign plan"
            />
            <button type="submit">Create</button>
          </div>
        </form>

        <div className="project-list" role="list" aria-label="Saved projects">
          {!projectsReady && <p className="muted">Loading projects...</p>}
          {projectsReady && projects.length === 0 && (
            <p className="empty-copy">Create a project to start your first board.</p>
          )}
          {projects.map((project) => (
            <button
              className={project.id === selectedProjectId ? 'project-button active' : 'project-button'}
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              type="button"
            >
              <span>{project.name}</span>
              <small>{project.id === selectedProjectId ? `${totalTasks} tasks` : 'Open'}</small>
            </button>
          ))}
        </div>

        <p className="workspace-id">Workspace <code>{userId.slice(0, 8)}</code></p>
      </aside>

      <section className="board-pane" aria-label="Task board">
        <header className="board-header">
          <div>
            <p className="eyebrow">Current project</p>
            <h2>{selectedProject?.name ?? 'No project selected'}</h2>
          </div>
          <div className="board-stats" aria-label="Project task totals">
            <span>{projects.length} projects</span>
            <span>{totalTasks} tasks</span>
          </div>
        </header>

        <form
          className="task-composer"
          onSubmit={(event) => {
            event.preventDefault()
            void addTask()
          }}
        >
          <label htmlFor="task-title">Add task</label>
          <input
            id="task-title"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder={selectedProjectId ? 'Write the next task' : 'Create or choose a project first'}
            disabled={!selectedProjectId}
          />
          <button type="submit" disabled={!selectedProjectId}>Add</button>
        </form>

        {message && <p className="status-message" role="status">{message}</p>}

        <div className="kanban-grid">
          {statuses.map((status) => {
            const columnTasks = selectedProjectTasks.filter((task) => task.status === status.id)

            return (
              <section
                className="kanban-column"
                key={status.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => void onDrop(event.dataTransfer.getData('text/task-id'), status.id)}
              >
                <header>
                  <div>
                    <h3>{status.label}</h3>
                    <p>{status.hint}</p>
                  </div>
                  <span>{columnTasks.length}</span>
                </header>

                <div className="task-stack">
                  {!tasksReady && <p className="muted">Loading...</p>}
                  {tasksReady && columnTasks.length === 0 && (
                    <p className="drop-copy">Drop tasks here</p>
                  )}
                  {columnTasks.map((task) => (
                    <article
                      className="task-card"
                      draggable
                      key={task.id}
                      onDragStart={(event) => event.dataTransfer.setData('text/task-id', task.id)}
                    >
                      <span>{task.title}</span>
                      <div className="status-switch" aria-label={`Move ${task.title}`}>
                        {statuses.map((option) => (
                          <button
                            disabled={option.id === task.status}
                            key={option.id}
                            onClick={() => void onDrop(task.id, option.id)}
                            type="button"
                          >
                            {option.shortLabel}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </section>
    </main>
  )
}
