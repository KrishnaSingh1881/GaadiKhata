import {DayPicker, type ClassNames} from 'react-day-picker'
import {cn} from '@/lib/utils'

type CalendarProps = {
  className?:string
  classNames?:Partial<ClassNames>
  selected?:Date
  onSelect?:(date:Date|undefined)=>void
  defaultMonth?:Date
  autoFocus?:boolean
}

export function Calendar({className,classNames,...props}:CalendarProps) {
  return <DayPicker mode="single" className={cn('calendar',className)} classNames={{
    root:'calendar-root',months:'calendar-months',month:'calendar-month',month_caption:'calendar-caption',caption_label:'calendar-caption-label',nav:'calendar-nav',button_previous:'calendar-nav-button',button_next:'calendar-nav-button',month_grid:'calendar-grid',weekdays:'calendar-weekdays',weekday:'calendar-weekday',weeks:'calendar-weeks',week:'calendar-week',day:'calendar-day-cell',day_button:'calendar-day-button',today:'calendar-today',selected:'calendar-selected',outside:'calendar-outside',disabled:'calendar-disabled',hidden:'calendar-hidden',...classNames,
  }} {...props}/>
}
