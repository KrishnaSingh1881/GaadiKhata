import type {AnyRecord} from './records.ts'

export function driverVehicleType(records:AnyRecord[],driverId:string):'Hyva'|'JCB'|null {
  const work=records.filter(record=>record.kind==='work'&&record.state!=='cancelled'&&record.data.driver_id===driverId).sort((a,b)=>Number(b.state==='in_progress')-Number(a.state==='in_progress')||('business_date'in b.data?b.data.business_date:'').localeCompare('business_date'in a.data?a.data.business_date:'')||b.updated_at.localeCompare(a.updated_at))[0]
  if(work?.kind==='work')return work.data.work_type
  const vehicle=records.filter(record=>record.kind==='vehicle'&&record.state==='active'&&record.data.driver_id===driverId).sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0]
  if(vehicle?.kind==='vehicle')return vehicle.data.vehicle_type
  const payment=records.filter(record=>record.kind==='driver_payment'&&record.state!=='cancelled'&&record.data.driver_id===driverId).sort((a,b)=>('business_date'in b.data?b.data.business_date:'').localeCompare('business_date'in a.data?a.data.business_date:''))[0]
  const paidVehicle=payment?.kind==='driver_payment'?records.find(record=>record.id===payment.data.vehicle_id):undefined
  return paidVehicle?.kind==='vehicle'?paidVehicle.data.vehicle_type:null
}
