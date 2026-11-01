import {useEffect,useState} from 'react'
import {Button} from '../components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../components/ui/dialog'

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
export function InstallApp({compact=false}:{compact?:boolean}) {
  const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[help,setHelp]=useState(false)
  const [error,setError]=useState('')
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
  const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone)
  useEffect(()=>{
    const offer=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)}
    const done=()=>{setInstalled(true);setPrompt(null)}
    window.addEventListener('beforeinstallprompt',offer);window.addEventListener('appinstalled',done)
    return()=>{window.removeEventListener('beforeinstallprompt',offer);window.removeEventListener('appinstalled',done)}
  },[])
  async function install(){
    setError('')
    if(!prompt){setHelp(true);return}
    try {await prompt.prompt();await prompt.userChoice;setPrompt(null)}catch {setError('Could not open installation. Try again.');setPrompt(null)}
  }
  const action=<><Button type="button" variant="outline" disabled={installed} onClick={()=>void install()}>{installed?'App installed':'Install app'}</Button>{error&&<p className="panel-note" role="status">{error}</p>}<Dialog open={help} onOpenChange={setHelp}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>Install GaadiKhata</DialogTitle><DialogDescription>{ios?'In Safari, tap Share → Add to Home Screen, then Add.':'Open your browser menu and choose Install app or Add to Home screen, if available.'}</DialogDescription></DialogHeader><Button type="button" className="setup-dialog-action" onClick={()=>setHelp(false)}>Got it</Button></DialogContent></Dialog></>
  return compact?action:<section className="record-card install-card"><h2>Install app</h2><p>Keep GaadiKhata on your Home Screen.</p>{action}</section>
}
