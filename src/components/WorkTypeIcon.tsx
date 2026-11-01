import {MorphIcon} from 'morphicons/react'

// Tabler Icons (MIT): https://github.com/tabler/tabler-icons
// Source paths: icons/outline/{truck,backhoe,cash}.svg. See licenses/tabler-icons.txt.
const paths={
  Hyva:'M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5',
  JCB:'M2 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M11 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M13 19l-9 0 M4 15l9 0 M8 12v-5h2a3 3 0 0 1 3 3v5 M5 15v-2a1 1 0 0 1 1 -1h7 M21.12 9.88l-3.12 -4.88l-5 5 M21.12 9.88a3 3 0 0 1 -2.12 5.12a3 3 0 0 1 -2.12 -.88l4.24 -4.24',
  payment:'M7 15h-3a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v3 M7 10a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -8 M12 14a2 2 0 1 0 4 0a2 2 0 0 0 -4 0',
}
export function WorkTypeIcon({type}:{type:'Hyva'|'JCB'|'payment'}) {
  return <MorphIcon icon={paths[type]} size={28} strokeWidth={1.7} reducedMotion="user"/>
}
