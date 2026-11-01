import {useEffect,useState} from 'react'
import {WorkspaceStatus} from './WorkspaceStatus'
import {Button} from './ui/button'

export function WorkspaceLoading({checkingAccess=false}:{checkingAccess?:boolean}) {
 const [slow,setSlow]=useState(false)
 useEffect(()=>{const timer=window.setTimeout(()=>setSlow(true),15000);return()=>window.clearTimeout(timer)},[])
 return <WorkspaceStatus mode="loading" title="Opening your workspace" description={checkingAccess?'Checking your account’s access.':'Getting GaadiKhata ready.'} actions={slow?<Button onClick={()=>window.location.reload()}>Try again</Button>:undefined}>{slow&&<p>This is taking longer than usual. Check your connection and try again.</p>}</WorkspaceStatus>
}
