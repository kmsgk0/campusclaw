import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme, Button, IconButton, TextField, Dialog, SegmentedControl, Skeleton, Tooltip } from '@radix-ui/themes';
import { ReaderIcon, FileTextIcon, DownloadIcon, UploadIcon, MagnifyingGlassIcon, MoonIcon, SunIcon, ExitIcon, ArrowRightIcon, LockClosedIcon, RowsIcon, GridIcon, ChevronRightIcon, Cross2Icon } from '@radix-ui/react-icons';
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@radix-ui/themes/styles.css';
import './style.css';

async function api(url, options={}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (response.status === 401 && url !== '/api/login') location.assign('/login');
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
}
const date = value => new Date(value).toLocaleDateString('zh-CN', {month:'long',day:'numeric'});
const size = bytes => bytes < 1024 ? `${bytes} B` : `${(bytes/1024).toFixed(1)} KB`;
const fileType = name => name.toLowerCase().endsWith('.md') ? 'Markdown' : 'TXT';
function Brand(){ return <a className="brand" href="/"><ReaderIcon width="26" height="26"/><span>CampusClaw<span className="brand-sub">班级学习空间</span></span></a>; }

function Login() {
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  async function submit(event){
    event.preventDefault(); setBusy(true); setError('');
    const form=event.currentTarget;
    try { await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.username.value.trim(),password:form.password.value})}); location.assign('/'); }
    catch(error){setError(error.message);} finally{setBusy(false);}
  }
  return <main className="login-shell"><section className="login-story"><Brand/><div className="story-copy"><p className="eyebrow">A SPACE FOR LEARNING</p><h1>每一份知识，<br/>都有归处。</h1><p>把课堂里的好材料留在一起。<br/>让分享更有序，让学习更专注。</p><div className="story-rule"/><div className="story-detail"><ReaderIcon/><span>本班材料，随时阅读</span></div><div className="story-detail"><LockClosedIcon/><span>独立空间，安心分享</span></div></div><p className="story-footer">为教师与学生连接每一次学习。</p></section><section className="login-form-area"><div className="login-form-wrap"><p className="welcome-label">欢迎回来</p><h2>进入你的学习空间</h2><p className="subtle">使用课程账号，继续今天的学习。</p><form onSubmit={submit} id="login-form"><label htmlFor="username">账号</label><TextField.Root size="3" id="username" name="username" autoComplete="username" placeholder="教师或学生账号" required/><label htmlFor="password">密码</label><TextField.Root size="3" id="password" name="password" type="password" autoComplete="current-password" placeholder="请输入密码" required/><p className="form-error" role="alert">{error}</p><Button size="3" type="submit" disabled={busy} className="login-submit">{busy?'正在登录…':'登录学习空间'}<ArrowRightIcon/></Button></form><p className="login-help"><LockClosedIcon/> 仅可访问所属班级的教学材料</p></div></section></main>;
}

