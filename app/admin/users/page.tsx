"use client"
import { useState, useEffect } from "react"

const C = {
  bg:"#0a0a0f",surface:"#111827",border:"#1e3a5f",accent:"#3b82f6",
  text:"#e2e8f0",textMuted:"#94a3b8",textDim:"#64748b",danger:"#ef4444",inputBg:"#0f172a"
}

type User = { username: string; password: string }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [newUser, setNewUser] = useState({ username: "", password: "" })
  const [showPw, setShowPw] = useState<Record<number, boolean>>({})
  const [showNewPw, setShowNewPw] = useState(false)

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setLoading(false) })
  }, [])

  const save = async (updated: User[]) => {
    setSaving(true)
    setMsg("")
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users: updated })
    })
    const d = await r.json()
    setSaving(false)
    if (d.success) { setMsg("✅ Users saved successfully!"); setUsers(updated) }
    else setMsg("❌ " + (d.error || "Save failed"))
  }

  const addUser = () => {
    if (!newUser.username.trim() || !newUser.password.trim()) return
    if (users.find(u => u.username === newUser.username)) {
      setMsg("❌ Username already exists"); return
    }
    const updated = [...users, { username: newUser.username.trim(), password: newUser.password.trim() }]
    setNewUser({ username: "", password: "" })
    save(updated)
  }

  const removeUser = (username: string) => {
    if (!confirm(`Remove user "${username}"?`)) return
    save(users.filter(u => u.username !== username))
  }

  const updatePassword = (idx: number, pw: string) => {
    const updated = users.map((u, i) => i === idx ? { ...u, password: pw } : u)
    setUsers(updated)
  }

  return (
    <div style={{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"system-ui,sans-serif" }}>
      <div style={{ maxWidth:"600px",margin:"0 auto",padding:"32px 16px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"16px",marginBottom:"28px" }}>
          <a href="/admin/documents" style={{ color:C.textMuted,textDecoration:"none",fontSize:"14px" }}>← Back</a>
          <h1 style={{ margin:0,fontSize:"22px",fontWeight:700 }}>👥 Manage Users</h1>
        </div>

        {msg && <div style={{ background: msg.startsWith("✅") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.startsWith("✅") ? "#22c55e" : C.danger}`, borderRadius:"8px", padding:"10px 14px", marginBottom:"20px", fontSize:"14px", color: msg.startsWith("✅") ? "#22c55e" : C.danger }}>{msg}</div>}

        {/* Existing users */}
        <div style={{ marginBottom:"28px" }}>
          <h2 style={{ fontSize:"15px",fontWeight:600,color:C.textMuted,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:"0.05em" }}>Current Users</h2>
          {loading && <div style={{ color:C.textMuted }}>Loading...</div>}
          {!loading && users.length === 0 && <div style={{ color:C.textMuted,fontSize:"14px" }}>No users configured yet.</div>}
          <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
            {users.map((u, i) => (
              <div key={u.username} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"14px 16px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
                <span style={{ fontWeight:600,fontSize:"14px",minWidth:"100px" }}>{u.username}</span>
                <div style={{ position:"relative",flex:1,minWidth:"150px" }}>
                  <input
                    type={showPw[i] ? "text" : "password"}
                    value={u.password}
                    onChange={e => updatePassword(i, e.target.value)}
                    style={{ width:"100%",padding:"7px 36px 7px 10px",background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:"6px",color:C.text,fontSize:"13px",boxSizing:"border-box" as const }}
                  />
                  <button type="button" onClick={() => setShowPw(p=>({...p,[i]:!p[i]}))} style={{ position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textMuted,fontSize:"15px" }}>{showPw[i]?"🙈":"👁"}</button>
                </div>
                <button onClick={() => save(users)} disabled={saving} style={{ background:C.accent,color:"#fff",border:"none",borderRadius:"6px",padding:"7px 14px",cursor:"pointer",fontSize:"13px",fontWeight:500 }}>Save</button>
                <button onClick={() => removeUser(u.username)} style={{ background:"rgba(239,68,68,0.15)",color:C.danger,border:`1px solid ${C.danger}`,borderRadius:"6px",padding:"7px 12px",cursor:"pointer",fontSize:"13px" }}>Remove</button>
              </div>
            ))}
          </div>
        </div>

        {/* Add new user */}
        <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"12px",padding:"20px" }}>
          <h2 style={{ fontSize:"15px",fontWeight:600,color:C.textMuted,margin:"0 0 16px",textTransform:"uppercase",letterSpacing:"0.05em" }}>Add New User</h2>
          <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
            <input type="text" placeholder="Username" value={newUser.username} onChange={e=>setNewUser(v=>({...v,username:e.target.value}))}
              style={{ padding:"10px 14px",background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:"8px",color:C.text,fontSize:"14px",outline:"none" }} />
            <div style={{ position:"relative" }}>
              <input type={showNewPw?"text":"password"} placeholder="Password" value={newUser.password} onChange={e=>setNewUser(v=>({...v,password:e.target.value}))}
                style={{ width:"100%",padding:"10px 40px 10px 14px",background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:"8px",color:C.text,fontSize:"14px",outline:"none",boxSizing:"border-box" as const }} />
              <button type="button" onClick={()=>setShowNewPw(v=>!v)} style={{ position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textMuted,fontSize:"17px" }}>{showNewPw?"🙈":"👁"}</button>
            </div>
            <button onClick={addUser} disabled={saving||!newUser.username||!newUser.password}
              style={{ padding:"11px",background:C.accent,color:"#fff",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:600,cursor:"pointer",opacity:(!newUser.username||!newUser.password)?0.5:1 }}>
              {saving ? "Saving..." : "Add User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
