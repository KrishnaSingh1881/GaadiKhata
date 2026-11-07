import {useState} from 'react'
import {auditChanges} from '../domain/provenance'
import {NavLink} from 'react-router'
import {useWorkspace} from '../data/WorkspaceProvider'
import {useWorkspaceRows} from '../data/useWorkspaceRows'
import {Button} from '../components/ui/button'
import {FormSelect} from '../components/FormSelect'
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '../components/ui/accordion'
import {kindLabels,recordName,RecordEditor} from './RecordEditor'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../components/ui/dialog'
import type {QueueItem} from '../data/database'
import {useLiveQuery} from 'dexie-react-hooks'
import {formatMoney} from '../domain/money'
import {vehicleLabel} from '../domain/vehicle-label'
import type {AuditEvent,Conflict,Membership} from '../domain/records'

const readable=(key:string)=>key.replaceAll('_',' ').replace(/paise$/,'(₹)')
function FieldValue({name,value}:{name:string;value:unknown}) {
  const {choices}=useWorkspace()
  const record=typeof value==='string'?choices.find(record=>record.id===value):undefined
  return <>{record?(record.kind==='vehicle'?vehicleLabel(record.data):recordName(record)):name==='amount_paise'&&typeof value==='number'?formatMoney(value):value==null?'—':typeof value==='boolean'?(value?'Yes':'No'):typeof value==='object'?JSON.stringify(value):String(value)}</>
}
export function History({recordId}:{recordId?:string}) {
  const history=useWorkspaceRows<AuditEvent>('audit_events',recordId)
  const {rows:members}=useWorkspaceRows<Membership>('app_members')
  const {records}=useWorkspace()
  const [search,setSearch]=useState('');const [actorFilter,setActorFilter]=useState('');const [actionFilter,setActionFilter]=useState('');const [kindFilter,setKindFilter]=useState('');const [period,setPeriod]=useState<'all'|'week'|'month'>('all')
  const range=()=>{if(period==='all')return {from:'',to:''};const now=new Date();const to=now.toISOString().slice(0,10);if(period==='month')return {from:new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10),to};const day=(now.getDay()+6)%7;return {from:new Date(now.getFullYear(),now.getMonth(),now.getDate()-day).toISOString().slice(0,10),to}}
  const label=(key:string)=>key==='state'?'Status':key==='amount_paise'?'Amount':readable(key.replace(/^extras\./,'').replace(/_id$/,''))
  const actions:Record<string,string>={create:'Created entry',update:'Edited entry',cancel:'Cancelled entry',restore:'Restored entry',resolve_conflict:'Resolved review'}
  const actorName=(actor:string)=>members.find(member=>member.clerk_subject===actor)?.display_name??actor
  const {from,to}=range();const filteredHistory=history.rows.filter(event=>{const target=records.find(row=>row.id===event.record_id);const haystack=`${actorName(event.actor)} ${actions[event.action]??event.action} ${target?recordName(target):''} ${JSON.stringify(event.before_data)} ${JSON.stringify(event.after_data)}`.toLowerCase();const day=event.created_at.slice(0,10);return (!search.trim()||haystack.includes(search.trim().toLowerCase()))&&(!actorFilter||event.actor===actorFilter)&&(!actionFilter||event.action===actionFilter)&&(!kindFilter||target?.kind===kindFilter)&&(!from||day>=from)&&(!to||day<=to)})
  const clearFilters=()=>{setSearch('');setActorFilter('');setActionFilter('');setKindFilter('');setPeriod('all')}
  const hasFilters=Boolean(search||actorFilter||actionFilter||kindFilter||period!=='all')
  return <section className="history-section"><h2>Change history</h2>{history.error&&<p className="form-error" role="alert">{history.error}</p>}<div className="history-filters" aria-label="Filter change history"><label className="history-search">Search changes<input aria-label="Search changes" placeholder="Name, entry, or field" value={search} onChange={event=>setSearch(event.target.value)}/></label><div className="history-filter-grid"><label>Person<FormSelect label="Person" value={actorFilter} onChange={setActorFilter} options={[...new Map(history.rows.map(event=>[event.actor,actorName(event.actor)])).entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([value,label])=>({value,label}))}/></label><label>Action<FormSelect label="Action" value={actionFilter} onChange={setActionFilter} options={Object.entries(actions).map(([value,label])=>({value,label}))}/></label><label>Record<FormSelect label="Record type" value={kindFilter} onChange={setKindFilter} options={[...new Set(history.rows.map(event=>records.find(row=>row.id===event.record_id)?.kind).filter(Boolean))].map(value=>({value:String(value),label:kindLabels[String(value) as keyof typeof kindLabels]??readable(String(value))}))}/></label></div><div className="history-period" role="group" aria-label="History period">{(['all','week','month'] as const).map(value=><Button key={value} type="button" variant={period===value?'secondary':'ghost'} onClick={()=>setPeriod(value)}>{value==='all'?'All time':value==='week'?'This week':'This month'}</Button>)}</div>{hasFilters&&<div className="history-filter-summary"><span>{filteredHistory.length} matching {filteredHistory.length===1?'change':'changes'}</span><Button type="button" variant="ghost" onClick={clearFilters}>Clear all</Button></div>}</div><div className="audit-list">{filteredHistory.map(event=>{
    const target=records.find(row=>row.id===event.record_id)
    const changes=auditChanges(event).filter(change=>!(target?.kind==='vehicle'&&change.key==='name'))
    const created=event.action==='create'
    const actor=members.find(member=>member.clerk_subject===event.actor)?.display_name??event.actor
    const record=records.find(row=>row.id===event.record_id)
    return <article className="audit-event-card" key={event.id}>
      <header className="audit-event-header"><span className="audit-person" aria-hidden="true">{actor.trim().slice(0,1).toUpperCase()}</span><div><h3>{actor}</h3><p>{actions[event.action]??readable(event.action)}{!recordId&&record?` · ${recordName(record)}`:''}</p><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'})}</time></div></header>
      {event.reason&&<p className="audit-reason"><span>Reason</span>{event.reason}</p>}
      {created?<Accordion type="single" collapsible className="audit-created"><AccordionItem value="saved"><AccordionTrigger>View saved details ({changes.length})</AccordionTrigger><AccordionContent><dl className="audit-saved-fields">{changes.map(change=><div key={change.key}><dt>{label(change.key)}</dt><dd><FieldValue name={change.key} value={change.after}/></dd></div>)}</dl></AccordionContent></AccordionItem></Accordion>:
        <div className="audit-edits">{changes.map(change=><section className="audit-field-edit" key={change.key} aria-label={`${label(change.key)} changed`}><h4>{label(change.key)}</h4><div className="audit-value-pair"><div><span>Before</span><p><FieldValue name={change.key} value={change.before==null||change.before===''?'Not set':change.before}/></p></div><div><span>After</span><p><FieldValue name={change.key} value={change.after==null||change.after===''?'Removed':change.after}/></p></div></div></section>)}{!changes.length&&<p className="audit-no-fields">{target?.kind==='vehicle'?'Vehicle identity updated. Vehicles are shown by type and registration.':'No field values changed.'}</p>}</div>}
      {event.client_time&&Math.abs(Date.parse(event.created_at)-Date.parse(event.client_time))>60000&&<p className="audit-device-time">Entered on device {new Date(event.client_time).toLocaleString('en-IN')}. Synced at the time above.</p>}
    </article>
  })}</div>{!filteredHistory.length&&<p className="panel-note">{history.loading?'Loading changes…':hasFilters?'No changes match these filters.':'No changes to show yet. Saved entries and edits appear after syncing.'}</p>}{history.more&&<Button variant="outline" onClick={history.loadMore}>Load earlier changes</Button>}</section>
}
export function Reviews() {
  const {member,records,client,sync}=useWorkspace()
  const reviews=useWorkspaceRows<Conflict>('review_conflicts')
  const [reason,setReason]=useState<Record<string,string>>({});const [busy,setBusy]=useState('');const [message,setMessage]=useState('')
  async function resolve(review:Conflict,resolution:string) {
    setBusy(review.id);setMessage('')
    try {
      if(!navigator.onLine)throw new Error('Connect to resolve this review. Your proposed entry remains saved.')
      const current=records.find(record=>record.id===review.record_id)
      const {data,error}=await client.rpc('resolve_conflict',{conflict_id:review.id,resolution,expected_version:current?.version??review.current_version,reason:reason[review.id]??''})
      if(error)throw new Error(error.message)
      setMessage(data.status==='already_resolved'?'Another involved user already resolved this review.':'Review resolved. The decision is in the shared history.')
      await sync()
    }catch(error){setMessage(error instanceof Error?error.message:'Could not resolve this review.')}finally{setBusy('')}
  }
  return <><div className="page-heading"><h1>Let’s clear it up.</h1><p>Both versions stay visible. Involved users and administrators can resolve reviews.</p></div>{(message||reviews.error)&&<p role="status" className="panel-note">{message||reviews.error}</p>}{reviews.rows.map(review=>{
    const current=records.find(record=>record.id===review.record_id)
    const currentData=current?.data??review.current_data
    const differences=Object.keys({...currentData,...review.proposed_data}).filter(key=>JSON.stringify(currentData[key as keyof typeof currentData])!==JSON.stringify(review.proposed_data[key]))
    const involved=member.active&&(member.role==='technical_admin'||review.participants.includes(member.clerk_subject))
    return <section className="record-card" key={review.id}><div className="record-top"><span>{readable(review.reason)}</span><span className="badge">{review.status}</span></div><h2>{kindLabels[review.kind]} review</h2><p>{new Date(review.created_at).toLocaleString('en-IN')}</p><div className="comparison-table"><table><caption>Details that differ</caption><thead><tr><th>Field</th><th>Shared record</th><th>Proposed entry</th></tr></thead><tbody>{differences.map(key=><tr key={key}><th scope="row">{readable(key)}</th><td><FieldValue name={key} value={currentData[key as keyof typeof currentData]}/></td><td><FieldValue name={key} value={review.proposed_data[key]}/></td></tr>)}</tbody></table></div>{!differences.length&&<p>The entered details match. Confirm whether this was another legitimate trip.</p>}<p>Shared status: {current?.state??'unknown'} · proposed: {review.proposed_state}</p>{review.status==='resolved'?<p>Decision: {readable(review.resolution??'resolved')}</p>:involved?<><label className="review-reason">Reason<textarea maxLength={2000} value={reason[review.id]??''} onChange={event=>setReason({...reason,[review.id]:event.target.value})} placeholder="Explain this decision for everyone involved"/></label><div className="detail-actions"><Button variant="outline" disabled={!!busy||!reason[review.id]?.trim()} onClick={()=>void resolve(review,'keep_current')}>Keep shared</Button><Button disabled={!!busy||!reason[review.id]?.trim()} onClick={()=>void resolve(review,'use_proposed')}>Use proposed</Button>{review.reason!=='stale_edit'&&<Button variant="outline" disabled={!!busy||!reason[review.id]?.trim()} onClick={()=>void resolve(review,'separate')}>Two separate entries</Button>}</div></>:<p className="panel-note">The involved users will resolve this review.</p>}</section>
  })}{!reviews.rows.length&&<div className="empty-state"><h2>No reviews here.</h2><p>Disagreements involving your account will appear after syncing.</p></div>}{reviews.more&&<Button onClick={reviews.loadMore}>Load more reviews</Button>}</>
}
type Notification={id:string;title:string;event_type:string;record_id:string|null;conflict_id:string|null;read_at:string|null;created_at:string}
export function Notifications() {
  const inbox=useWorkspaceRows<Notification>('notifications');const {client,sync}=useWorkspace();const [error,setError]=useState('')
  async function markRead(id:string) {const {error}=await client.rpc('mark_notification_read',{notification_id:id});if(error)setError(error.message);else await sync()}
  return <><div className="page-heading"><h1>In the loop.</h1><p>Work updates and reviews for your account.</p></div>{(error||inbox.error)&&<p className="form-error">{error||inbox.error}</p>}{inbox.rows.map(item=><article className="record-card" key={item.id}><h2>{item.title}</h2><p>{new Date(item.created_at).toLocaleString('en-IN')}</p><div className="detail-actions">{item.conflict_id&&<NavLink to="/reviews">Open review</NavLink>}{!item.read_at&&<Button variant="outline" onClick={()=>void markRead(item.id)}>Mark read</Button>}</div></article>)}{!inbox.rows.length&&<p className="panel-note">No cached notifications yet.</p>}{inbox.more&&<Button onClick={inbox.loadMore}>Load earlier notifications</Button>}</>
}
export function SyncCenter() {
  const {queue,sync,syncing,db,records}=useWorkspace()
  const [editing,setEditing]=useState<QueueItem|null>(null);const [message,setMessage]=useState('');const [showArchive,setShowArchive]=useState(false)
  const archived=useLiveQuery(()=>db.outbox.where('status').equals('resolved').toArray(),[db],[])
  return <div className="sync-center-workspace"><div className="page-heading"><h1>Saved. Shared. Clear.</h1><p>Your device keeps entries until the server confirms them.</p></div><div className="sync-center-actions"><Button onClick={()=>void sync()} disabled={syncing}>{syncing?'Syncing…':'Try syncing now'}</Button><NavLink className="settings-link" to="/reviews">Open shared reviews</NavLink></div>{message&&<p className="form-error" role="alert">{message}</p>}{queue.map(item=><details className="record-card" key={item.id}><summary><h2>{kindLabels[item.operation.kind]} · {readable(item.status)}</h2><p>{item.error||'Waiting for the server to confirm this entry.'}</p></summary><dl className="record-values">{Object.entries(item.operation.data).map(([key,value])=><div key={key}><dt>{readable(key)}</dt><dd><FieldValue name={key} value={value}/></dd></div>)}</dl><p className="panel-note">Submission {item.id} · {item.attempts} attempts</p>{item.status==='failed'&&<div className="detail-actions"><Button onClick={()=>setEditing(item)}>Review and correct</Button><Button variant="outline" onClick={()=>void db.archiveRejected(item.id).catch(error=>setMessage(error.message))}>Archive rejected submission</Button></div>}{item.status==='needs_review'&&<NavLink to="/reviews">Review both versions</NavLink>}</details>)}{!queue.length&&<div className="empty-state"><h2>Everything is shared.</h2><p>There are no pending local submissions.</p></div>}<Button variant="outline" onClick={()=>setShowArchive(!showArchive)}>{showArchive?"Hide":"Show"} resolved submissions ({archived.length})</Button>{showArchive&&archived.map(item=><details className="record-card" key={item.id}><summary>{kindLabels[item.operation.kind]} · resolved<p>{item.error}</p></summary><pre className="queue-json">{JSON.stringify(item.operation.data,null,2)}</pre></details>)}<Dialog open={!!editing} onOpenChange={open=>{if(!open)setEditing(null)}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>Review your saved details</DialogTitle><DialogDescription>This creates a new submission. Check against the shared record first. The rejected submission remains available until you archive it.</DialogDescription></DialogHeader>{editing&&<RecordEditor kind={editing.operation.kind} record={editing.operation.action!=="create"?records.find(record=>record.id===editing.operation.record_id):undefined} initialData={editing.operation.data} onClose={()=>setEditing(null)}/>}</DialogContent></Dialog></div>
}
