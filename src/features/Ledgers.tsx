import {useState} from 'react'
import {NavLink} from 'react-router'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '../components/ui/tabs'
import {Button} from '../components/ui/button'
import {CancelledNotice} from '../components/CancelledNotice'
import {WorkTypeIcon} from '../components/WorkTypeIcon'
import {Icon} from '../components/Icon'
import {driverVehicleType} from '../domain/driver-vehicle'
import {ToggleGroup,ToggleGroupItem} from '../components/ui/toggle-group'
import {useWorkspace} from '../data/WorkspaceProvider'
import {summary} from '../domain/accounting'
import {businessDate,formatMoney,profitLoss} from '../domain/money'
import {ledgerRange,type LedgerPeriod} from '../domain/ledger-period'
import {RecordDetails} from './RecordDetails'
import {recordName} from './RecordEditor'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../components/ui/dialog'
import type {AnyRecord,RecordKind} from '../domain/records'

export function Ledgers({add,edit}:{add:(kind:RecordKind,data?:Record<string,unknown>)=>void;edit:(record:AnyRecord)=>void}) {
  const {records,choices}=useWorkspace()
  const [tab,setTab]=useState('driver'),[selected,setSelected]=useState(''),[detail,setDetail]=useState<AnyRecord|null>(null)
  const [period,setPeriod]=useState<LedgerPeriod>('all')
  const [entryFilter,setEntryFilter]=useState('all')
  const {from,to}=ledgerRange(period,businessDate())
  const entities=choices.filter(row=>row.kind===tab&&row.state==='active')
  const entity=entities.find(row=>row.id===selected)
  const entries=records.filter(row=>{
    if(!entity||!('business_date'in row.data))return false
    if(from&&row.data.business_date<from||to&&row.data.business_date>to)return false
    return tab==='driver'?(row.kind==='driver_payment'||row.kind==='work'&&['completed','cancelled'].includes(row.state))&&row.data.driver_id===selected:'vehicle_id'in row.data&&row.data.vehicle_id===selected
  }).sort((a,b)=>('business_date'in b.data?b.data.business_date:b.created_at).localeCompare('business_date'in a.data?a.data.business_date:a.created_at))
  const totals=summary(entries)
  const result=profitLoss(totals.margin)
  const visibleEntries=tab==='driver'?entries.filter(row=>entryFilter==='all'||(entryFilter==='payments'?row.kind==='driver_payment':row.kind==='work')):entries
  const completedWork=entries.filter(row=>row.kind==='work'&&row.state==='completed'&&row.version>0).length
  return <><div className="page-heading"><h1>Every ledger. <strong>One place.</strong></h1><p>Driver payments and vehicle performance.</p></div>
    <Tabs className="ledger-workspace" value={tab} onValueChange={value=>{setTab(value);setSelected('');setPeriod('all');setEntryFilter('all')}}>
      <TabsList className="ledger-tabs"><TabsTrigger value="driver">Drivers</TabsTrigger><TabsTrigger value="vehicle">Vehicles</TabsTrigger></TabsList>
      {['driver','vehicle'].map(kind=><TabsContent className="ledger-content" key={kind} value={kind}>
        {!entity?<><div className="section-heading"><h2>{kind==='driver'?'Driver ledgers':'Vehicle ledgers'}</h2></div><div className="ledger-entities">{entities.map(row=>{
          const type=row.kind==='vehicle'?row.data.vehicle_type:driverVehicleType(choices,row.id)
          return <Button key={row.id} type="button" variant="outline" className="ledger-entity" onClick={()=>{setSelected(row.id);setEntryFilter('all')}}><span className={`vehicle-icon ${type?`vehicle-type-${type.toLowerCase()}`:''}`} aria-hidden="true">{type?<WorkTypeIcon type={type}/>:<Icon name="users-group-rounded-linear" size={26}/>}</span><span className="ledger-entity-copy"><strong>{recordName(row)}</strong><small>{row.kind==='vehicle'?row.data.registration:type==='Hyva'?'Hyva driver':type==='JCB'?'JCB operator':'Not assigned'}{row.kind==='driver'&&row.data.phone?` · ${row.data.phone}`:''}{row.version===0?' · saved on this device':''}</small></span><span aria-hidden="true">→</span></Button>
        })}</div>{!entities.length&&<div className="empty-state"><h3>No {kind==='vehicle'?'vehicles':'drivers'} yet.</h3><p>{kind==='vehicle'?'Add vehicles in More to start their ledgers.':'Drivers appear here when you enter their name while recording work.'}</p>{kind==='vehicle'&&<NavLink className="settings-link" to="/more">Go to More</NavLink>}</div>}</>:<>
          <Button type="button" className="ledger-back" variant="ghost" onClick={()=>setSelected('')}>← All {kind==='vehicle'?'vehicles':'drivers'}</Button>
          <div className="section-heading ledger-entity-heading"><div><h2>{recordName(entity)}</h2>{entity.kind==='vehicle'&&<p className="ledger-registration">{entity.data.registration}</p>}</div><Button type="button" variant="outline" disabled={entity.version===0} onClick={()=>edit(entity)}>Edit {kind}</Button></div>
          <ToggleGroup className="ledger-period" type="single" value={period} onValueChange={value=>{if(value==='all'||value==='month'||value==='last-month')setPeriod(value)}} aria-label="Ledger period"><ToggleGroupItem value="all">All time</ToggleGroupItem><ToggleGroupItem value="month">This month</ToggleGroupItem><ToggleGroupItem value="last-month">Last month</ToggleGroupItem></ToggleGroup>
          <p className="ledger-period-caption">{period==='all'?'All recorded dates':`${from} – ${to}`}</p>
          <dl className="ledger-totals">{kind==='vehicle'?<><div><dt>Work recorded</dt><dd>{formatMoney(totals.billed)}</dd></div><div><dt>Costs</dt><dd>{formatMoney(totals.expenses)}</dd></div><div className={`ledger-result ${result.className}`}><dt>{result.label}</dt><dd>{formatMoney(result.amount)}</dd></div></>:<><div><dt>Work recorded</dt><dd>{completedWork}</dd></div><div><dt>Total paid</dt><dd>{formatMoney(totals.expenses)}</dd></div></>}</dl>
          <div className="ledger-actions">{kind==='vehicle'?<Button onClick={()=>add('expense',{vehicle_id:entity.id})}>Add expense</Button>:<Button onClick={()=>add('driver_payment',{driver_id:entity.id})}>Record payment</Button>}</div>
          <div className="ledger-entry-toolbar"><h3 className="ledger-entries-heading">Entries</h3>{kind==='driver'&&<ToggleGroup className="ledger-entry-filter" type="single" value={entryFilter} onValueChange={value=>{if(value==='all'||value==='payments'||value==='work')setEntryFilter(value)}} aria-label="Filter driver entries"><ToggleGroupItem value="all">All</ToggleGroupItem><ToggleGroupItem value="payments">Payments</ToggleGroupItem><ToggleGroupItem value="work">Work</ToggleGroupItem></ToggleGroup>}</div>
          <div className="record-list">{visibleEntries.map(row=><Button type="button" variant="ghost" className={`ledger-entry ${row.state==='cancelled'?'is-cancelled':''}`} key={row.id} onClick={()=>setDetail(row)}><span><strong>{row.kind==='expense'?recordName(choices.find(category=>category.id===row.data.category_id)):row.kind==='driver_payment'?row.data.payment_type:kind==='driver'&&row.kind==='work'?`${row.data.work_type} work`:recordName(row)}</strong><small>{'business_date'in row.data?row.data.business_date:''} · {row.kind==='driver_payment'&&row.state==='active'?'Paid':row.kind==='work'&&row.state!=='cancelled'?'Recorded':row.state.replaceAll('_',' ')}</small>{row.state==='cancelled'&&<CancelledNotice/>}</span><strong>{kind==='driver'&&row.kind==='work'?`${row.data.quantity??'—'} ${row.data.unit??''}`:'amount_paise'in row.data&&row.data.amount_paise!=null?formatMoney(row.data.amount_paise):'Not priced'}</strong></Button>)}</div>
          {!visibleEntries.length&&<p className="panel-note">{kind==='driver'&&entryFilter==='work'?'No work in this period.':kind==='driver'&&entryFilter==='payments'?'No payments in this period.':'No entries in this period.'}</p>}
          <p className="panel-note">{kind==='driver'?'Total paid includes driver payments only. Work recorded does not create automatic wages. Cancelled entries are excluded from totals.':'Totals use confirmed records and exclude cancelled entries. Vehicle costs include driver payments once.'}</p>
        </>}
      </TabsContent>)}
    </Tabs>
    <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>Entry details</DialogTitle><DialogDescription>Recorded details and the full change trail.</DialogDescription></DialogHeader>{detail&&<RecordDetails record={detail} edit={row=>{setDetail(null);edit(row)}}/>}</DialogContent></Dialog>
  </>
}
