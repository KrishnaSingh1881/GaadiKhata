import {test} from 'node:test'
import assert from 'node:assert/strict'
import {driverVehicleType} from './driver-vehicle.ts'
import type {AnyRecord} from './records.ts'

test('driver colour follows current work, ignores cancellations and falls back to assignment',()=>{
  const vehicle={id:'v',kind:'vehicle',state:'active',data:{driver_id:'d',vehicle_type:'Hyva'},updated_at:'2026-10-01'} as AnyRecord
  const work={id:'w',kind:'work',state:'completed',data:{driver_id:'d',work_type:'JCB',business_date:'2026-11-01'},updated_at:'2026-11-01'} as AnyRecord
  assert.equal(driverVehicleType([vehicle],'d'),'Hyva')
  assert.equal(driverVehicleType([vehicle,work],'d'),'JCB')
  assert.equal(driverVehicleType([vehicle,{...work,state:'cancelled'}],'d'),'Hyva')
  const ongoing={...work,id:'ongoing',state:'in_progress',data:{...work.data,work_type:'Hyva',business_date:'2026-10-31'}} as AnyRecord
  assert.equal(driverVehicleType([vehicle,work,ongoing],'d'),'Hyva')
  assert.equal(driverVehicleType([vehicle,work],'unknown'),null)
})
