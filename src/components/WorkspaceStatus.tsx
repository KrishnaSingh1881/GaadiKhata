import {Logo} from './Logo'
import {useRef,type ReactNode} from 'react'
import {useGSAP} from '@gsap/react'
import gsap from 'gsap'
import {Card,CardHeader,CardTitle,CardDescription,CardContent,CardFooter} from './ui/card'
import {Badge} from './ui/badge'
import {Icon} from './Icon'

gsap.registerPlugin(useGSAP)
type Props={mode:'loading'|'approval'|'error';title:string;description:string;children?:ReactNode;actions?:ReactNode}
export function WorkspaceStatus({mode,title,description,children,actions}:Props) {
 const root=useRef<HTMLDivElement>(null)
 useGSAP(()=>{
  const media=gsap.matchMedia()
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   gsap.fromTo('.workspace-status-card',{y:10,opacity:.8},{y:0,opacity:1,duration:.4,ease:'power2.out'})
   if(mode==='loading')gsap.to('.workspace-status-loader',{rotation:360,duration:1.4,repeat:-1,ease:'none'})
   if(mode==='approval')gsap.to('.workspace-status-halo',{scale:1.1,opacity:.3,duration:2,repeat:-1,yoyo:true,ease:'sine.inOut'})
  })
  return()=>media.revert()
 },{scope:root,dependencies:[mode],revertOnUpdate:true})
 return <div ref={root} className="workspace-status-screen" style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:'24px',background:'var(--ground)',color:'var(--ink)'}}><div className="workspace-status-shell"><header className="workspace-status-brand"><Logo variant="full"/></header><Card className="workspace-status-card"><CardHeader className="workspace-status-header"><div className={`workspace-status-visual is-${mode}`} aria-hidden="true"><span className="workspace-status-halo"/>{mode==='loading'?<span className="workspace-status-loader"><Icon name="restart-linear" size={34}/></span>:<Icon name={mode==='approval'?'shield-check-linear':'info-circle-linear'} size={40}/>}</div>{mode==='approval'&&<Badge variant="outline" className="workspace-status-badge">Google sign-in complete</Badge>}<div role={mode==='error'?'alert':'status'} aria-live="polite"><CardTitle><h1>{title}</h1></CardTitle><CardDescription>{description}</CardDescription></div></CardHeader>{children&&<CardContent className="workspace-status-content">{children}</CardContent>}{actions&&<CardFooter className="workspace-status-actions">{actions}</CardFooter>}</Card><p className="workspace-status-footnote">{mode==='approval'?'Only approved accounts can access business records.':'Your saved entries stay on this device.'}</p></div></div>
}
