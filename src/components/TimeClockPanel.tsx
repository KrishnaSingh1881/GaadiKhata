import {useMemo,useState} from 'react'
import dayjs from 'dayjs'
import {LocalizationProvider} from '@mui/x-date-pickers/LocalizationProvider'
import {AdapterDayjs} from '@mui/x-date-pickers/AdapterDayjs'
import {TimeClock} from '@mui/x-date-pickers/TimeClock'
import {ThemeProvider,createTheme} from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import {useAppearance} from './AppearanceProvider'
import {Button} from './ui/button'

export default function TimeClockPanel({value,onSave,onCancel}:{value:string;onSave:(value:string)=>void;onCancel:()=>void}) {
  const {preference}=useAppearance()
  const systemDark=useMediaQuery('(prefers-color-scheme: dark)')
  const dark=preference==='dark'||preference==='system'&&systemDark
  const theme=useMemo(()=>createTheme({palette:{mode:dark?'dark':'light',primary:{main:dark?'#9fc7ff':'#245b9f'},background:{paper:dark?'#121212':'#fffdf9'},text:{primary:dark?'#f5efe6':'#242623',secondary:dark?'#aaa6a2':'#62655f'}},typography:{fontFamily:'DM Sans Variable, sans-serif'}}),[dark])
  const [time,setTime]=useState(()=>{
    const fallback=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Asia/Kolkata'}).format(new Date())
    return dayjs(`2000-01-01T${value||fallback}:00`)
  })
  const [view,setView]=useState<'hours'|'minutes'>('hours')
  return <div className="mui-clock-panel"><strong>Work time</strong><p>IST · Choose hours, then minutes</p><div className="mui-clock-readout" aria-live="polite">{time.format('hh:mm A')}</div><div className="mui-clock-views"><Button type="button" variant={view==='hours'?'default':'outline'} aria-pressed={view==='hours'} onClick={()=>setView('hours')}>Hours</Button><Button type="button" variant={view==='minutes'?'default':'outline'} aria-pressed={view==='minutes'} onClick={()=>setView('minutes')}>Minutes</Button></div><ThemeProvider theme={theme}><LocalizationProvider dateAdapter={AdapterDayjs}><TimeClock ampm ampmInClock views={['hours','minutes']} view={view} onViewChange={next=>{if(next==='hours'||next==='minutes')setView(next)}} value={time} onChange={next=>{if(next?.isValid())setTime(next)}} sx={{width:'100%', '& .MuiClock-clock':{backgroundColor:'var(--soft)'},'& .MuiClock-root':{margin:0}}}/></LocalizationProvider></ThemeProvider><div className="mui-clock-actions">{value&&<Button type="button" variant="ghost" onClick={()=>onSave('')}>Clear</Button>}<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="button" onClick={()=>onSave(time.format('HH:mm'))}>Done</Button></div></div>
}
