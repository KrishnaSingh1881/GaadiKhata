import {useState} from 'react'
import {useWorkspace} from '../data/WorkspaceProvider'
import {Button} from './ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog'

export function EditableFieldLabel({fieldId,label,onSaved}:{fieldId:string;label:string;onSaved:()=>Promise<void>}) {
  const {member,client}=useWorkspace()
  const [open,setOpen]=useState(false),[wording,setWording]=useState(label),[busy,setBusy]=useState(false),[error,setError]=useState('')
  async function save() {
    setBusy(true);setError('')
    try {
      if(!navigator.onLine)throw new Error('Connect to rename this label.')
      const {error}=await client.rpc('set_form_label',{field_id:fieldId,wording:wording.trim()})
      if(error)throw new Error(error.message)
      await onSaved();setOpen(false)
    }catch(error){setError(error instanceof Error?error.message:'Could not save the label.')}finally{setBusy(false)}
  }
  return <>{label}{member.role==='technical_admin'&&<><button type="button" className="edit-field-label" aria-label={`Rename ${label} label`} onClick={event=>{event.preventDefault();setWording(label);setError('');setOpen(true)}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z"/></svg></button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Edit label</DialogTitle><DialogDescription>This form label changes for everyone. Saved values stay the same.</DialogDescription></DialogHeader><label>Label<input value={wording} maxLength={80} onChange={event=>setWording(event.target.value)}/></label>{error&&<p role="alert" className="form-error">{error}</p>}<Button type="button" disabled={busy||!wording.trim()} onClick={()=>void save()}>{busy?'Saving…':'Save label'}</Button></DialogContent></Dialog></>}</>
}
