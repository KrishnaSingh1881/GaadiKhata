import {canManageBusiness} from '../domain/permissions'
import {useState} from 'react'
import {NavLink} from 'react-router'
import hyvaTruckImage from '../../revamp/hyva-truck-cutout.png?url'
import jcbLoaderImage from '../../revamp/jcb-backhoe-cutout.png?url'
import {useWorkspace} from '../data/WorkspaceProvider'
import {Icon} from '../components/Icon'
import {WorkTypeIcon} from '../components/WorkTypeIcon'
import {vehicleLabel} from '../domain/vehicle-label'
import {CancelledNotice} from '../components/CancelledNotice'
import {Button} from '../components/ui/button'
import {AddRecordButton,QuickRecordActions} from '../components/AddRecordButton'
import {DatePicker} from '../components/DatePicker'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../components/ui/dialog'
import {kindLabels,recordName} from './RecordEditor'
import {RecordDetails} from './RecordDetails'
import {useFavourites} from '../data/useFavourites'
import {businessDate,formatMoney,profitLoss} from '../domain/money'
import {clientAccount,summary} from '../domain/accounting'
import type {AnyRecord,RecordKind,RecordState} from '../domain/records'

type RecordsPageProps={title:string;kinds:RecordKind[];add:(kind:RecordKind,initialData?:Record<string,unknown>)=>void;edit:(record:AnyRecord)=>void;workType?:'Hyva'|'JCB'}

