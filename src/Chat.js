import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes msgIn  { from{opacity:0;transform:translateY(4px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes spin   { to{transform:rotate(360deg)} }

  .chat-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    height: calc(100vh - 56px);
    gap: 0;
    background: var(--bg);
    margin: -28px -32px;
  }
  @media(max-width:768px) {
    .chat-layout { grid-template-columns: 1fr; margin: -14px -12px; }
    .chat-sidebar { display: none; }
    .chat-sidebar.show { display: flex; position: fixed; left:56px; top:56px; bottom:0; width:calc(100vw - 56px); z-index:100; }
    .chat-main { display: flex; }
    .chat-back-btn { display: flex !important; }
  }

  .chat-sidebar {
    display: flex; flex-direction: column;
    background: var(--surface);
    border-right: 1px solid var(--border);
    overflow: hidden;
  }
  .chat-sidebar-header {
    padding: 16px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .chat-sidebar-title { font-size:15px; font-weight:800; color:var(--text-primary); }
  .chat-new-btn {
    width:32px; height:32px; border-radius:8px;
    background:var(--accent); color:#fff; border:none;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; font-size:18px; transition:all 0.15s;
  }
  .chat-new-btn:hover { background:var(--accent-dark); }

  .chat-search {
    padding: 10px 16px; border-bottom: 1px solid var(--border); flex-shrink:0;
  }
  .chat-search input {
    width:100%; padding:8px 12px; border-radius:8px;
    border:1px solid var(--border); background:var(--surface-2);
    color:var(--text-primary); font-size:13px; outline:none;
    font-family:inherit;
  }
  .chat-search input::placeholder { color:var(--text-faint); }

  .chat-list { flex:1; overflow-y:auto; }
  .chat-item {
    display:flex; align-items:center; gap:10px;
    padding:12px 16px; cursor:pointer;
    border-bottom:1px solid var(--border);
    transition:background 0.12s;
  }
  .chat-item:hover { background:var(--surface-2); }
  .chat-item.active { background:var(--accent-light); border-right:3px solid var(--accent); }
  .chat-avatar {
    width:40px; height:40px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:15px; font-weight:800; color:#fff;
  }
  .chat-group-avatar {
    width:40px; height:40px; border-radius:10px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    background:var(--accent-light); border:1px solid rgba(14,165,233,0.25);
    font-size:17px;
  }
  .chat-item-info { flex:1; min-width:0; }
  .chat-item-name { font-size:13px; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chat-item-preview { font-size:12px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
  .chat-unread {
    min-width:20px; height:20px; border-radius:10px;
    background:var(--accent); color:#fff;
    font-size:10px; font-weight:800;
    display:flex; align-items:center; justify-content:center;
    padding:0 6px; flex-shrink:0;
  }

  .chat-main {
    display:flex; flex-direction:column;
    background:var(--bg); overflow:hidden;
  }
  .chat-header {
    padding:14px 20px; border-bottom:1px solid var(--border);
    display:flex; align-items:center; gap:12px;
    background:var(--surface); flex-shrink:0;
  }
  .chat-back-btn {
    display:none; background:none; border:none;
    color:var(--text-muted); cursor:pointer; padding:4px; border-radius:6px;
  }
  .chat-header-name { font-size:15px; font-weight:700; color:var(--text-primary); }
  .chat-header-sub  { font-size:12px; color:var(--text-muted); margin-top:1px; }

  .chat-messages {
    flex:1; overflow-y:auto; padding:16px 20px;
    display:flex; flex-direction:column; gap:4px;
  }

  .msg-row { display:flex; gap:8px; align-items:flex-end; animation:msgIn 0.2s ease; }
  .msg-row.mine { flex-direction:row-reverse; }
  .msg-avatar { width:28px; height:28px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#fff; }
  .msg-bubble {
    max-width:65%; padding:10px 14px; border-radius:14px;
    font-size:13px; line-height:1.5; color:var(--text-primary);
    background:var(--surface); border:1px solid var(--border);
    word-break:break-word;
  }
  .msg-row.mine .msg-bubble {
    background:var(--accent); color:#fff; border-color:transparent;
    border-bottom-right-radius:4px;
  }
  .msg-row:not(.mine) .msg-bubble { border-bottom-left-radius:4px; }
  .msg-sender { font-size:10px; font-weight:700; color:var(--accent); margin-bottom:3px; }
  .msg-time { font-size:10px; color:var(--text-faint); margin-top:3px; text-align:right; }
  .msg-row.mine .msg-time { color:rgba(255,255,255,0.6); }
  .msg-image { max-width:240px; border-radius:10px; cursor:pointer; display:block; margin-top:4px; }
  .msg-file {
    display:flex; align-items:center; gap:8px;
    padding:8px 12px; background:rgba(0,0,0,0.08); border-radius:8px;
    margin-top:4px; cursor:pointer; text-decoration:none; color:inherit;
  }
  .msg-row.mine .msg-file { background:rgba(255,255,255,0.2); }
  .msg-date-divider {
    text-align:center; font-size:11px; font-weight:600;
    color:var(--text-faint); margin:12px 0;
    display:flex; align-items:center; gap:8px;
  }
  .msg-date-divider::before, .msg-date-divider::after {
    content:''; flex:1; height:1px; background:var(--border);
  }

  .chat-input-area {
    padding:12px 16px; border-top:1px solid var(--border);
    background:var(--surface); flex-shrink:0;
  }
  .chat-attachments-preview {
    display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;
  }
  .chat-attach-thumb {
    position:relative; width:60px; height:60px; border-radius:8px;
    overflow:hidden; border:1px solid var(--border); flex-shrink:0;
  }
  .chat-attach-thumb img { width:100%; height:100%; object-fit:cover; }
  .chat-attach-thumb .remove-btn {
    position:absolute; top:2px; right:2px;
    width:18px; height:18px; border-radius:50%;
    background:rgba(0,0,0,0.6); color:#fff;
    border:none; cursor:pointer; font-size:10px;
    display:flex; align-items:center; justify-content:center;
  }
  .chat-attach-file {
    display:flex; align-items:center; gap:6px;
    padding:6px 10px; background:var(--surface-2);
    border:1px solid var(--border); border-radius:8px;
    font-size:12px; color:var(--text-secondary); position:relative;
  }
  .chat-input-row {
    display:flex; gap:8px; align-items:flex-end;
  }
  .chat-input-row textarea {
    flex:1; padding:10px 14px; border-radius:12px;
    border:1px solid var(--border); background:var(--surface-2);
    color:var(--text-primary); font-size:13px;
    font-family:inherit; resize:none; outline:none;
    max-height:120px; line-height:1.5;
    transition:border-color 0.15s;
  }
  .chat-input-row textarea:focus { border-color:var(--accent); }
  .chat-icon-btn {
    width:38px; height:38px; border-radius:10px;
    border:1px solid var(--border); background:var(--surface-2);
    color:var(--text-muted); cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:all 0.15s; flex-shrink:0;
  }
  .chat-icon-btn:hover { border-color:var(--accent); color:var(--accent); background:var(--accent-light); }
  .chat-send-btn {
    width:38px; height:38px; border-radius:10px;
    background:var(--accent); color:#fff; border:none;
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:all 0.15s; flex-shrink:0;
  }
  .chat-send-btn:hover { background:var(--accent-dark); }
  .chat-send-btn:disabled { opacity:0.4; cursor:not-allowed; }

  .chat-empty {
    flex:1; display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    color:var(--text-faint); gap:12px;
  }
  .chat-empty-icon { font-size:48px; opacity:0.3; }

  .modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,0.5);
    display:flex; align-items:center; justify-content:center;
    z-index:1000; padding:20px;
  }
  .modal-box {
    background:var(--surface); border-radius:16px;
    padding:24px; width:100%; max-width:460px;
    border:1px solid var(--border);
    box-shadow:0 20px 60px rgba(0,0,0,0.3);
    animation:fadeUp 0.2s ease;
  }
  .modal-title { font-size:17px; font-weight:800; color:var(--text-primary); margin-bottom:18px; }
  .modal-input {
    width:100%; padding:10px 14px; border-radius:8px;
    border:1px solid var(--border); background:var(--surface-2);
    color:var(--text-primary); font-size:13px; font-family:inherit;
    outline:none; margin-bottom:12px; box-sizing:border-box;
  }
  .modal-input:focus { border-color:var(--accent); }
  .modal-label { font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:6px; display:block; text-transform:uppercase; letter-spacing:0.5px; }
  .modal-user-list { max-height:200px; overflow-y:auto; border:1px solid var(--border); border-radius:8px; margin-bottom:12px; }
  .modal-user-item {
    display:flex; align-items:center; gap:10px;
    padding:10px 14px; cursor:pointer;
    border-bottom:1px solid var(--border); transition:background 0.12s;
  }
  .modal-user-item:last-child { border-bottom:none; }
  .modal-user-item:hover { background:var(--surface-2); }
  .modal-user-item.selected { background:var(--accent-light); }
  .modal-btn-row { display:flex; gap:8px; justify-content:flex-end; margin-top:4px; }
  .modal-btn { padding:9px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all 0.15s; }
  .modal-btn.primary { background:var(--accent); color:#fff; }
  .modal-btn.primary:hover { background:var(--accent-dark); }
  .modal-btn.ghost { background:var(--surface-2); color:var(--text-secondary); border:1px solid var(--border); }
  .modal-btn.ghost:hover { border-color:var(--accent); color:var(--accent); }

  .recording-pulse {
    width:10px; height:10px; border-radius:50%; background:var(--red);
    animation:pulse-red 1s infinite; display:inline-block; margin-right:6px;
  }
  .img-lightbox {
    position:fixed; inset:0; background:rgba(0,0,0,0.92);
    display:flex; align-items:center; justify-content:center;
    z-index:2000; cursor:zoom-out;
  }
  .img-lightbox img { max-width:90vw; max-height:90vh; border-radius:8px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#0ea5e9','#8b5cf6','#ec4899','#10b981','#f59e0b','#ef4444','#06b6d4','#84cc16'];
const avatarColor = (str) => AVATAR_COLORS[(str||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0) % AVATAR_COLORS.length];
const initials = (name) => (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
const fmtTime = (ts) => { if(!ts)return''; const d=new Date(ts); return d.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}); };
const fmtDate = (ts) => { if(!ts)return''; const d=new Date(ts); const t=new Date(); const diff=Math.floor((t-d)/86400000); if(diff===0)return'Today'; if(diff===1)return'Yesterday'; return d.toLocaleDateString('en-AU',{day:'numeric',month:'short'}); };
const fmtSize = (b) => b>1024*1024?`${(b/1024/1024).toFixed(1)}MB`:b>1024?`${(b/1024).toFixed(0)}KB`:`${b}B`;

// ─── New Conversation Modal ───────────────────────────────────────────────────
function NewChatModal({ userRole, onClose, onCreated }) {
  const [type, setType] = useState('dm');
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('user_roles')
      .select('email,name,role')
      .eq('company_id', userRole.company_id)
      .neq('email', userRole.email)
      .then(({ data }) => setUsers(data||[]));
  }, [userRole]);

  const toggle = (email) => setSelected(s => s.includes(email) ? s.filter(e=>e!==email) : [...s, email]);

  const create = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      // For DM, check if conversation already exists
      if (type === 'dm') {
        const other = users.find(u => u.email === selected[0]);
        const name = other?.name || other?.email || selected[0];
        const { data: conv } = await supabase.from('conversations').insert({
          company_id: userRole.company_id,
          type: 'dm',
          name,
          created_by: userRole.email,
        }).select().single();
        if (conv) {
          await supabase.from('conversation_members').insert([
            { conversation_id: conv.id, user_id: userRole.email, user_name: userRole.name || userRole.email },
            { conversation_id: conv.id, user_id: selected[0], user_name: name },
          ]);
          onCreated(conv);
        }
      } else {
        const { data: conv } = await supabase.from('conversations').insert({
          company_id: userRole.company_id,
          type: 'group',
          name: groupName || 'Group Chat',
          created_by: userRole.email,
        }).select().single();
        if (conv) {
          const members = [
            { conversation_id: conv.id, user_id: userRole.email, user_name: userRole.name || userRole.email },
            ...selected.map(email => {
              const u = users.find(x => x.email === email);
              return { conversation_id: conv.id, user_id: email, user_name: u?.name || email };
            }),
          ];
          await supabase.from('conversation_members').insert(members);
          onCreated(conv);
        }
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">New Conversation</div>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {['dm','group'].map(t => (
            <button key={t} onClick={() => setType(t)} className="modal-btn" style={{ flex:1, background: type===t ? 'var(--accent)' : 'var(--surface-2)', color: type===t ? '#fff' : 'var(--text-secondary)', border: '1px solid ' + (type===t ? 'var(--accent)' : 'var(--border)') }}>
              {t === 'dm' ? '💬 Direct Message' : '👥 Group Chat'}
            </button>
          ))}
        </div>
        {type === 'group' && (
          <>
            <label className="modal-label">Group Name</label>
            <input className="modal-input" placeholder="e.g. Workshop Team" value={groupName} onChange={e=>setGroupName(e.target.value)} />
          </>
        )}
        <label className="modal-label">{type==='dm' ? 'Select Person' : 'Add Members'}</label>
        <div className="modal-user-list">
          {users.map(u => (
            <div key={u.email} className={`modal-user-item${selected.includes(u.email)?' selected':''}`}
              onClick={() => type==='dm' ? setSelected([u.email]) : toggle(u.email)}>
              <div className="chat-avatar" style={{ width:32, height:32, fontSize:12, background:avatarColor(u.email) }}>{initials(u.name||u.email)}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{u.name||u.email}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.role}</div>
              </div>
              {selected.includes(u.email) && <span style={{ marginLeft:'auto', color:'var(--accent)', fontSize:16 }}>✓</span>}
            </div>
          ))}
          {users.length === 0 && <div style={{ padding:'16px', textAlign:'center', color:'var(--text-faint)', fontSize:13 }}>No other users in your company</div>}
        </div>
        <div className="modal-btn-row">
          <button className="modal-btn ghost" onClick={onClose}>Cancel</button>
          <button className="modal-btn primary" onClick={create} disabled={loading||selected.length===0}>
            {loading ? 'Creating…' : type==='dm' ? 'Start Chat' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, showAvatar, onImageClick }) {
  const isImage = msg.type === 'image';
  const isVideo = msg.type === 'video';
  const isVoice = msg.type === 'voice';
  const isFile  = msg.type === 'file';

  return (
    <div className={`msg-row${isMine?' mine':''}`} style={{ marginBottom: 2 }}>
      {showAvatar && !isMine ? (
        <div className="msg-avatar" style={{ background: avatarColor(msg.sender_id) }}>{initials(msg.sender_name || msg.sender_id)}</div>
      ) : <div style={{ width:28, flexShrink:0 }} />}
      <div>
        {showAvatar && !isMine && <div className="msg-sender">{msg.sender_name || msg.sender_id}</div>}
        <div className="msg-bubble">
          {msg.content && <div>{msg.content}</div>}
          {isImage && msg.file_url && (
            <img src={msg.file_url} alt="attachment" className="msg-image" onClick={() => onImageClick(msg.file_url)} />
          )}
          {isVideo && msg.file_url && (
            <video src={msg.file_url} controls style={{ maxWidth:240, borderRadius:10, marginTop:4, display:'block' }} />
          )}
          {isVoice && msg.file_url && (
            <audio src={msg.file_url} controls style={{ marginTop:4, maxWidth:220 }} />
          )}
          {isFile && msg.file_url && (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="msg-file">
              <span style={{ fontSize:20 }}>📎</span>
              <div>
                <div style={{ fontSize:12, fontWeight:600 }}>{msg.file_name || 'File'}</div>
                {msg.file_size && <div style={{ fontSize:10, opacity:0.7 }}>{fmtSize(msg.file_size)}</div>}
              </div>
            </a>
          )}
        </div>
        <div className="msg-time">{fmtTime(msg.created_at)}</div>
      </div>
    </div>
  );
}

