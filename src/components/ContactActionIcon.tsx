import {MorphIcon} from 'morphicons/react'

// Tabler Icons (MIT); official outline phone, file-type-pdf and pencil. See licenses/tabler-icons.txt.
const paths={"phone":"M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2","pdf":"M14 3v4a1 1 0 0 0 1 1h4 M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4 M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6 M17 18h2 M20 15h-3v6 M11 15v6h1a2 2 0 0 0 2 -2v-2a2 2 0 0 0 -2 -2h-1","edit":"M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4 M13.5 6.5l4 4","alert":"M12 3L2.5 20h19L12 3z M12 9v5 M12 17.5v.5"}
export function ContactActionIcon({type}:{type:'phone'|'pdf'|'edit'|'alert'}) {
  return <MorphIcon icon={paths[type]} size={24} strokeWidth={1.7} reducedMotion="user"/>
}
