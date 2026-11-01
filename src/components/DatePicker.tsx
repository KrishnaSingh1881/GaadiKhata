import {useState} from 'react'
import {Popover} from 'radix-ui'
import {Button} from './ui/button'
import {Calendar} from './ui/calendar'

function parseDate(value:string) {
  if(!value)return undefined
  const [year,month,day]=value.split('-').map(Number)
  return new Date(year,month-1,day)
}
function formatDate(date:Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
export function DatePicker({value,onChange,label='Filter by date',required=false}:{value:string;onChange:(value:string)=>void;label?:string;required?:boolean}) {
  const [open,setOpen]=useState(false)
  const date=parseDate(value)
  return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><Button type="button" variant="outline" className="date-picker-trigger" aria-label={date?`${label}: ${value}`:label} aria-required={required} title={label}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7.5 3v4M16.5 3v4M4 9.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>{date?<span>{new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',...(label==='Filter by date'?{}:{year:'numeric'})}).format(date)}</span>:label!=='Filter by date'?<span>Choose date</span>:null}</Button></Popover.Trigger><Popover.Portal><Popover.Content className="date-picker-content" align="end" sideOffset={8} collisionPadding={12}><div className="date-picker-heading"><strong>{label}</strong>{date&&!required&&<button type="button" onClick={()=>{onChange('');setOpen(false)}}>Clear</button>}</div><Calendar selected={date} onSelect={picked=>{if(picked){onChange(formatDate(picked));setOpen(false)}else if(!required)onChange('')}} defaultMonth={date??new Date()} autoFocus/></Popover.Content></Popover.Portal></Popover.Root>
}