// ─── Main Chat Component ──────────────────────────────────────────────────────
function Chat({ userRole }) {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]); // {file, preview, type}
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [members, setMembers] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const realtimeSub = useRef(null);

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById('chat-css')) {
      const s = document.createElement('style'); s.id='chat-css'; s.textContent=CSS;
      document.head.appendChild(s);
    }
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userRole?.company_id) return;
    const { data: myConvs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userRole.email);
    if (!myConvs?.length) return;
    const ids = myConvs.map(c => c.conversation_id);
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false });
    setConversations(convs || []);
  }, [userRole]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages for active conversation
  useEffect(() => {
    if (!active) return;
    setMessages([]);
    supabase.from('messages')
      .select('*')
      .eq('conversation_id', active.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });

    // Load members
    supabase.from('conversation_members')
      .select('user_id, user_name')
      .eq('conversation_id', active.id)
      .then(({ data }) => setMembers(data || []));

    // Subscribe to realtime
    if (realtimeSub.current) realtimeSub.current.unsubscribe();
    realtimeSub.current = supabase
      .channel(`chat:${active.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${active.id}`
      }, payload => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();

    return () => { if (realtimeSub.current) realtimeSub.current.unsubscribe(); };
  }, [active]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Upload file to Supabase storage
  const uploadFile = async (file) => {
    const ext = file.name.split('.').pop();
    const path = `${userRole.company_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('chat-media').upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
    return publicUrl;
  };

  // Get message type from file
  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'voice';
    return 'file';
  };

  // Handle file selection
  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      const type = getFileType(file);
      const preview = type === 'image' ? URL.createObjectURL(file) : null;
      setAttachments(prev => [...prev, { file, preview, type }]);
    });
  };

  // Send message
  const send = async () => {
    if (!active || (!input.trim() && attachments.length === 0)) return;
    setSending(true);
    try {
      // Send text first if present
      if (input.trim() && attachments.length === 0) {
        await supabase.from('messages').insert({
          conversation_id: active.id,
          sender_id: userRole.email,
          sender_name: userRole.name || userRole.email,
          content: input.trim(),
          type: 'text',
        });
      }
      // If text + attachments, send text with first attachment, rest separately
      for (let i = 0; i < attachments.length; i++) {
        const { file, type } = attachments[i];
        const url = await uploadFile(file);
        await supabase.from('messages').insert({
          conversation_id: active.id,
          sender_id: userRole.email,
          sender_name: userRole.name || userRole.email,
          content: i === 0 && input.trim() ? input.trim() : null,
          type,
          file_url: url,
          file_name: file.name,
          file_size: file.size,
        });
      }
      setInput('');
      setAttachments([]);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err) {
      console.error('Send failed:', err);
    } finally { setSending(false); }
  };

  // Handle enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        try {
          const url = await uploadFile(file);
          await supabase.from('messages').insert({
            conversation_id: active.id,
            sender_id: userRole.email,
            sender_name: userRole.name || userRole.email,
            type: 'voice',
            file_url: url,
            file_name: file.name,
            file_size: file.size,
          });
        } catch (err) { console.error('Voice send failed:', err); }
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch { alert('Microphone access denied.'); }
  };

  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setMediaRecorder(null); }
    setRecording(false);
  };

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const openConv = (conv) => {
    setActive(conv);
    setShowSidebar(false);
  };

  const filtered = conversations.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = fmtDate(msg.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const memberCount = members.length;
  const memberNames = members.filter(m => m.user_id !== userRole.email).map(m => m.user_name || m.user_id).slice(0,3).join(', ');

  return (
    <div className="chat-layout">

      {/* ── Sidebar ── */}
      <div className={`chat-sidebar${showSidebar?' show':''}`}>
        <div className="chat-sidebar-header">
          <span className="chat-sidebar-title">💬 Messages</span>
          <button className="chat-new-btn" onClick={() => setShowNew(true)} title="New conversation">+</button>
        </div>
        <div className="chat-search">
          <input placeholder="Search conversations…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <div className="chat-list">
          {filtered.length === 0 ? (
            <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--text-faint)', fontSize:13 }}>
              No conversations yet.<br />Tap + to start one.
            </div>
          ) : filtered.map(conv => (
            <div key={conv.id} className={`chat-item${active?.id===conv.id?' active':''}`} onClick={() => openConv(conv)}>
              {conv.type === 'group'
                ? <div className="chat-group-avatar">👥</div>
                : <div className="chat-avatar" style={{ background: avatarColor(conv.name) }}>{initials(conv.name)}</div>
              }
              <div className="chat-item-info">
                <div className="chat-item-name">{conv.name}</div>
                <div className="chat-item-preview">{conv.type === 'group' ? 'Group chat' : 'Direct message'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div className="chat-main">
        {!active ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text-muted)' }}>Select a conversation</div>
            <div style={{ fontSize:13, color:'var(--text-faint)' }}>or tap + to start a new one</div>
            <button className="modal-btn primary" style={{ marginTop:8 }} onClick={() => { setShowSidebar(true); }}>
              View Conversations
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="chat-header">
              <button className="chat-back-btn" onClick={() => { setShowSidebar(true); setActive(null); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {active.type === 'group'
                ? <div className="chat-group-avatar" style={{ width:36, height:36 }}>👥</div>
                : <div className="chat-avatar" style={{ width:36, height:36, fontSize:13, background: avatarColor(active.name) }}>{initials(active.name)}</div>
              }
              <div>
                <div className="chat-header-name">{active.name}</div>
                <div className="chat-header-sub">
                  {active.type === 'group' ? `${memberCount} members · ${memberNames}` : 'Direct message'}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <React.Fragment key={date}>
                  <div className="msg-date-divider">{date}</div>
                  {msgs.map((msg, i) => {
                    const isMine = msg.sender_id === userRole.email;
                    const showAvatar = !isMine && (i === 0 || msgs[i-1]?.sender_id !== msg.sender_id);
                    return (
                      <MessageBubble key={msg.id} msg={msg} isMine={isMine} showAvatar={showAvatar} onImageClick={setLightbox} />
                    );
                  })}
                </React.Fragment>
              ))}
              {messages.length === 0 && (
                <div style={{ textAlign:'center', color:'var(--text-faint)', fontSize:13, marginTop:40 }}>
                  No messages yet. Say hello! 👋
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div style={{ padding:'0 16px', background:'var(--surface)' }}>
                <div className="chat-attachments-preview">
                  {attachments.map((a, i) => (
                    <div key={i}>
                      {a.preview ? (
                        <div className="chat-attach-thumb">
                          <img src={a.preview} alt="" />
                          <button className="remove-btn" onClick={() => setAttachments(prev => prev.filter((_,j)=>j!==i))}>✕</button>
                        </div>
                      ) : (
                        <div className="chat-attach-file">
                          <span>📎</span>
                          <span style={{ maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.file.name}</span>
                          <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', marginLeft:4 }} onClick={() => setAttachments(prev => prev.filter((_,j)=>j!==i))}>✕</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="chat-input-area">
              {recording ? (
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'4px 0' }}>
                  <span className="recording-pulse" />
                  <span style={{ fontSize:13, color:'var(--red)', fontWeight:600 }}>Recording voice message…</span>
                  <button className="modal-btn primary" style={{ marginLeft:'auto', padding:'6px 16px', fontSize:12 }} onClick={stopRecording}>Send</button>
                  <button className="modal-btn ghost" style={{ padding:'6px 16px', fontSize:12 }} onClick={() => { if(mediaRecorder){ mediaRecorder.stream?.getTracks().forEach(t=>t.stop()); setMediaRecorder(null); } setRecording(false); }}>Cancel</button>
                </div>
              ) : (
                <div className="chat-input-row">
                  <button className="chat-icon-btn" title="Attach file" onClick={() => fileInputRef.current?.click()}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                  </button>
                  <button className="chat-icon-btn" title="Voice message" onClick={startRecording}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
                  </button>
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder="Type a message…"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                  <button className="chat-send-btn" onClick={send} disabled={sending || (!input.trim() && attachments.length === 0)}>
                    {sending
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin 0.8s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    }
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display:'none' }} onChange={e => { handleFiles(e.target.files); e.target.value=''; }} />
            </div>
          </>
        )}
      </div>

      {/* New conversation modal */}
      {showNew && <NewChatModal userRole={userRole} onClose={() => setShowNew(false)} onCreated={conv => { setShowNew(false); loadConversations(); openConv(conv); }} />}

      {/* Image lightbox */}
      {lightbox && (
        <div className="img-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full size" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default Chat;
