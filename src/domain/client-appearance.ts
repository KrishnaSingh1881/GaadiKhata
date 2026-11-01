const icons=['buildings-2-linear','home-2-linear','shop-linear','city-linear'] as const

export function clientAppearance(id:string) {
  let hash=2166136261
  for(const character of id)hash=Math.imul(hash^character.charCodeAt(0),16777619)>>>0
  return {tone:hash&3,icon:icons[(hash>>>8)&3]}
}
