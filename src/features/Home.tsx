import {canManageBusiness} from '../domain/permissions'
import {useState} from 'react'
import {ProfitChart} from './ProfitChart'
import {NavLink} from 'react-router'
import {useWorkspace} from '../data/WorkspaceProvider'
import {summary,clientAccount} from '../domain/accounting'
import {businessDate,formatMoney,profitLoss} from '../domain/money'
import {Icon} from '../components/Icon'
import {WorkTypeIcon} from '../components/WorkTypeIcon'
import {recordName} from './RecordEditor'
import type {AnyRecord,RecordKind} from '../domain/records'

export function Home({add,edit}:{add:(kind:RecordKind,initialData?:Record<string,unknown>)=>void;edit:(record:AnyRecord)=>void}) {
  const {records,choices,member,queue}=useWorkspace();const today=businessDate()
  const [period,setPeriod]=useState('today')
  const from=period==='today'?today:period==='month'?`${today.slice(0,7)}-01`:'0000-01-01'
  const total=summary(records,from,today)
  const result=profitLoss(total.margin)
  const clients=records.filter(record=>record.kind==='client');const vehicles=choices.filter(record=>record.kind==='vehicle'&&record.state==='active')
  const pending=clients.reduce((sum,client)=>sum+clientAccount(records,client.id).pending,0)
  return <div className="home-dashboard"><div className="page-heading"><h1>Hello, <strong>{member.display_name.split(' ')[0]}.</strong></h1></div><div className="period-control" role="group" aria-label="Summary period">{[{value:'today',label:'Today'},{value:'month',label:'This month'},{value:'all',label:'All time'}].map(item=><button key={item.value} aria-pressed={period===item.value} onClick={()=>setPeriod(item.value)}>{item.label}</button>)}</div><div className="home-summary"><section className="money-overview"><div className="overview-top"><span>Work recorded{period==='today'?' today':period==='month'?' this month':''}</span><Icon name="arrow-right-up-linear" size={20}/></div><strong className="main-amount">{formatMoney(total.billed)}</strong><p>Accepted records. Clear, shared totals.</p><div className="money-breakdown"><div><span>Received</span><strong>{formatMoney(total.received)}</strong></div><div><span>Expenses</span><strong>{formatMoney(total.expenses)}</strong></div><div><span>To receive</span><strong>{formatMoney(pending)}</strong></div></div><div className="overview-footer"><span className={result.className}>{result.label} {formatMoney(result.amount)}</span> · To receive includes earlier work</div></section></div><section className="home-fleet"><div className="section-heading"><h2>Your fleet, right now</h2></div><div className="fleet-list">{vehicles.map(vehicle=>{
    const work=choices.find(record=>record.kind==='work'&&record.state==='in_progress'&&record.data.vehicle_id===vehicle.id)
    const vehicleTotal=summary(records.filter(record=>'vehicle_id'in record.data&&record.data.vehicle_id===vehicle.id),from,today)
    const vehicleResult=profitLoss(vehicleTotal.margin)
    return <div className="record-card" key={vehicle.id}><div className="vehicle-row"><div className={`vehicle-icon vehicle-type-${vehicle.kind==='vehicle'?vehicle.data.vehicle_type.toLowerCase():'hyva'}`}><WorkTypeIcon type={vehicle.kind==='vehicle'?vehicle.data.vehicle_type:'Hyva'}/></div><div className="vehicle-copy"><strong>{recordName(vehicle)}</strong><small>{vehicle.kind==='vehicle'?vehicle.data.registration:''}{vehicle.version===0?' · local':''}</small></div></div><dl className="record-values"><div><dt>Work recorded</dt><dd>{formatMoney(vehicleTotal.billed)}</dd></div><div><dt>Expenses</dt><dd>{formatMoney(vehicleTotal.expenses)}</dd></div><div className={vehicleResult.className}><dt>{vehicleResult.label}</dt><dd>{formatMoney(vehicleResult.amount)}</dd></div></dl>{canManageBusiness(member)&&<button className="settings-link" onClick={()=>work&&work.version>0?edit(work):add('work',{vehicle_id:vehicle.id,work_type:vehicle.kind==='vehicle'?vehicle.data.vehicle_type:'Hyva',driver_id:vehicle.kind==='vehicle'?vehicle.data.driver_id:null})}>{work?.version===0?'Another entry is saved locally':work?'Edit work':'Record work'}<Icon name="alt-arrow-right-linear" size={18}/></button>}</div>
  })}{!vehicles.length&&<div className="empty-state"><h3>Ready for your real fleet.</h3><p>Add your vehicles in More before recording work.</p></div>}</div>{queue.length>0&&<NavLink to="/sync" className="review-banner"><Icon name="history-linear"/><span><strong>{queue.length} {queue.length===1?'change':'changes'} not yet shared</strong><small>Check pending entries and anything needing attention.</small></span></NavLink>}</section><ProfitChart/></div>
}
