import 'fake-indexeddb/auto'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {WorkspaceDatabase} from './database.ts'
import {newOperation,type Membership} from '../domain/records.ts'

test('effect cleanup during opening allows the same account database to reopen without losing drafts',async()=>{
  const db=new WorkspaceDatabase(crypto.randomUUID())
  const opening=db.open().catch(()=>{})
  db.close({disableAutoOpen:false})
  await opening
  await db.open()
  await db.drafts.put({key:'entry',data:{notes:'Keep this draft'},updated_at:Date.now()})
  db.close({disableAutoOpen:false})
  assert.equal((await db.drafts.get('entry'))?.data.notes,'Keep this draft')
  await db.delete()
})

test('server reset removes old records, drafts and queue entries once, retaining users and new work',async()=>{
  const db=new WorkspaceDatabase(crypto.randomUUID()),reset='2026-10-31T09:23:55.744Z'
  const old=newOperation('client',{name:'Demo client'},'active');old.client_time='2026-10-28T10:00:00Z'
  const fresh=newOperation('client',{name:'Fresh client'},'active');fresh.client_time='2026-10-31T10:00:00Z'
  await db.queue(old);await db.queue(fresh)
  await db.storeRecords([{id:old.record_id,kind:'client',data:{name:'Demo client',phone:''},state:'active',version:1,created_by:'user',updated_by:'user',created_at:old.client_time,updated_at:old.client_time,change_seq:400}],400)
  await db.drafts.bulkPut([{key:'old',data:{name:'Demo'},updated_at:Date.parse(old.client_time)},{key:'new',data:{name:'New'},updated_at:Date.parse(fresh.client_time)}])
  await db.metadata.put({key:'rows:audit_events:all',value:[{action:'demo'}]})
  const member:Membership={clerk_subject:'user',display_name:'User',active:true,role:'technical_admin',workspace_reset_at:reset}
  await db.storeMembership(member)
  assert.equal(await db.records.count(),0)
  assert.equal(await db.outbox.get(old.id),undefined)
  assert.equal((await db.outbox.get(fresh.id))?.status,'queued')
  assert.equal(await db.drafts.get('old'),undefined)
  assert.ok(await db.drafts.get('new'))
  assert.equal(await db.metadata.get('rows:audit_events:all'),undefined)
  assert.equal((await db.metadata.get('membership'))?.value&&((await db.metadata.get('membership'))!.value as Membership).role,'technical_admin')
  assert.equal((await db.metadata.get('cursor'))?.value,0)
  await db.metadata.put({key:'cursor',value:900})
  await db.storeMembership(member)
  assert.equal((await db.metadata.get('cursor'))?.value,900)
  await db.delete()
})

test('permanent deletion purges local records and edits, and late responses cannot restore them',async()=>{
  const db=new WorkspaceDatabase(crypto.randomUUID())
  const op=newOperation('client',{name:'Trial client'},'active')
  const record={id:op.record_id,kind:'client',data:op.data,state:'active',version:1,created_by:'admin',updated_by:'admin',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),change_seq:1} as import('../domain/records.ts').AnyRecord
  await db.storeRecords([record],1)
  await db.queue({...op,action:'update',expected_version:1})
  await db.metadata.put({key:'rows:audit_events:all',value:[{record_id:record.id}]})
  await db.drafts.put({key:`entry:client:${record.id}`,data:{name:'Old draft'},updated_at:Date.now()})
  await db.storeRecords([],2,[record.id])
  assert.equal(await db.records.count(),0)
  assert.equal(await db.outbox.count(),0)
  assert.equal(await db.drafts.count(),0)
  assert.equal(await db.metadata.get('rows:audit_events:all'),undefined)
  await db.storeRecords([record],1)
  assert.equal(await db.records.count(),0)
  assert.equal((await db.metadata.get('cursor'))?.value,2)
  await db.delete()
})
