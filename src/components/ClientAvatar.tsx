import {clientAppearance} from '../domain/client-appearance'
import {Icon} from './Icon'

export function ClientAvatar({id}:{id:string}) {
  const {tone,icon}=clientAppearance(id)
  return <span className="client-symbol" data-tone={tone} aria-hidden="true"><Icon name={icon} size={24}/></span>
}
