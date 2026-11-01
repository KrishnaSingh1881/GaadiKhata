export type LedgerPeriod='all'|'month'|'last-month'
export function ledgerRange(period:LedgerPeriod,today:string) {
  if(period==='all')return {from:'0000-01-01',to:'9999-12-31'}
  if(period==='month')return {from:`${today.slice(0,7)}-01`,to:today}
  const [year,month]=today.split('-').map(Number)
  const end=new Date(Date.UTC(year,month-1,0))
  return {from:`${end.toISOString().slice(0,7)}-01`,to:end.toISOString().slice(0,10)}
}
