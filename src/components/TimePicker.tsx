import {lazy,Suspense,useState} from 'react'
import {Popover} from 'radix-ui'
import {Input} from './ui/input'
import {Button} from './ui/button'

const ClockPanel=lazy(()=>import('./TimeClockPanel'))
function displayTime(value:string) {
  if(!value)return ''
  const [hour,minute]=value.split(':').map(Number)
  return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour<12?'AM':'PM'}`
}
export function TimePicker({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  const [open,setOpen]=useState(false)
  return <Popover.Root open={open} onOpenChange={setOpen}><span className="time-input-control"><Input type="text" readOnly value={displayTime(value)} placeholder="Time" aria-label="Work time in IST" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}/><Popover.Trigger asChild><Button type="button" variant="ghost" className="time-input-clock" aria-label="Open AM/PM clock"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></Button></Popover.Trigger></span><Popover.Portal><Popover.Content className="mui-clock-popover" align="end" sideOffset={8} collisionPadding={12} aria-label="Choose work time"><Suspense fallback={<p className="clock-loading" role="status">Loading clock…</p>}><ClockPanel value={value} onSave={next=>{onChange(next);setOpen(false)}} onCancel={()=>setOpen(false)}/></Suspense></Popover.Content></Popover.Portal></Popover.Root>
}
