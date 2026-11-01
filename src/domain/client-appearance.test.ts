import {test} from 'node:test'
import assert from 'node:assert/strict'
import {clientAppearance} from './client-appearance.ts'

test('client avatars stay stable and mix four icons independently with four colours',()=>{
  const samples=Array.from({length:200},(_,index)=>clientAppearance(`client-${index}`))
  assert.deepEqual(clientAppearance('client-42'),clientAppearance('client-42'))
  assert.equal(new Set(samples.map(sample=>sample.icon)).size,4)
  assert.equal(new Set(samples.map(sample=>sample.tone)).size,4)
  assert.equal(new Set(samples.map(sample=>`${sample.icon}:${sample.tone}`)).size,16)
})
