import React, {useState} from 'react';
import {Button, Dialog, TextField, SegmentedControl} from '@radix-ui/themes';
import {MagnifyingGlassIcon, ArrowRightIcon, FileTextIcon, ReaderIcon} from '@radix-ui/react-icons';

export default function Knowledge({api, mode}) {
  const [question,setQuestion]=useState(''),[query,setQuery]=useState(''),[searchMode,setSearchMode]=useState('hybrid');
  const [answer,setAnswer]=useState(null),[results,setResults]=useState(null),[asked,setAsked]=useState('');
  const [searchBusy,setSearchBusy]=useState(false),[askBusy,setAskBusy]=useState(false);
  const [searchError,setSearchError]=useState(''),[askError,setAskError]=useState('');
  const [source,setSource]=useState(null),[sourceError,setSourceError]=useState(''),[sourceOpen,setSourceOpen]=useState(false);
  async function search(event,page=1) {
    event?.preventDefault();setSearchBusy(true);setSearchError('');
    const input=page===1?{query:query.trim(),mode:searchMode}:results.input;
    try {const data=await api(`/api/search?q=${encodeURIComponent(input.query)}&mode=${input.mode}&page=${page}`);setResults({...data,input});}
    catch(e){setSearchError(e.message);}finally{setSearchBusy(false);}
  }
  async function ask(event) {
    event.preventDefault();setAskBusy(true);setAskError('');
    try {const data=await api('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});setAnswer(data);setAsked(question);}
    catch(e){setAskError(e.message);}finally{setAskBusy(false);}
  }
  async function openSource(hit) {
    setSource(null);setSourceError('');setSourceOpen(true);
    try {const data=await api(hit.source_url);setSource({hit,material:data.material});}
    catch(e){setSourceError(e.message);}
  }
  function card(hit,number) {
    return <article className="source-card" key={hit.id} id={`citation-${number}`}>
      <div className="source-heading"><span className="source-number">{number}</span><div><h3>{hit.title}</h3><p>{hit.original_name} · 切片 {hit.chunk_index} · 字符 {hit.start_offset}–{hit.end_offset}</p></div><Button size="2" variant="ghost" onClick={()=>openSource(hit)}>查看原文<ArrowRightIcon/></Button></div>
      <p className="source-text">{hit.text}</p>
    </article>;
  }
  const sourceChars=source?Array.from(source.material.body_text):[];
  return <section className="knowledge-panel">
    <div hidden={mode!=='search'}>
      <form onSubmit={search} className="knowledge-form"><label htmlFor="knowledge-query">查找本班材料中的内容</label><div className="query-row"><TextField.Root id="knowledge-query" placeholder="输入关键词或描述你想找的内容" value={query} onChange={e=>setQuery(e.target.value)} required><TextField.Slot><MagnifyingGlassIcon/></TextField.Slot></TextField.Root><Button disabled={searchBusy} type="submit">{searchBusy?'正在检索…':'检索材料'}</Button></div><SegmentedControl.Root value={searchMode} onValueChange={setSearchMode} aria-label="检索方式"><SegmentedControl.Item value="hybrid">混合检索</SegmentedControl.Item><SegmentedControl.Item value="keyword">关键词</SegmentedControl.Item><SegmentedControl.Item value="vector">语义检索</SegmentedControl.Item></SegmentedControl.Root></form>
      {searchError&&<p role="alert" className="knowledge-error">{searchError}</p>}
      {results?<div className="search-results" aria-live="polite"><p className="result-count">“{results.input.query}” · {results.total} 条相关片段</p>{results.hits.length?results.hits.map((h,i)=>card(h,(results.page-1)*20+i+1)):<p className="empty-knowledge">资料中未找到相关内容</p>}<div className="search-pagination"><Button variant="soft" disabled={searchBusy||results.page===1} onClick={()=>search(null,results.page-1)}>上一页</Button><span>第 {results.page} 页</span><Button variant="soft" disabled={searchBusy||!results.has_more} onClick={()=>search(null,results.page+1)}>下一页</Button></div></div>:<div className="knowledge-empty"><MagnifyingGlassIcon/><h2>从一段原文，找到答案的起点。</h2><p>用关键词精确查找，或用自己的话描述。每条结果都能回到原文核对。</p></div>}
    </div>
    <div hidden={mode!=='ask'}>
      <form onSubmit={ask} className="knowledge-form"><label htmlFor="knowledge-question">你想了解什么？</label><div className="query-row"><TextField.Root id="knowledge-question" placeholder="围绕本班材料提出一个问题" value={question} onChange={e=>setQuestion(e.target.value)} required/><Button disabled={askBusy} type="submit">{askBusy?'正在查阅材料…':'提问'}<ArrowRightIcon/></Button></div><p className="query-hint">先查阅本班材料，再依据相关片段回答。找不到依据时会明确告诉你。</p></form>
      {askError&&<p role="alert" className="knowledge-error">{askError}</p>}
      {answer?<div className="answer-result" aria-live="polite"><div className="question-bubble"><span>你的问题</span><p>{asked}</p></div><article className="answer-card"><div className="answer-label"><ReaderIcon/><span>依据材料回答</span></div><p className="answer-text">{answer.answer}</p></article>{answer.citations.length>0&&<div className="answer-sources"><h2><FileTextIcon/>参考来源 <span>{answer.citations.length}</span></h2>{answer.citations.map(h=>card(h,h.number))}</div>}</div>:<div className="knowledge-empty"><ReaderIcon/><h2>带着问题，读懂材料。</h2><p>回答附有原文依据。点击来源，就能核对每一处引用。</p></div>}
    </div>
    <Dialog.Root open={sourceOpen} onOpenChange={setSourceOpen}><Dialog.Content maxWidth="820px"><Dialog.Title>{source?.material.title||'材料原文'}</Dialog.Title><Dialog.Description>高亮部分是当前引用的原始切片。</Dialog.Description>{sourceError?<p role="alert">{sourceError}</p>:source?<pre className="source-original">{sourceChars.slice(0,source.hit.start_offset).join('')}<mark>{sourceChars.slice(source.hit.start_offset,source.hit.end_offset).join('')}</mark>{sourceChars.slice(source.hit.end_offset).join('')}</pre>:<p>正在读取原文…</p>}<Dialog.Close><Button variant="soft">关闭</Button></Dialog.Close></Dialog.Content></Dialog.Root>
  </section>;
}
