import {useId,useState} from 'react'
import {Input} from './ui/input'
import {Button} from './ui/button'
import {normalName} from '../domain/custom-fields'

export function ClientPicker({value,options,onChange,onNew,required,entity='client'}:{value:string;options:{value:string;label:string}[];onChange:(id:string)=>void;onNew:(name:string)=>void;required?:boolean;entity?:'client'|'site'|'driver'}) {
  const id=useId(),[query,setQuery]=useState(''),[focused,setFocused]=useState(false)
  const selected=options.find(option=>option.value===value)
  const matches=options.filter(option=>normalName(option.label).includes(normalName(query))).slice(0,8)
  const exact=options.find(option=>normalName(option.label)===normalName(query))
  return <div className="client-picker" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false)}}>
    <Input aria-label={entity==='client'?'Client name':entity==='driver'?'Driver name':'Work site'} aria-expanded={focused} aria-controls={id} role="combobox" autoComplete="off" placeholder={`Type a ${entity} name`} value={focused?query:selected?.label??value.replace(/^new:/,'')} required={required} onFocus={()=>{setQuery(selected?.label??value.replace(/^new:/,''));setFocused(true)}} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();event.currentTarget.parentElement?.querySelector('button')?.focus()}if(event.key==='Escape')setFocused(false);if(event.key==='Enter'){event.preventDefault();if(exact){onChange(exact.value);setFocused(false)}else if(query.trim()){onNew(query.trim());setFocused(false)}}}} onChange={event=>{const name=event.target.value;setQuery(name);const match=options.find(option=>normalName(option.label)===normalName(name));if(match)onChange(match.value);else if(name.trim())onNew(name.trim());else onChange('')}}/>
    {focused&&<div id={id} className="client-suggestions" role="listbox" aria-label={`Matching ${entity}s`} onMouseDown={event=>event.preventDefault()}>
      {matches.map(option=><Button key={option.value} type="button" variant="ghost" role="option" aria-selected={option.value===value} onClick={()=>{onChange(option.value);setQuery(option.label);setFocused(false)}}>{option.label}</Button>)}
      {query.trim()&&!exact&&<Button type="button" variant="ghost" onClick={()=>{onNew(query.trim());setFocused(false)}}>Use “{query.trim()}” as a new {entity}</Button>}
      {!matches.length&&!query.trim()&&<p>Type a name to find or add a {entity}.</p>}
    </div>}
    {value.startsWith('new:')&&<small className="field-hint">This {entity} will be saved with your entry.</small>}
  </div>
}
