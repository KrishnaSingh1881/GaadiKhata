import type {RecordKind} from '../domain/records'
import {canManageBusiness} from '../domain/permissions'
import {Button} from './ui/button'
import {Icon} from './Icon'
import {useWorkspace} from '../data/WorkspaceProvider'

export function AddRecordButton({label,onClick}:{label:string;onClick:()=>void}) {
  const {member}=useWorkspace()
  const canCreate=canManageBusiness(member)
  return <div className="record-create-action">
    <Button type="button" className="record-create-button" disabled={!canCreate} onClick={onClick} aria-describedby={!canCreate?'creation-permission-note':undefined}>
      <Icon name="add-linear" size={19}/>{label}
    </Button>
    {!canCreate&&<small id="creation-permission-note">Business access is not available for this account</small>}
  </div>
}

export function QuickRecordActions({add}:{add:(kind:RecordKind,initialData?:Record<string,unknown>)=>void}) {
  const {member}=useWorkspace()
  if(!canManageBusiness(member))return null
  return <div className="quick-actions" role="group" aria-label="Add a record">
    <button type="button" onClick={()=>add('work')}><Icon name="delivery-linear"/>Work</button>
    <button type="button" onClick={()=>add('expense')}><Icon name="wallet-money-linear"/>Expense</button>
    <button type="button" onClick={()=>add('payment')}><Icon name="card-recive-linear"/>Payment</button>
  </div>
}
