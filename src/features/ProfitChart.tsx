import {useMemo,useRef,useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {Popover} from 'radix-ui'
import gsap from 'gsap'
import {useGSAP} from '@gsap/react'
import {useWorkspace} from '../data/WorkspaceProvider'
import {businessDate,formatMoney,profitLoss} from '../domain/money'
import {chartMaximum,profitChart} from '../domain/profit-chart'

gsap.registerPlugin(useGSAP)

export function ProfitChart() {
  const {records,queue,syncing,syncError,db}=useWorkspace()
  const lastSync=useLiveQuery(()=>db.metadata.get('last_sync'),[db])
  const [period,setPeriod]=useState<'weekly'|'monthly'>('weekly')
  const root=useRef<HTMLElement>(null),amount=useRef<HTMLElement>(null)
  const today=businessDate()
  const points=useMemo(()=>profitChart(records,today,period),[records,today,period])
  const earnings=points.reduce((sum,p)=>sum+p.earnings,0),costs=points.reduce((sum,p)=>sum+p.costs,0),net=earnings-costs
  const result=profitLoss(net)
  const maximum=chartMaximum(Math.max(0,...points.flatMap(p=>[p.earnings,p.costs])))
  const dateLabel=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})
  const rangeStart=points[0]?.from??today
  const rangeEnd=(points.at(-1)?.to??today)>today?today:points.at(-1)?.to??today
  const pending=queue.filter(item=>['work','expense','driver_payment'].includes(item.operation.kind)).length
  const updated=typeof lastSync?.value==='string'?new Date(lastSync.value).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',second:'2-digit',timeZone:'Asia/Kolkata'}):''
  useGSAP(()=>{
    const media=gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.fromTo('.profit-bar',{scaleY:0},{scaleY:1,duration:.65,stagger:.025,ease:'power3.out',transformOrigin:'bottom center'})
      const counter={value:0}
      gsap.to(counter,{value:Math.abs(net),duration:.7,ease:'power3.out',onUpdate:()=>{if(amount.current)amount.current.textContent=formatMoney(Math.round(counter.value))}})
    })
    return()=>media.revert()
  },{scope:root,dependencies:[points,net],revertOnUpdate:true})
  return <section className="home-recent profit-section" ref={root} aria-labelledby="profit-heading">
    <div className="section-heading"><h2 id="profit-heading">Earnings & costs</h2></div>
    <div className="profit-card">
      <div className="profit-heading"><div><span className={result.className}>{result.label}</span><strong ref={amount} className={result.className}>{formatMoney(result.amount)}</strong></div>
        <div className="period-control" role="group" aria-label="Chart period">{(['weekly','monthly'] as const).map(value=><button key={value} aria-pressed={period===value} onClick={()=>setPeriod(value)}>{value==='weekly'?'Weekly':'Monthly'}</button>)}</div>
      </div>
      <p className="profit-dates">{period==='weekly'?'Week':'Month'} · {rangeStart===rangeEnd?dateLabel(rangeStart):`${dateLabel(rangeStart)} – ${dateLabel(rangeEnd)}`}</p>
      <div className="profit-legend"><span><i className="earnings-key"/>Earnings <b>{formatMoney(earnings)}</b></span><span><i className="costs-key"/>Costs <b>{formatMoney(costs)}</b></span></div>
      <div className="profit-plot"><div className="profit-grid" aria-hidden="true"><span>{formatMoney(maximum)}</span><span>{formatMoney(Math.round(maximum/2))}</span><span>₹0</span></div><div className="profit-groups">
        {points.map(point=><Popover.Root key={`${period}-${point.from}`}><Popover.Trigger asChild><button className="profit-group" aria-label={`${point.label}: earnings ${formatMoney(point.earnings)}, costs ${formatMoney(point.costs)}, ${profitLoss(point.earnings-point.costs).label} ${formatMoney(Math.abs(point.earnings-point.costs))}`}><span className="profit-bars"><span className="profit-bar earnings-bar" style={{height:`${point.earnings/maximum*100}%`}}/><span className="profit-bar costs-bar" style={{height:`${point.costs/maximum*100}%`}}/></span><span className="profit-label">{point.label}</span></button></Popover.Trigger><Popover.Portal><Popover.Content className="profit-tooltip" side="top" sideOffset={8} collisionPadding={16} onOpenAutoFocus={event=>event.preventDefault()}><strong>{point.from===point.to?point.from:`${point.from} – ${point.to}`}</strong><dl><div><dt>Earnings</dt><dd>{formatMoney(point.earnings)}</dd></div><div><dt>Costs</dt><dd>{formatMoney(point.costs)}</dd></div><div className={profitLoss(point.earnings-point.costs).className}><dt>{profitLoss(point.earnings-point.costs).label}</dt><dd>{formatMoney(profitLoss(point.earnings-point.costs).amount)}</dd></div></dl><Popover.Arrow className="profit-tooltip-arrow"/></Popover.Content></Popover.Portal></Popover.Root>)}
      </div></div>
      {earnings===0&&costs===0&&<p className="profit-empty">Your chart will fill as work and expenses are recorded.</p>}
      <p className="profit-sync-status" role="status">{syncError?'Sync delayed · showing last confirmed records':syncing?'Updating confirmed records…':pending?`${pending} ${pending===1?'change':'changes'} awaiting sync or review`:updated?`Updated ${updated} IST`:'Waiting for first sync'}{pending>0&&syncing?` · ${pending} pending`:''}</p>
      <p className="profit-footnote">Based on recorded completed work and expenses. Tap a pair for details.</p>
    </div>
  </section>
}
