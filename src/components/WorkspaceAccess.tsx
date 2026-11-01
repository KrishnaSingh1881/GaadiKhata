import {SignOutButton,useUser} from '@clerk/react'
import {WorkspaceStatus} from './WorkspaceStatus'
import {Button} from './ui/button'

export function WorkspaceAccess({needsApproval,message,syncing,retry}:{needsApproval:boolean;message:string;syncing:boolean;retry:()=>Promise<void>}) {
 const {user}=useUser()
 const email=user?.primaryEmailAddress?.emailAddress
 return <WorkspaceStatus mode={needsApproval?'approval':'error'} title={needsApproval?'Waiting for approval':'Let’s get you connected'} description={needsApproval?'You’re signed in. An administrator needs to approve your access to Icchamani Construction.':message||'Check your connection and try again to open your workspace.'} actions={<><Button disabled={syncing} onClick={()=>void retry()}>{syncing?'Checking access…':needsApproval?'Check approval':'Try again'}</Button><SignOutButton><Button type="button" variant="outline">Use another Google account</Button></SignOutButton></>}>{needsApproval&&<>{email&&<div className="workspace-status-account"><span>Signed in as</span><strong>{email}</strong></div>}<p>No need to sign up again. We check for approval automatically while this screen is open.</p></>}</WorkspaceStatus>
}
