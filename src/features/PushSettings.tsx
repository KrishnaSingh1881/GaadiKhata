import {useEffect,useState} from 'react'
import {useWorkspace} from '../data/WorkspaceProvider'
import {Button} from '../components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../components/ui/dialog'
import {InstallApp} from './InstallApp'
import {subscribeDevice} from '../data/push'

export function PushSettings() {
  const {client}=useWorkspace()
  const [settingsHelp,setSettingsHelp]=useState(false)
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const [registration,setRegistration]=useState<ServiceWorkerRegistration|null>(null)
  const key=String(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY??'').trim()
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
  const installed=window.matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone
  const supported=typeof Notification!=='undefined'&&'serviceWorker'in navigator&&'PushManager'in window
  const needsInstall=ios&&!installed
  useEffect(()=>{
    if(!supported||needsInstall)return
    let active=true
    void navigator.serviceWorker.ready.then(async worker=>{
      const subscription=await worker.pushManager.getSubscription()
      if(active){setRegistration(worker);setEnabled(!!subscription&&Notification.permission==='granted')}
    }).catch(()=>{if(active)setMessage('The app could not prepare notifications. Reload while connected and try again.')})
    return()=>{active=false}
  },[supported,needsInstall])
  async function enable() {
    setBusy(true);setMessage('')
    try {
      if(!navigator.onLine)throw new Error('Connect to enable notifications.')
      if(!key)throw new Error('Notifications are not ready yet. Please try again after the app updates.')
      if(!registration?.active)throw new Error('Notifications are still getting ready. Reload while connected and try again.')
      const permission=await Notification.requestPermission()
      if(permission!=='granted')throw new Error(permission==='denied'?'Notifications are blocked. Allow them in your browser or device settings, then try again.':'Permission was not granted. Tap Enable notifications to try again.')
      await subscribeDevice(registration,key,async subscription=>{
        const {error}=await client.rpc('save_push_subscription',{subscription})
        if(error)throw new Error(error.message)
      })
      setEnabled(true);setMessage('Notifications are enabled on this device.')
    }catch(error){setMessage(error instanceof Error?error.message:'Could not enable notifications. Please try again.')}finally{setBusy(false)}
  }
  async function disable() {
    setBusy(true);setMessage('')
    try {
      const worker=registration??await navigator.serviceWorker.getRegistration();const subscription=await worker?.pushManager.getSubscription()
      if(subscription){await subscription.unsubscribe();setEnabled(false);if(navigator.onLine){const {error}=await client.rpc('remove_push_subscription',{endpoint:subscription.endpoint});if(error)throw new Error('Device notifications are off. The saved subscription could not be removed; try again when connected.')}}
      setEnabled(false);setMessage('Notifications are off on this device.')
    }catch(error){setMessage(error instanceof Error?error.message:'Could not disable notifications.')}finally{setBusy(false)}
  }
  const blocked=supported&&Notification.permission==='denied'
  return <section className="record-card notification-setup"><h2>Push notifications</h2><p className="panel-note">Work updates and reviews, on your device.</p>
    {needsInstall?<><p className="panel-note">Install the app first to enable notifications.</p><InstallApp compact/></>:!supported?<p className="panel-note">Notifications aren’t supported in this browser.</p>:blocked?<Button type="button" variant="outline" onClick={()=>setSettingsHelp(true)}>Notification settings</Button>:<Button type="button" variant="outline" disabled={busy||(!enabled&&(!registration||!key))} onClick={()=>void(enabled?disable():enable())}>{busy?'Updating…':enabled?'Turn off notifications':!key?'Notifications unavailable':!registration?'Preparing notifications…':'Enable notifications'}</Button>}
    {message&&<p className="panel-note" role="status">{message}</p>}
    <Dialog open={settingsHelp} onOpenChange={setSettingsHelp}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>Allow notifications</DialogTitle><DialogDescription>{ios&&installed?'Open Settings → Notifications → GaadiKhata and turn on Allow Notifications.':'Open this site’s permissions in your browser settings and allow Notifications.'}</DialogDescription></DialogHeader><Button type="button" className="setup-dialog-action" onClick={()=>{setSettingsHelp(false);window.location.reload()}}>Check again</Button></DialogContent></Dialog>
  </section>
}