export function RecordsPage({title,kinds,add,edit,workType}:RecordsPageProps) {
  const {records,queue,change,member}=useWorkspace()
  const {favourites,toggle}=useFavourites()
  const [search,setSearch]=useState('');const [date,setDate]=useState('')
  const [history,setHistory]=useState<AnyRecord|null>(null);const [correction,setCorrection]=useState<{record:AnyRecord;restore:boolean}|null>(null)
  const [reason,setReason]=useState('');const [message,setMessage]=useState('');const [saving,setSaving]=useState(false)
  const name=(id:unknown)=>{const record=records.find(record=>record.id===id);return record?.kind==='vehicle'?vehicleLabel(record.data):recordName(record)}
  const visibleKinds=workType?['work' as const]:kinds
  const allWork=records.filter(record=>record.kind==='work'&&record.state!=='cancelled').map(record=>record.kind==='work'?record:null).filter((record):record is Extract<AnyRecord,{kind:'work'}>=>record!==null)
  const today=businessDate()
  const todayRecords=records.filter(record=>record.state!=='cancelled'&&record.version>0&&'business_date'in record.data&&record.data.business_date===today&&['work','expense','payment','driver_payment'].includes(record.kind)).sort((a,b)=>b.created_at.localeCompare(a.created_at))
  const todayTotals=summary(todayRecords,today,today)
  const todayWork=todayRecords.filter((record):record is Extract<AnyRecord,{kind:'work'}>=>record.kind==='work')
  const todayExpenses=todayRecords.filter(record=>record.kind==='expense'||record.kind==='driver_payment')
  const todayPayments=todayRecords.filter((record):record is Extract<AnyRecord,{kind:'payment'}>=>record.kind==='payment')
  const todayLabel=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Kolkata'}).format(new Date(`${today}T12:00:00+05:30`))
  const amountDueByWork=new Map<string,number>()
  for(const client of records.filter((record):record is Extract<AnyRecord,{kind:'client'}>=>record.kind==='client')) {
    for(const unpaid of clientAccount(records,client.id).unpaid)amountDueByWork.set(unpaid.recordId,unpaid.amountPaise)
  }
  const fleetCards=(['Hyva','JCB'] as const).map(type=>{
    const typeWork=allWork.filter(record=>record.version>0&&record.data.work_type===type)
    const typeVehicles=records.filter((record):record is Extract<AnyRecord,{kind:'vehicle'}>=>record.kind==='vehicle'&&record.data.vehicle_type===type)
    const vehicleIds=new Set(typeVehicles.map(record=>record.id))
    const related=records.filter(record=>record.version>0&&record.state!=='cancelled'&&((record.kind==='work'&&record.data.work_type===type)||((record.kind==='expense'||record.kind==='driver_payment')&&vehicleIds.has(record.data.vehicle_id))))
    const totals=summary(related)
    const toReceive=typeWork.reduce((sum,record)=>sum+(amountDueByWork.get(record.id)??0),0)
    return {type,total:typeWork.length,completed:typeWork.filter(record=>record.state==='completed').length,ongoing:typeWork.filter(record=>record.state==='in_progress').length,activeVehicles:typeVehicles.filter(record=>record.state==='active').length,profit:totals.margin,costs:totals.expenses,toReceive}
  })
  const filtered=records.filter(record=>visibleKinds.includes(record.kind)&&(!workType||record.kind==='work'&&record.data.work_type===workType)&&(!date||!('business_date'in record.data)||record.data.business_date===date)&&[JSON.stringify(record.data),...Object.entries(record.data).filter(([key])=>key.endsWith('_id')).map(([,value])=>name(value))].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b)=>('business_date'in b.data?b.data.business_date:b.created_at).localeCompare('business_date'in a.data?a.data.business_date:a.created_at))
  async function correct() {
    if(!correction)return
    setSaving(true);setMessage('')
    try {
      const record=correction.record
      const master=['vehicle','client','driver','partner','material','route','site','expense_category','field_template'].includes(record.kind)
      const state:RecordState=correction.restore?(record.kind==='work'?'completed':'active'):(master?'inactive':'cancelled')
      await change(record,{},state,correction.restore?'restore':'cancel',reason)
      setCorrection(null);setReason('')
    }catch(error){setMessage(error instanceof Error?error.message:'Could not save this correction.')}finally{setSaving(false)}
  }
  const workOverview=kinds.includes('work')&&!workType
  return <>{workOverview?<>
    <div className="page-heading work-overview-heading"><h1>Today <strong>at work.</strong></h1><p>{todayLabel}</p></div>
    <QuickRecordActions add={(kind,initialData)=>add(kind,initialData)}/>
    <section className="work-today-summary" aria-label="Today’s totals">
      <article><span>Trips &amp; jobs</span><strong>{todayWork.length}</strong><small>{todayWork.filter(record=>record.state==='completed').length} completed</small></article>
      <article><span>Expenses</span><strong>{formatMoney(todayTotals.expenses)}</strong><small>{todayExpenses.length} entries</small></article>
      <article><span>Payments</span><strong>{formatMoney(todayTotals.received)}</strong><small>{todayPayments.length} received</small></article>
    </section>
    <section className="work-fleet-picker" aria-label="Fleet performance">
      <div className="work-dashboard-section-heading"><h2>Fleet performance</h2><span>All time</span></div>
      <div className="work-category-cards">{fleetCards.map(category=><NavLink className={'work-category-card work-category-'+(category.type==='Hyva'?'sand':'sage')} to={category.type==='Hyva'?'/work/hyva':'/work/jcb'} key={category.type}>
        <span className="work-category-art" aria-hidden="true"><img src={category.type==='Hyva'?hyvaTruckImage:jcbLoaderImage} alt=""/></span>
        <span className="work-category-head"><strong>{category.type}</strong><small>{category.activeVehicles} {category.activeVehicles===1?'vehicle':'vehicles'}</small></span>
        <span className={`work-category-profit ${profitLoss(category.profit).className}`}><strong>{formatMoney(profitLoss(category.profit).amount)}</strong><small>{profitLoss(category.profit).label} <em>· All time</em></small></span>
        <span className="work-category-financials">
          <span className="is-cost" aria-label={`All-time costs ${formatMoney(category.costs)}`}><small>Costs</small><strong>{formatMoney(category.costs)}</strong></span>
          <span className="is-due"><small>To receive</small><strong>{formatMoney(category.toReceive)}</strong></span>
        </span>
        <span className="work-category-volume">{category.completed} completed · {category.ongoing} ongoing</span>
        <span className="work-category-open">View {category.type==='Hyva'?'trip':'job'} history<Icon name="alt-arrow-right-linear" size={17}/></span>
      </NavLink>)}</div>
    </section>
    {queue.length>0&&<NavLink className="work-local-queue" to="/sync">{queue.length} local {queue.length===1?'entry':'entries'} waiting to sync<Icon name="alt-arrow-right-linear" size={17}/></NavLink>}
  </>:<>
    <div className="page-heading"><h1>{title}</h1><p>Accepted records, with their history preserved.</p></div>
    <div className="work-toolbar"><div className="search-controls"><div className="search-box"><Icon name="magnifier-linear" size={20}/><input aria-label="Search records" placeholder="Client, vehicle, route or note" value={search} onChange={event=>setSearch(event.target.value)}/></div><DatePicker value={date} onChange={setDate}/></div>{!kinds.includes('work')&&<AddRecordButton label="Add record" onClick={()=>add(kinds[0])}/>}</div>
    {kinds.includes('work')&&<QuickRecordActions add={(kind,initialData)=>add(kind,initialData??(kind==='work'&&workType?{work_type:workType}:undefined))}/>}
    <div className="work-list-heading"><NavLink to="/work" className="work-category-back"><Icon name="alt-arrow-left-linear" size={17}/>All work</NavLink><h2>{workType==='Hyva'?'Hyva trips':workType==='JCB'?'JCB jobs':'Recent records'}</h2></div>
  </>}
  {message&&<p className="form-error" role="alert">{message}</p>}{!workOverview&&<><div className="record-list">{filtered.map(record=>{
    const inactive=['cancelled','inactive'].includes(record.state)
    return <article className={`record-card record-card-clickable ${record.state==='cancelled'?'is-cancelled':''}`} key={record.id} onClick={event=>{if(event.target instanceof Element&&!event.target.closest('button,a,input,select,textarea,summary')&&!window.getSelection()?.toString())setHistory(record)}}>{record.state==='cancelled'&&<CancelledNotice/>}<div className={`record-top ${record.kind==='work'?'work-record-header':''}`}>{record.kind==='work'?<button type="button" className="work-record-title" onClick={()=>setHistory(record)} aria-label={`View ${record.data.work_type} work details`}><span className={`work-record-icon vehicle-type-${record.data.work_type.toLowerCase()}`}><WorkTypeIcon type={record.data.work_type}/></span><h3>{record.data.work_type} work</h3></button>:<span>{kindLabels[record.kind]}</span>}{'amount_paise'in record.data&&record.data.amount_paise!=null&&<strong>{formatMoney(record.data.amount_paise)}</strong>}</div>{record.kind!=='work'&&<button type="button" className="record-open" onClick={()=>setHistory(record)}><h3>{recordName(record)}</h3><span>View details and change trail →</span></button>}{record.kind==='work'&&record.data.description&&<p className="work-record-description">{record.data.description}</p>}<p>{'business_date'in record.data?record.data.business_date:record.state}</p><dl className="record-values">{Object.entries(record.data).filter(([key,value])=>value!=null&&value!==''&&['vehicle_id','client_id','driver_id','partner_id','material_id','route_id','site_id','category_id','quantity','unit','registration','phone','payment_mode','entry_type','payment_type','counterparty','note'].includes(key)).map(([key,value])=><div key={key}><dt>{key.replace(/_id$/,'').replaceAll('_',' ')}</dt><dd>{key.endsWith('_id')?name(value):String(value)}</dd></div>)}</dl><div className="record-meta"><span>Version {record.version}</span>{record.state!=='cancelled'&&<span className="badge">{record.state.replaceAll('_',' ')}</span>}</div><div className="detail-actions"><Button variant="outline" onClick={()=>setHistory(record)}>View details</Button>{["vehicle","client","route"].includes(record.kind)&&<Button variant="outline" aria-pressed={favourites.has(record.id)} onClick={()=>{void toggle(record.id).catch(()=>setMessage("Could not save this favourite on this device."))}}>{favourites.has(record.id)?"Unpin":"Pin"}</Button>}{canManageBusiness(member)&&record.kind!=='material'&&<><Button variant="outline" onClick={()=>edit(record)} disabled={inactive}>{record.kind==='work'&&record.state==='in_progress'?'Complete / edit':'Edit'}</Button><Button variant="outline" onClick={()=>{setReason('');setCorrection({record,restore:inactive})}}>{inactive?'Restore':['vehicle','client','driver','partner','route','site','expense_category','field_template'].includes(record.kind)?'Deactivate':'Cancel entry'}</Button></>}</div></article>
  })}</div>{!filtered.length&&<div className="empty-state"><h3>{workType==='Hyva'?'No Hyva trips yet.':workType==='JCB'?'No JCB jobs yet.':'No matching records.'}</h3><p>{canManageBusiness(member)?'Try another filter, or create the first entry.':'Try another filter. This account cannot create entries.'}</p>{canManageBusiness(member)&&!kinds.includes('work')&&<Button type="button" className="empty-create-button" onClick={()=>add(kinds[0])}>Add record</Button>}</div>}{queue.some(item=>visibleKinds.includes(item.operation.kind)&&(!workType||item.operation.kind==='work'&&item.operation.data.work_type===workType))&&<NavLink className="settings-link" to="/sync">See local entries waiting to sync or review</NavLink>}</> }<Dialog open={!!history} onOpenChange={open=>{if(!open)setHistory(null)}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>Entry details</DialogTitle><DialogDescription>Recorded details, authorship, and changes.</DialogDescription></DialogHeader>{history&&<RecordDetails record={history} edit={record=>{setHistory(null);edit(record)}}/>}</DialogContent></Dialog><Dialog open={!!correction} onOpenChange={open=>{if(!open&&!saving)setCorrection(null)}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>{correction?.restore?'Restore this entry':correction&&['vehicle','client','driver','partner','route','site','expense_category','field_template'].includes(correction.record.kind)?'Deactivate this item':'Cancel this entry'}</DialogTitle><DialogDescription>This entry stays in the change history. Add a reason for everyone to see.</DialogDescription></DialogHeader><form className="entry-form" onSubmit={event=>{event.preventDefault();void correct()}}><label>Reason<textarea required maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label>{message&&<p className="form-error" role="alert">{message}</p>}<Button type="submit" disabled={saving||!reason.trim()}>{saving?'Saving…':'Save correction'}</Button></form></DialogContent></Dialog></>
}