function Workspace({dark,setDark}) {
  const [user,setUser]=useState(null),[records,setRecords]=useState(null),[selected,setSelected]=useState(null),[detail,setDetail]=useState(null);
  const [query,setQuery]=useState(''),[view,setView]=useState('list'),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [uploadOpen,setUploadOpen]=useState(false),[busy,setBusy]=useState(false),[uploadError,setUploadError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{api('/api/me').then(d=>setUser(d.user)).catch(e=>setError(e.message));},[]);
  useEffect(()=>{
    const abort=new AbortController();
    api(`/api/materials?q=${encodeURIComponent(query)}`,{signal:abort.signal}).then(d=>{
      setRecords(d.materials); setSelected(id=>d.materials.some(m=>m.id===id)?id:d.materials[0]?.id??null);
    }).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    return ()=>abort.abort();
  },[query,revision]);
  useEffect(()=>{
    setDetail(null);
    if(!selected)return;
    const abort=new AbortController();
    api(`/api/materials/${selected}`,{signal:abort.signal}).then(setDetail).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    return ()=>abort.abort();
  },[selected]);
  async function logout(){try{await api('/api/logout',{method:'POST'});location.assign('/login');}catch(e){setError(e.message);}}
  async function upload(event){
    event.preventDefault();setBusy(true);setUploadError('');
    const form=new FormData(event.currentTarget);
    try{const result=await api('/api/materials',{method:'POST',body:form});setQuery('');setSelected(result.material_id);setRevision(v=>v+1);setUploadOpen(false);setNotice('材料已上传，正文已写入本班知识库。');}
    catch(e){setUploadError(e.message);}finally{setBusy(false);}
  }
  const teacher=user?.role==='teacher';
  return <div className="app-shell">
    <aside className="navigation"><Brand/><div className="workspace-label">当前空间</div><div className="class-switch"><span className="class-letter">{user?.class_name?.[0]||'…'}</span><div><strong>{user?.class_name||'读取中'}</strong><span>班级教学空间</span></div><LockClosedIcon/></div><div className="workspace-label library-label">学习资源</div><a href="/" className="nav-active"><ReaderIcon/>材料库<ChevronRightIcon/></a><div className="nav-bottom"><div className="space-note"><LockClosedIcon/><p>材料仅对本班开放。<br/>教师上传，师生共享。</p></div><div className="user-card"><span className="user-avatar">{teacher?'教':'学'}</span><div><strong>{user?.display_name||'…'}</strong><span>{user?.username}</span></div><Tooltip content="退出登录"><IconButton id="logout" aria-label="退出登录" variant="ghost" color="gray" onClick={logout}><ExitIcon/></IconButton></Tooltip></div></div></aside>
    <div className="main-shell"><header className="topbar"><span>{user?.class_name||'学习空间'}</span><ChevronRightIcon/><span>材料库</span><Tooltip content={dark?'切换浅色':'切换深色'}><IconButton id="theme" aria-label={dark?'切换浅色':'切换深色'} variant="ghost" color="gray" onClick={()=>setDark(!dark)}>{dark?<SunIcon/>:<MoonIcon/>}</IconButton></Tooltip></header>
      <div className="page-heading"><div><p className="eyebrow">CLASSROOM LIBRARY</p><h1>课堂材料，集中于此。</h1><p className="subtle">{teacher?'分享一份材料，让本班的每一次学习都有据可循。':'从本班材料出发，阅读、理解，带走新的收获。'}</p></div>{teacher&&<Dialog.Root open={uploadOpen} onOpenChange={setUploadOpen}><Dialog.Trigger><Button id="upload-trigger" size="3"><UploadIcon/>上传材料</Button></Dialog.Trigger><Dialog.Content maxWidth="470px"><Dialog.Title>上传教学材料</Dialog.Title><Dialog.Description size="2" mb="5">上传后，本班教师和学生都可以阅读与下载。</Dialog.Description><form onSubmit={upload} id="upload-form"><label htmlFor="file" className="file-label"><UploadIcon width="28" height="28"/><strong>选择要分享的文件</strong><span>TXT 或 Markdown · UTF-8 · 最大 2 MiB</span></label><input type="file" id="file" name="file" accept=".txt,.md" required/><p className="form-error" role="alert">{uploadError}</p><div className="dialog-actions"><Dialog.Close><Button type="button" variant="soft" color="gray">取消</Button></Dialog.Close><Button disabled={busy} type="submit">{busy?'正在上传…':'确认上传'}<ArrowRightIcon/></Button></div></form></Dialog.Content></Dialog.Root>}</div>
      {notice&&<div className="notice" role="status"><span>{notice}</span><IconButton aria-label="关闭提示" color="gray" variant="ghost" onClick={()=>setNotice('')}><Cross2Icon/></IconButton></div>}
      {error&&<p className="form-error page-error" role="alert">{error}</p>}
      <main className="library-workbench"><section className="catalog" aria-label="本班材料"><div className="catalog-heading"><h2>全部材料 <span>{records?.length??'…'}</span></h2><SegmentedControl.Root size="1" value={view} onValueChange={setView} aria-label="材料视图"><SegmentedControl.Item value="list" aria-label="列表视图"><RowsIcon/></SegmentedControl.Item><SegmentedControl.Item value="grid" aria-label="网格视图"><GridIcon/></SegmentedControl.Item></SegmentedControl.Root></div><TextField.Root id="search" size="3" placeholder="搜索本班材料" aria-label="搜索本班材料" value={query} onChange={e=>setQuery(e.target.value)}><TextField.Slot><MagnifyingGlassIcon/></TextField.Slot></TextField.Root><div className={`material-list ${view}`}>
      {records===null?<div className="loading-lines"><Skeleton height="78px"/><Skeleton height="78px"/><Skeleton height="78px"/></div>:records.length===0?<div className="empty-list"><FileTextIcon width="28" height="28"/><strong>暂无匹配材料</strong><p>{query?'换个关键词，再找找看。':'等待教师分享第一份材料。'}</p></div>:records.map(item=><button className={`material-row ${selected===item.id?'active':''}`} key={item.id} data-id={item.id} onClick={()=>setSelected(item.id)}><div className="file-topline"><FileTextIcon width="22" height="22"/><span>{fileType(item.original_name)}</span><span className="file-size">{size(item.size_bytes)}</span></div><strong>{item.title}</strong><div className="file-bottomline"><span>{item.author}</span><span>{date(item.created_at)}</span></div></button>)}
      </div><div className="catalog-footer"><LockClosedIcon/><span>仅搜索当前班级的材料</span></div></section>
      <section className="reader" aria-label="材料阅读"><div className="reader-toolbar"><span><FileTextIcon/>材料预览</span>{detail&&<Button asChild size="2" variant="outline" color="gray"><a id="download" href={`/api/materials/${detail.material.id}/file`}><DownloadIcon/>下载原文件</a></Button>}</div>{detail?<article className="document"><div className="document-meta"><span>{fileType(detail.material.original_name)}</span><span>{detail.material.author} · {date(detail.material.created_at)}</span></div><h2 id="document-title">{detail.material.title}</h2><div className="document-rule"/><div id="document-body" className="document-body">{detail.rendered_html!==null?<div dangerouslySetInnerHTML={{__html:detail.rendered_html}}/>:<pre>{detail.material.body_text}</pre>}</div><footer className="document-footer">{user?.class_name} · 教学材料库</footer></article>:selected?<div className="reader-loading"><Skeleton height="32px" width="65%"/><Skeleton height="18px"/><Skeleton height="18px"/><Skeleton height="18px" width="80%"/></div>:<div className="reader-empty"><ReaderIcon width="44" height="44"/><h2>从一份材料开始</h2><p>选择左侧材料，在这里专注阅读。</p></div>}</section></main>
    </div>
  </div>;
}

function App(){const[dark,setDark]=useState(false);return <Theme accentColor="jade" grayColor="sage" radius="large" appearance={dark?'dark':'light'} panelBackground="solid"><div className="theme-root">{location.pathname==='/login'?<Login/>:<Workspace dark={dark} setDark={setDark}/>}</div></Theme>;}
createRoot(document.getElementById('root')).render(<App/>);
