import {useState} from 'react'
import {CancelledNotice} from '../components/CancelledNotice'
import {useWorkspace} from '../data/WorkspaceProvider'
import {Card,CardHeader,CardTitle,CardDescription,CardContent,CardFooter} from '../components/ui/card'
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '../components/ui/accordion'
import {Badge} from '../components/ui/badge'
import {WorkTypeIcon} from '../components/WorkTypeIcon'
import {formatMoney} from '../domain/money'
import {recordName} from './RecordEditor'
import {RecordDetails} from './RecordDetails'
import type {AnyRecord} from '../domain/records'

type Transaction=Extract<AnyRecord,{kind:'work'|'payment'}>
export function ClientTransactionCard({record,clientName,actorName,edit}:{record:Transaction;clientName:string;actorName:(subject:string)=>string;edit:(record:AnyRecord)=>void}) {
  const {records}=useWorkspace()
  const [open,setOpen]=useState('')
  const name=(id:string|null)=>id?recordName(records.find(row=>row.id===id)):'Not recorded'
  const type=record.kind==='work'?record.data.work_type:'payment'
  const date=new Date(`${record.data.business_date}T12:00:00+05:30`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'})
  const details:[string,string][]=[]
  if(record.kind==='work'){
    const vehicle=records.find(row=>row.id===record.data.vehicle_id)
    details.push(['Vehicle',name(record.data.vehicle_id)])
    if(vehicle?.kind==='vehicle')details.push(['Registration',vehicle.data.registration])
    details.push([type==='JCB'?'Operator':'Driver',name(record.data.driver_id)])
    details.push([type==='JCB'?'Hours worked':'Quantity',record.data.quantity==null?'Not recorded':`${record.data.quantity}${type==='Hyva'?` ${record.data.unit??''}`:''}`])
    if(type==='Hyva')details.push(['Material',name(record.data.material_id)])
    else details.push(['Work site',name(record.data.site_id)])
    if(record.data.description)details.push(['Work',record.data.description])
  }else{
    details.push(['Paid by',clientName],['Payment method',record.data.payment_mode])
    const receiver=record.data.extras?.['Received by']
    if(typeof receiver==='string'&&receiver.trim())details.push(['Received by',actorName(receiver)])
  }
  details.push(['Recorded by',actorName(record.created_by)])
  if(record.version>1)details.push(['Last edited by',actorName(record.updated_by)])
  return <Card className={`client-transaction-card record-card-clickable ${record.state==='cancelled'?'is-cancelled':''}`} onClick={event=>{if(event.target instanceof Element&&!event.target.closest('button,a,input,select,textarea,[data-slot=accordion-content]')&&!window.getSelection()?.toString())setOpen('history')}}>{record.state==='cancelled'&&<CancelledNotice/>}
    <CardHeader className="client-transaction-header"><div className="client-transaction-title"><span className={`client-transaction-icon ${type==='payment'?'is-payment':`vehicle-type-${type.toLowerCase()}`}`}><WorkTypeIcon type={type}/></span><div><CardTitle>{type==='Hyva'?'Hyva trip':type==='JCB'?'JCB work':'Payment received'}</CardTitle><CardDescription>{type==='JCB'?'Backhoe loader · ':''}{date}</CardDescription></div></div><strong className={`client-transaction-amount ${type==='payment'&&record.state!=='cancelled'?'result-profit':''}`}>{record.data.amount_paise==null?'Not priced':formatMoney(record.data.amount_paise)}</strong></CardHeader>
    <CardContent>{record.state!=='cancelled'&&<Badge variant="outline" className="client-transaction-status">{record.version===0?'Waiting to sync':'Confirmed'}</Badge>}<dl className="client-transaction-details">{details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{record.data.note&&<p className="client-transaction-note"><span>Note</span>{record.data.note}</p>}</CardContent>
    <CardFooter><Accordion type="single" collapsible value={open} onValueChange={setOpen} className="client-transaction-history"><AccordionItem value="history"><AccordionTrigger>Details and change history</AccordionTrigger><AccordionContent><RecordDetails record={record} edit={edit}/></AccordionContent></AccordionItem></Accordion></CardFooter>
  </Card>
}
