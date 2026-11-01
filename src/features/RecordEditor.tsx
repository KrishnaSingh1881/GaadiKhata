import {EditableFieldLabel} from '../components/EditableFieldLabel'
import {useWorkspaceRows} from '../data/useWorkspaceRows'
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '../components/ui/accordion'
import {FormSelect} from '../components/FormSelect'
import {Fragment,useEffect,useState,type FormEvent} from 'react'
import {DatePicker} from '../components/DatePicker'
import {TimePicker} from '../components/TimePicker'
import {ZodError} from 'zod'
import {useWorkspace} from '../data/WorkspaceProvider'
import {businessDate,parseMoney} from '../domain/money'
import {formatMoney} from '../domain/money'
import {fuelCost} from '../domain/fuel'
import {vehicleLabel} from '../domain/vehicle-label'
import {changedFields} from '../domain/local-records'
import {learnedFields,normalName,parseCustomFields,type CustomField} from '../domain/custom-fields'
import {ClientPicker} from '../components/ClientPicker'
import {RecordProvenance} from './RecordProvenance'
import {useFavourites} from '../data/useFavourites'
import {validateRecord,type AnyRecord,type RecordKind,type RecordState} from '../domain/records'
import {Button} from '../components/ui/button'
import {MaterialSelect} from '../components/MaterialSelect'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../components/ui/dialog'

