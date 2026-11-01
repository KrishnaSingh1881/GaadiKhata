import {Badge} from './ui/badge'
import {Icon} from './Icon'

export function CancelledNotice() {
  return <span className="cancelled-notice"><Badge className="cancelled-badge"><Icon name="close-circle-linear" size={16}/>Cancelled</Badge><span>Excluded from totals</span></span>
}
