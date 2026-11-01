import {test} from 'node:test'
import assert from 'node:assert/strict'
import {vehicleLabel} from './vehicle-label.ts'
import {buildReport} from './reports.ts'
import type {AnyRecord} from './records.ts'

test('vehicle labels and reports use type and registration, never numbered display names',()=>{
  const data={name:'Hyva 2',vehicle_type:'Hyva',registration:'MH 15 AB 1234'}
  assert.equal(vehicleLabel(data,false),'Hyva')
  assert.equal(vehicleLabel(data),'Hyva · MH 15 AB 1234')
  const vehicle={id:'v',kind:'vehicle',data,state:'active',version:1} as AnyRecord
  const work={id:'w',kind:'work',data:{vehicle_id:'v',client_id:'c',business_date:'2026-11-01',work_type:'Hyva',quantity:1,unit:'trip',amount_paise:10000},state:'completed',version:1,created_at:'2026-11-01T00:00:00Z'} as AnyRecord
  const report=buildReport([vehicle,work],'vehicle','v','2026-11-01','2026-11-30')
  assert.ok(report.title.includes('MH 15 AB 1234'))
  assert.ok(report.rows[0].detail.includes('Hyva · MH 15 AB 1234'))
  assert.ok(!JSON.stringify(report).includes('Hyva 2'))
})