export const kindLabels:Record<RecordKind,string>={vehicle:'Vehicle',client:'Client',driver:'Driver',partner:'Partner',material:'Material',route:'Route',site:'Work site',expense_category:'Expense category',field_template:'Expense fields',work:'Work',expense:'Expense',payment:'Client payment',driver_payment:'Driver payment',partner_entry:'Partner entry',expense_settlement:'Credit settlement'}
export function recordName(record:AnyRecord|undefined) {return !record?'Not selected':record.kind==='vehicle'?vehicleLabel(record.data,false):'name'in record.data?record.data.name:record.kind==='work'?record.data.description||`${record.data.work_type} work`:kindLabels[record.kind]}
type Field={key:string;label:string;type?:string;options?:{value:string;label:string}[];required?:boolean;reference?:RecordKind}
type Props={kind:RecordKind;record?:AnyRecord;initialData?:Record<string,unknown>;vehicleScope?:'Hyva'|'JCB';onClose:()=>void;onSaved?:(id:string)=>void}
const masters=['vehicle','client','driver','partner','material','route','site','expense_category']
function localTime(value:string) {const date=new Date(value);return Number.isNaN(date.getTime())?'':new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function stringValues(data:Record<string,unknown>={}) {return Object.fromEntries(Object.entries(data).map(([key,value])=>[key,value==null?'':key==='amount_paise'?String(Number(value)/100):key.endsWith('_at')?localTime(String(value)):String(value)]))}

export function RecordEditor({kind,record,initialData,vehicleScope,onClose,onSaved}:Props) {
  const labels=useWorkspaceRows<{id:string;label:string}>('form_labels')
  const {records,choices,db,create,change,sync}=useWorkspace()
  const {favourites}=useFavourites()
  const initial=record?{...record.data,...initialData}:initialData
  const [baseRecord,setBaseRecord]=useState(record)
  const [values,setValues]=useState<Record<string,string>>(()=>({business_date:businessDate(),...stringValues(initial)}))
  const [workType,setWorkType]=useState<'Hyva'|'JCB'>(vehicleScope??(initial&&'work_type'in initial&&initial.work_type==='JCB'?'JCB':'Hyva'))
  const [state,setState]=useState<RecordState>(kind==='work'&&record?.state!=='cancelled'?'completed':record?.state??'active')
  const [error,setError]=useState('');const [saving,setSaving]=useState(false);const [ready,setReady]=useState(false)
  const [recovered,setRecovered]=useState(false)
  const [additionalOpen,setAdditionalOpen]=useState('')
  const [quickAdd,setQuickAdd]=useState<{kind:RecordKind;field:string}|null>(null)
  const [extraFields,setExtraFields]=useState<CustomField[]>(()=>Object.entries(record?.data.extras??{}).map(([label,value])=>({label,value:String(value??''),type:typeof value==='number'?'number':typeof value==='boolean'?'boolean':'text'})))
  const [categoryBusy,setCategoryBusy]=useState(false)
  const category=choices.find(row=>row.id===values.category_id)
  const isFuel=kind==='expense'&&category?.kind==='expense_category'&&normalName(category.data.name)==='fuel'
  const additionalCount=extraFields.filter(field=>!(kind==='work'&&field.label==='Work time')&&!(isFuel&&['Litres','Price per litre'].includes(field.label))).length
  const context=kind==='expense'?values.category_id??'':kind==='work'?workType:kind==='vehicle'?values.vehicle_type??'':''
  const suggestions=learnedFields(records,kind,context)
  const fuelEstimate=fuelCost(extraFields.find(field=>field.label==='Litres')?.value??'',extraFields.find(field=>field.label==='Price per litre')?.value??'')
  function extra(label:string,value:string,type:CustomField['type']='number') {
    const existing=extraFields.findIndex(field=>normalName(field.label)===normalName(label))
    remember(values,workType,state,existing<0?[...extraFields,{label,value,type}]:extraFields.map((field,index)=>index===existing?{...field,value,type}:field))
  }
  async function chooseCategory(name:string) {
    if(categoryBusy)return
    setCategoryBusy(true);setError('')
    try {
      const found=choices.find(row=>row.kind==='expense_category'&&row.state==='active'&&normalName(row.data.name)===normalName(name))
      const id=found?.id??await create('expense_category',{name},'active')
      choose('category_id',id)
    }catch(error){setError(error instanceof Error?error.message:'Could not choose this category.')}finally{setCategoryBusy(false)}
  }
  const draftKey=`entry:${kind}:${record?.id??(initialData?'repeat':'new')}${vehicleScope?`:${vehicleScope}`:''}`
  useEffect(()=>{
    let active=true
    void db.drafts.get(draftKey).then(draft=>{
      if(!active)return
      const saved=draft?.data
      if(saved&&typeof saved.values==='object'&&saved.values){setValues(saved.values as Record<string,string>);if(!vehicleScope&&(saved.workType==='Hyva'||saved.workType==='JCB'))setWorkType(saved.workType);if(['active','in_progress','completed'].includes(String(saved.state)))setState(kind==='work'?'completed':saved.state as RecordState);if(Array.isArray(saved.extraFields))setExtraFields(saved.extraFields.map(field=>({...field,type:field.type??'text'})));setRecovered(true)}
      if(record&&saved?.baseRecord&&typeof saved.baseRecord==='object') {
        const base=saved.baseRecord as AnyRecord
        if(base.id===record.id&&base.kind===record.kind&&Number.isInteger(base.version)&&base.version>0)setBaseRecord(base)
      }
      setReady(true)
    }).catch(()=>{if(active){setReady(true);setError('Draft storage is unavailable. Keep this form open until saved.')}})
    return()=>{active=false}
  },[db,draftKey])
  function remember(nextValues=values,nextType=workType,nextState=state,nextExtras=extraFields) {
    setValues(nextValues);setWorkType(nextType);setState(nextState);setExtraFields(nextExtras)
    void db.drafts.put({key:draftKey,data:{values:nextValues,workType:nextType,state:nextState,extraFields:nextExtras,baseRecord},updated_at:Date.now()}).catch(()=>setError('Could not recover this draft later. Keep the form open until saved.'))
  }
  const options=(type:RecordKind)=>choices.filter(r=>r.kind===type&&r.state==='active'&&(!vehicleScope||r.kind!=='vehicle'||r.data.vehicle_type===vehicleScope)&&(!vehicleScope||kind!=='payment'||r.kind!=='client'||records.some(work=>work.kind==='work'&&work.state!=='cancelled'&&work.data.work_type===vehicleScope&&work.data.client_id===r.id))).sort((a,b)=>Number(favourites.has(b.id))-Number(favourites.has(a.id))||b.updated_at.localeCompare(a.updated_at)).map(r=>({value:r.id,label:(favourites.has(r.id)?'★ ':'')+recordName(r)+(r.kind==='vehicle'?` · ${r.data.registration}`:'')+(r.version===0?' · on this device':'')}))
  const reference=(key:string,label:string,type:RecordKind,required=true):Field=>({key,label,options:options(type),required,reference:type})
  const fields:Field[]=[];const moneyKinds=['expense','payment','driver_payment','partner_entry','expense_settlement']
  if(masters.includes(kind)&&kind!=='vehicle')fields.push({key:'name',label:'Name',required:true})
  if(kind==='vehicle')fields.push({key:'registration',label:'Registration number',required:true},{key:'vehicle_type',label:'Vehicle type',options:['Hyva','JCB'].map(value=>({value,label:value})),required:true},reference('driver_id','Assigned driver','driver',false))
  if(kind==='client'||kind==='driver')fields.push({key:'phone',label:'Phone number',type:'tel'})
  if(kind==='route')fields.push({key:'pickup',label:'Pickup',required:true},{key:'destination',label:'Destination',required:true})
  if(kind==='site')fields.push(reference('client_id','Client','client',false))
  if(kind==='work'||moneyKinds.includes(kind))fields.push({key:'business_date',label:'Date',type:'date',required:true})
  if(['work','expense','driver_payment'].includes(kind))fields.push({...reference('vehicle_id',kind==='work'&&workType==='JCB'?'Machine':'Vehicle','vehicle'),options:options('vehicle').filter(o=>kind!=='work'||choices.some(r=>r.id===o.value&&r.kind==='vehicle'&&r.data.vehicle_type===workType))})
  if(kind==='work'||kind==='payment')fields.push(reference('client_id','Client','client'))
  if(kind==='work') {
    fields.push(reference('driver_id',workType==='Hyva'?'Driver':'Operator','driver',false))
    if(workType==='Hyva')fields.push(reference('material_id','Material carried','material'))
    else fields.push(reference('site_id','Work site','site'),{key:'description',label:'Work description'})
    fields.push({key:'quantity',label:workType==='Hyva'?'Quantity':'Hours worked',type:'number',required:state==='completed'})
    if(workType==='Hyva')fields.push({key:'unit',label:'Unit',options:['trip','brass','ton'].map(value=>({value,label:value})),required:true})
  }
  if(kind==='expense')fields.push(reference('category_id','Expense category','expense_category'),{key:'counterparty',label:'Paid to'})
  if(kind==='driver_payment')fields.push(reference('driver_id','Driver','driver'))
  if(kind==='partner_entry')fields.push(reference('partner_id','Partner','partner'),{key:'entry_type',label:'Entry type',options:['Contribution','Withdrawal','Reimbursement','Profit distribution'].map(value=>({value,label:value})),required:true})
  if(kind==='expense_settlement')fields.push({...reference('expense_id','Credit expense','expense'),options:options('expense').filter(o=>choices.some(r=>r.id===o.value&&r.kind==='expense'&&r.data.payment_mode==='Credit'))})
  if(kind==='work'||moneyKinds.includes(kind))fields.push({key:'amount_paise',label:kind==='payment'?'Amount received (₹)':kind==='expense'?'Total paid / owed (₹)':'Amount (₹)',type:'amount',required:kind!=='work'||state==='completed'})
  if(moneyKinds.includes(kind))fields.push({key:'payment_mode',label:'Payment method',options:(kind==='expense'?['Cash','UPI','Credit']:kind==='payment'?['Cash','UPI','Cheque']:['Cash','UPI']).map(value=>({value,label:value})),required:true})
  if(kind==='work'||moneyKinds.includes(kind))fields.push({key:'note',label:'Note'})
  function choose(key:string,value:string) {
    const next={...values,[key]:value}
    if(key==='vehicle_id'&&kind==='work') {
      const vehicle=choices.find(r=>r.id===value)
      if(vehicle?.kind==='vehicle'&&!next.driver_id)next.driver_id=vehicle.data.driver_id??''
      const recent=records.filter(r=>r.kind==='work'&&r.data.vehicle_id===value&&r.state!=='cancelled').sort((a,b)=>b.created_at.localeCompare(a.created_at))[0]
      if(recent?.kind==='work')for(const field of ['client_id','material_id','site_id','unit'] as const)if(!next[field]&&recent.data[field])next[field]=String(recent.data[field])
    }
    remember(next,workType,state,extraFields)
  }
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');setSaving(true)
    try {
      const data:Record<string,unknown>=baseRecord?{...baseRecord.data}:{}
      for(const field of fields) {const raw=(values[field.key]??'').trim();data[field.key]=field.type==='amount'?(raw?parseMoney(raw):null):field.type==='number'?(raw?Number(raw):null):field.type==='datetime-local'?(raw?new Date(raw).toISOString():null):field.key.endsWith('_id')?(raw||null):raw}
      if(kind==='vehicle')data.name=values.vehicle_type
      if(vehicleScope&&typeof data.vehicle_id==='string'&&!choices.some(row=>row.id===data.vehicle_id&&row.kind==='vehicle'&&row.data.vehicle_type===vehicleScope))throw new Error(`Choose a ${vehicleScope} vehicle.`)
      if(kind==='driver_payment'){if(!values.payment_type)throw new Error('Choose Salary, Advance, Trip payment or Other.');data.payment_type=values.payment_type}
      const newClient=typeof data.client_id==='string'&&data.client_id.startsWith('new:')?data.client_id.slice(4).trim():''
      if(newClient)data.client_id=crypto.randomUUID()
      const newSite=kind==='work'&&workType==='JCB'&&typeof data.site_id==='string'&&data.site_id.startsWith('new:')?data.site_id.slice(4).trim():''
      if(newSite)data.site_id=crypto.randomUUID()
      const newDriver=typeof data.driver_id==='string'&&data.driver_id.startsWith('new:')?data.driver_id.slice(4).trim():''
      if(newDriver)data.driver_id=crypto.randomUUID()
      let resolvedValues={...values}
      if(kind==='work'){data.work_type=workType;if(workType==='JCB'){data.unit='hours';data.material_id=null;data.route_id=null}else data.site_id=null}
      let parsedExtras:ReturnType<typeof parseCustomFields>
      try {parsedExtras=parseCustomFields(extraFields)}catch(error){setAdditionalOpen('details');throw error}
      if(kind==='work'&&parsedExtras['Work time']&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(parsedExtras['Work time'])))throw new Error('Choose a valid hour and minute for the work time.')
      if(kind==='work'&&parsedExtras['Work time']==='')delete parsedExtras['Work time']
      if(isFuel)for(const key of ['Litres','Price per litre'])if(parsedExtras[key]!==undefined&&parsedExtras[key]!==''&&(!(Number(parsedExtras[key])>0)))throw new Error(`${key} must be greater than zero.`)
      if(Object.keys(parsedExtras).length||kind==='expense'||baseRecord?.data.extras)data.extras=parsedExtras
      let parsed=validateRecord(kind,data,state)
      if(newClient) {
        const existing=choices.find(row=>row.kind==='client'&&row.state==='active'&&normalName(row.data.name)===normalName(newClient))
        const clientId=existing?.id??await create('client',{name:newClient},'active')
        parsed=validateRecord(kind,{...parsed,client_id:clientId},state)
        resolvedValues={...resolvedValues,client_id:clientId}
        remember(resolvedValues,workType,state,extraFields)
      }
      if(newSite) {
        const clientId='client_id'in parsed?parsed.client_id:null
        const existing=choices.find(row=>row.kind==='site'&&row.state==='active'&&normalName(row.data.name)===normalName(newSite)&&(!row.data.client_id||row.data.client_id===clientId))
        const siteId=existing?.id??await create('site',{name:newSite,client_id:clientId},'active')
        parsed=validateRecord(kind,{...parsed,site_id:siteId},state)
        resolvedValues={...resolvedValues,site_id:siteId}
        remember(resolvedValues,workType,state,extraFields)
      }
      if(newDriver) {
        const existing=choices.find(row=>row.kind==='driver'&&row.state==='active'&&normalName(row.data.name)===normalName(newDriver))
        const driverId=existing?.id??await create('driver',{name:newDriver},'active')
        parsed=validateRecord(kind,{...parsed,driver_id:driverId},state)
        resolvedValues={...resolvedValues,driver_id:driverId}
        remember(resolvedValues,workType,state,extraFields)
      }
      let savedId=record?.id??''
      if(baseRecord){const patch=changedFields(baseRecord.data,parsed);if(!Object.keys(patch).length&&baseRecord.state===state){await db.drafts.delete(draftKey);onClose();return}await change(baseRecord,patch,state,'update','',draftKey)}
      else savedId=await create(kind,parsed,state,draftKey)
      onSaved?.(savedId);onClose()
    }catch(e){if(e instanceof ZodError){const issue=e.issues[0];setError(`${fields.find(f=>f.key===issue.path[0])?.label||'Entry'}: ${issue.code==='invalid_format'&&issue.format==='uuid'?'choose a saved item.':issue.message}`)}else setError(e instanceof Error?e.message:'Could not save. Your form is still here.')}finally{setSaving(false)}
  }
  if(!ready)return <p role="status">Recovering your form…</p>
  return <><form className="entry-form" onSubmit={save}>
    <RecordProvenance record={record}/>
    {kind==='expense'&&<div className="expense-presets" role="group" aria-label="Expense type">{['Fuel','Maintenance','Other'].map(name=><Button type="button" variant={category?.kind==='expense_category'&&normalName(category.data.name)===normalName(name)?'default':'outline'} key={name} disabled={categoryBusy} onClick={()=>void chooseCategory(name)}>{name}</Button>)}</div>}
    {kind==='driver_payment'&&<div className="expense-presets" role="group" aria-label="Driver payment type">{['Salary','Advance','Trip payment','Other'].map(type=><Button key={type} type="button" variant={values.payment_type===type?'default':'outline'} aria-pressed={values.payment_type===type} onClick={()=>choose('payment_type',type)}>{type}</Button>)}</div>}
    {recovered&&<p className="field-hint" role="status">Your unfinished entry has been recovered.</p>}
    {kind==='work'&&!vehicleScope&&<div className="segmented" role="group" aria-label="Work type">{(['Hyva','JCB']as const).map(type=><button key={type} type="button" aria-pressed={workType===type} className={workType===type?'selected':''} onClick={()=>remember({...values,vehicle_id:'',driver_id:'',quantity:'',unit:''},type)}>{type==='Hyva'?'Hyva trip':'JCB job'}</button>)}</div>}
    <div className="editor-fields">{fields.map(field=>kind==='work'&&field.key==='business_date'?<div className="entry-date-time" key={field.key}><label><span className="field-label"><EditableFieldLabel fieldId="work.business_date" label={labels.rows.find(item=>item.id==='work.business_date')?.label??'Date'} onSaved={sync}/></span><DatePicker label="Date" required value={values.business_date??''} onChange={value=>choose('business_date',value)}/></label><label><span className="field-label"><EditableFieldLabel fieldId="work.work_time" label={labels.rows.find(item=>item.id==='work.work_time')?.label??'Time'} onSaved={sync}/> <span className="optional">optional</span></span><TimePicker value={extraFields.find(field=>field.label==='Work time')?.value??''} onChange={value=>extra('Work time',value,'text')}/></label></div>:<Fragment key={field.key}><div className={kind==='work'&&workType==='Hyva'&&['quantity','unit'].includes(field.key)?'editor-field editor-field-half':'editor-field'}><label><span className="field-label"><EditableFieldLabel fieldId={`${kind}.${field.key}`} label={labels.rows.find(item=>item.id===`${kind}.${field.key}`)?.label??field.label} onSaved={sync}/>{!field.required&&<span className="optional">optional</span>}</span>{field.type==='date'?<DatePicker label={field.label} value={values[field.key]??''} required={field.required} onChange={value=>choose(field.key,value)}/>:field.key==='client_id'?<ClientPicker value={values.client_id??''} options={options('client').map(option=>({...option,label:String(recordName(choices.find(row=>row.id===option.value)))}))} required={field.required} onChange={value=>choose('client_id',value)} onNew={name=>choose('client_id',`new:${name}`)}/>:field.key==='driver_id'?<ClientPicker entity="driver" value={values.driver_id??''} options={options('driver').map(option=>({...option,label:String(recordName(choices.find(row=>row.id===option.value)))}))} required={field.required} onChange={value=>choose('driver_id',value)} onNew={name=>choose('driver_id',`new:${name}`)}/>:field.key==='site_id'?<ClientPicker entity="site" value={values.site_id??''} options={options('site')} required={field.required} onChange={value=>choose('site_id',value)} onNew={name=>choose('site_id',`new:${name}`)}/>:field.key==='material_id'?<MaterialSelect value={values[field.key]??''} required={field.required} onChange={value=>choose(field.key,value)}/>:field.options?<FormSelect label={field.label} value={values[field.key]??''} required={field.required} onChange={value=>choose(field.key,value)} placeholder={`Choose ${field.label.toLowerCase()}`} options={field.options}/>:<input value={values[field.key]??''} onChange={e=>choose(field.key,e.target.value)} type={field.type==='amount'?'text':field.type||'text'} inputMode={field.type==='amount'?'decimal':undefined} step={field.type==='number'?'any':undefined} min={field.type==='number'?'0.01':undefined} required={field.required} maxLength={2000}/>}</label>{field.reference&&field.reference!=='material'&&field.reference!=='client'&&field.reference!=='site'&&field.reference!=='driver'&&masters.includes(field.reference)&&<button className="inline-add" type="button" onClick={()=>setQuickAdd({kind:field.reference!,field:field.key})}>+ Add {kindLabels[field.reference].toLowerCase()}</button>}</div></Fragment>)}</div>
    {isFuel&&<fieldset className="fuel-fields"><legend>Fuel details</legend><div className="field-row">
      <label>Litres <span className="optional">optional</span><input type="number" step="any" min="0.001" inputMode="decimal" value={extraFields.find(field=>field.label==='Litres')?.value??''} onChange={event=>extra('Litres',event.target.value)}/></label>
      <label>Price per litre (₹) <span className="optional">optional</span><input type="number" step="0.01" min="0.01" inputMode="decimal" value={extraFields.find(field=>field.label==='Price per litre')?.value??''} onChange={event=>extra('Price per litre',event.target.value)}/></label>
    </div><p className="field-hint">Record the price at the pump. Total paid above remains editable.</p>{fuelEstimate!==null&&<Button type="button" variant="outline" onClick={()=>choose('amount_paise',String(fuelEstimate/100))}>Use calculated total {formatMoney(fuelEstimate)}</Button>}</fieldset>}
    {kind!=='material'&&<Accordion type="single" collapsible value={additionalOpen} onValueChange={setAdditionalOpen} className="extra-fields-accordion"><AccordionItem value="details"><AccordionTrigger><span>Additional details</span><span className="extra-fields-count">{additionalCount?`${additionalCount} ${additionalCount===1?'field':'fields'}`:'Optional'}</span></AccordionTrigger><AccordionContent><fieldset className="extra-fields"><legend className="sr-only">Additional details</legend>
      {suggestions.filter(suggestion=>!extraFields.some(field=>normalName(field.label)===normalName(suggestion.label))).length>0&&<div className="adaptive-suggestions"><p>Suggested from similar entries</p>{suggestions.filter(suggestion=>!extraFields.some(field=>normalName(field.label)===normalName(suggestion.label))).map(suggestion=><Button key={suggestion.label} type="button" variant="outline" disabled={extraFields.length>=30} onClick={()=>remember(values,workType,state,[...extraFields,{label:suggestion.label,value:'',type:suggestion.type}])}>+ {suggestion.label}</Button>)}</div>}
      {extraFields.map((field,index)=>(kind==='work'&&field.label==='Work time')||(isFuel&&['Litres','Price per litre'].includes(field.label))?null:<div className="extra-field-row" key={index}>
        <label>Field name<input value={field.label} maxLength={80} onChange={event=>remember(values,workType,state,extraFields.map((item,i)=>i===index?{...item,label:event.target.value}:item))}/></label>
        <label>Value type<FormSelect label="Value type" required value={field.type} onChange={value=>remember(values,workType,state,extraFields.map((item,i)=>i===index?{...item,type:value as CustomField['type'],value:''}:item))} options={[{value:'text',label:'Text'},{value:'number',label:'Number'},{value:'boolean',label:'Yes / no'}]}/></label>
        <label>Value{field.type==='boolean'?<FormSelect label="Value" required value={field.value||'false'} onChange={value=>remember(values,workType,state,extraFields.map((item,i)=>i===index?{...item,value}:item))} options={[{value:'false',label:'No'},{value:'true',label:'Yes'}]}/>:<><input type={field.type==='number'?'number':'text'} step={field.type==='number'?'any':undefined} list={`extra-values-${kind}-${index}`} value={field.value} maxLength={2000} onChange={event=>remember(values,workType,state,extraFields.map((item,i)=>i===index?{...item,value:event.target.value}:item))}/><datalist id={`extra-values-${kind}-${index}`}>{suggestions.find(suggestion=>normalName(suggestion.label)===normalName(field.label))?.values.map(value=><option key={value} value={value}/>)}</datalist></>}</label>
        <Button type="button" variant="outline" aria-label={`Remove extra field ${index+1}`} onClick={()=>remember(values,workType,state,extraFields.filter((_,i)=>i!==index))}>Remove</Button>
      </div>)}
      <Button type="button" variant="outline" disabled={extraFields.length>=30} onClick={()=>remember(values,workType,state,[...extraFields,{label:'',value:'',type:'text'}])}>Add a field</Button>
    </fieldset></AccordionContent></AccordionItem></Accordion>}

    {error&&<p className="form-error" role="alert">{error}</p>}
    <p className="field-hint">Your draft is kept on this device. Review suggested details before saving. Shared totals update after confirmation.</p>
    <div className="form-footer"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Close</Button><Button type="submit" className="primary-button" disabled={saving}>{saving?'Saving locally…':'Save entry'}</Button></div>
  </form><Dialog open={!!quickAdd} onOpenChange={open=>{if(!open)setQuickAdd(null)}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>Add {quickAdd?kindLabels[quickAdd.kind]:''}</DialogTitle><DialogDescription>Save once, then reuse it in your entry.</DialogDescription></DialogHeader>{quickAdd&&<RecordEditor kind={quickAdd.kind} onSaved={id=>choose(quickAdd.field,id)} onClose={()=>setQuickAdd(null)}/>}</DialogContent></Dialog></>
}
