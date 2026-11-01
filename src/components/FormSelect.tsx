import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from './ui/select'

type Props={value:string;onChange:(value:string)=>void;options:{value:string;label:string}[];label:string;placeholder?:string;required?:boolean}

export function FormSelect({value,onChange,options,label,placeholder='Choose an option',required}:Props) {
  return <Select value={value} onValueChange={next=>onChange(next==='__clear'?'':next)} required={required}>
    <SelectTrigger className="material-select-trigger" aria-label={label}><SelectValue placeholder={placeholder}/></SelectTrigger>
    <SelectContent className="material-select-content" position="popper" sideOffset={6}>
      {!required&&<SelectItem value="__clear">None</SelectItem>}
      {options.map(option=><SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      {!options.length&&<SelectItem value="__empty" disabled>No options available</SelectItem>}
    </SelectContent>
  </Select>
}
