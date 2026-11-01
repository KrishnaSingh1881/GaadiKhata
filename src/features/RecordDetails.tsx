import {useWorkspace} from '../data/WorkspaceProvider'
import {Button} from '../components/ui/button'
import {RecordProvenance} from './RecordProvenance'
import {History} from './Activity'
import {CancellationDetails} from './CancellationDetails'
import {kindLabels,recordName} from './RecordEditor'
import {formatMoney} from '../domain/money'
import {vehicleLabel} from '../domain/vehicle-label'
import {canManageBusiness} from '../domain/permissions'
import type {AnyRecord} from '../domain/records'
import {validateRecord} from '../domain/records'
import {useState} from 'react'

export function RecordDetails({record,edit}:{record:AnyRecord;edit:(record:AnyRecord)=>void}) {
  const {choices,member,records,change}=useWorkspace()
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  const current=records.find(row=>row.id===record.id)??record
  async function complete() {
    if(current.kind!=='work'||current.state!=='in_progress'||saving)return
    try {validateRecord('work',current.data,'completed')}
    catch {setMessage('Add the final quantity or hours and amount using Edit entry, then choose Completed.');return}
    setSaving(true);setMessage('')
    try {await change(current,{},'completed','update','')}
    catch(error){setMessage(error instanceof Error?error.message:'Could not complete this work. Please try again.')}
    finally {setSaving(false)}
  }
  const display=(key:string,value:unknown):string=>{
    if(value==null||value==='')return '—'
    if(key.endsWith('_id')){const linked=choices.find(row=>row.id===value);return linked?.kind==='vehicle'?vehicleLabel(linked.data):String(recordName(linked))}
    if(key==='amount_paise'&&typeof value==='number')return formatMoney(value)
    if(typeof value==='boolean')return value?'Yes':'No'
    if(typeof value==='object')return Object.entries(value).map(([label,entry])=>`${label}: ${String(entry)}`).join(' · ')
    return String(value)
  }
  return <div className="record-details">{current.state==='cancelled'&&<CancellationDetails recordId={current.id}/>}<RecordProvenance record={current}/><dl className="record-values">{Object.entries(current.data).filter(([key,value])=>!(current.kind==='vehicle'&&key==='name')&&value!==null&&value!==''&&!(typeof value==='object'&&Object.keys(value??{}).length===0)).map(([key,value])=><div key={key}><dt>{key==='amount_paise'?'Amount':key==='extras'?'Additional details':key.replace(/_id$/,'').replaceAll('_',' ')}</dt><dd>{display(key,value)}</dd></div>)}</dl><p className="panel-note">{kindLabels[current.kind]} · {current.state.replaceAll('_',' ')} · version {current.version}</p>
    {canManageBusiness(member)&&!['cancelled','inactive'].includes(current.state)&&current.kind!=='material'&&<Button type="button" variant="outline" onClick={()=>edit(current)}>Edit entry</Button>}
    {canManageBusiness(member)&&current.kind==='work'&&current.state==='in_progress'&&<Button type="button" disabled={saving} onClick={()=>void complete()}>{saving?'Saving…':'Mark completed'}</Button>}
    {message&&<p className="form-error" role="alert">{message}</p>}
    <History recordId={record.id}/>
  </div>
}
