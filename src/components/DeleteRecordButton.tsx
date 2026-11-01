import {useState} from 'react'
import {useWorkspace} from '../data/WorkspaceProvider'
import type {AnyRecord} from '../domain/records'
import {Button} from './ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog'
type Preview={ids:string[];version:number;counts:Record<string,number>}
export function DeleteRecordButton({record,onDeleted}:{record:AnyRecord;onDeleted?:()=>void}) {
 const {member,client,db,sync,trialDeletionEnabled}=useWorkspace()
 const [open,setOpen]=useState(false),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmation,setConfirmation]=useState('')
 if(!record||member.role!=='technical_admin'||!trialDeletionEnabled)return null
 async function review() {
  setOpen(true);setPreview(null);setConfirmation('');setError('');setBusy(true)
  try {if(!navigator.onLine)throw new Error('Connect to permanently delete records.');const {data,error}=await client.rpc('preview_trial_delete',{record_id:record.id});if(error)throw new Error(error.message);setPreview(data as Preview)}catch(error){setError(error instanceof Error?error.message:'Could not check linked records.')}finally{setBusy(false)}
 }
 async function remove() {
  if(!preview||confirmation!=='DELETE')return
  setBusy(true);setError('')
  try {
   const {data,error}=await client.rpc('trial_delete_record',{record_id:record.id,expected_version:preview.version,expected_ids:preview.ids})
   if(error)throw new Error(error.message)
   await db.storeRecords([],undefined,data as string[]);setOpen(false);onDeleted?.();await sync()
  }catch(error){setError(error instanceof Error?error.message:'Could not delete. Review the current records before retrying.')}finally{setBusy(false)}
 }
 return <><Button type="button" variant="outline" className="permanent-delete-button" disabled={record.version===0} onClick={event=>{event.stopPropagation();void review()}}>Delete</Button><Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value)}}><DialogContent><DialogHeader><DialogTitle>Permanently delete?</DialogTitle><DialogDescription>This removes this record, all linked records listed below, and their history. This cannot be undone.</DialogDescription></DialogHeader>{preview&&<><ul>{Object.entries(preview.counts).map(([kind,count])=><li key={kind}>{kind.replaceAll('_',' ')}: {count}</li>)}</ul><label>Type DELETE to confirm<input autoComplete="off" value={confirmation} onChange={event=>setConfirmation(event.target.value)}/></label></>}{error&&<p className="form-error" role="alert">{error}</p>}<Button type="button" variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Keep records</Button><Button type="button" className="permanent-delete-button" disabled={busy||!preview||confirmation!=='DELETE'} onClick={()=>void remove()}>{busy?'Working…':'Delete permanently'}</Button></DialogContent></Dialog></>
}
