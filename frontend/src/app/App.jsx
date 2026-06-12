import "./App.css"
import { Editor } from "@monaco-editor/react"
import { MonacoBinding } from "y-monaco"
import { useRef, useMemo, useState, useEffect } from "react"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"

function App() {
  const editorRef = useRef(null)
  
  // URL check: Automatically reads and keeps the username when refreshing the page
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || ""
  })
  const [users, setUsers] = useState([]) 

  const ydoc = useMemo(() => new Y.Doc(), []) 
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]) 

  const handleMount = (editor) => {
    editorRef.current = editor 

    // Binds Monaco directly here where the editor instance is guaranteed to exist
    new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor])
    )
  }

  const handleJoin = (e) => {
    e.preventDefault()
    const nameValue = e.target.username.value.trim()
    if (nameValue) {
      setUsername(nameValue) 
      window.history.pushState({}, "", "?username=" + nameValue)
    }
  }

  useEffect(() => {
    if (!username) return

    const provider = new SocketIOProvider("/", "monaco", ydoc, {
      autoConnect: true,
    }) 

    provider.awareness.setLocalStateField("user", { username }) 

    // Deep fallback parser to read names from the backend registry safely
    const updateUsersList = () => {
      const currentStates = Array.from(provider.awareness.getStates().values())
      const parsedUsers = currentStates.map(state => {
        if (state && state.user && state.user.username) return { username: state.user.username }
        if (state && state.username) return { username: state.username }
        if (typeof state?.user === "string") return { username: state.user }
        return null
      }).filter(Boolean)

      setUsers(parsedUsers)
    }

    // Trigger instantly upon connect
    updateUsersList()

    // Listen to incoming live room updates
    provider.awareness.on("change", updateUsersList)

    function handleBeforeUnload() {
      provider.awareness.setLocalStateField("user", null)
    } 

    window.addEventListener("beforeunload", handleBeforeUnload) 

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload) 
      provider.disconnect()
    }
  }, [username, ydoc])

  // 1. Conditional login view (If user hasn't joined yet)
  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center">
        <form onSubmit={handleJoin} className="flex flex-col gap-4 w-80">
          <input
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-amber-50"
            name="username"
            required
            autoComplete="off"
          />
          <button
            type="submit"
            className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold hover:bg-amber-100 transition-colors"
          >
            Join
          </button>
        </form>      
      </main>
    )
  }

  // 2. Active workspace view (Matches tutor layout perfectly)
  // Active workspace view (Original cream color scheme shifted to the left)
  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
      
      {/* SIDE PANEL ON THE LEFT HAND SIDE */}
      <aside className="h-full w-1/4 bg-amber-50 rounded-lg flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-300">
          <h2 className="text-2xl font-bold text-gray-950">Users</h2>
        </div>
        
        <ul className="p-4 flex flex-col gap-2 overflow-y-auto flex-1">
          {users.map((user, index) => (
            <li 
              key={index} 
              className="p-2 bg-gray-800 text-white rounded mb-2 text-sm font-medium"
            >
              {user.username}
            </li>
          ))}
        </ul>
      </aside>

      {/* CODE EDITOR CONTAINER ON THE RIGHT */}
      <section className="w-3/4 bg-neutral-800 rounded-lg overflow-hidden">
        <Editor 
          height="100%" 
          defaultLanguage="javascript" 
          defaultValue="// start coding here" 
          theme="vs-dark"
          onMount={handleMount}
        />
      </section>

    </main>
  )
}

export default App