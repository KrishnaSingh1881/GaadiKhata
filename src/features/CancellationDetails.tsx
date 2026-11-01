import {useWorkspace} from '../data/WorkspaceProvider'
import {useWorkspaceRows} from '../data/useWorkspaceRows'
import {latestCancellation} from '../domain/provenance'
import {CancelledNotice} from '../components/CancelledNotice'
import type {AuditEvent,Membership} from '../domain/records'

export function CancellationDetails({recordId}:{recordId:string}) {
  const history=useWorkspaceRows<AuditEvent>('audit_events',recordId)
  const {rows:members}=useWorkspaceRows<Membership>('app_members')
  const {member}=useWorkspace()
  const event=latestCancellation(history.rows)
  const actor=event?(event.actor===member.clerk_subject?member.display_name:members.find(person=>person.clerk_subject===event.actor)?.display_name??event.actor):''
  return <section className="cancellation-details" aria-label="Cancellation details"><CancelledNotice/>{event?<dl><div><dt>Cancelled by</dt><dd>{actor}</dd></div><div><dt>When</dt><dd><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</time></dd></div><div><dt>Reason</dt><dd>{event.reason||'No reason recorded'}</dd></div></dl>:<p>{history.loading?'Loading cancellation details…':'Cancellation details are not available in the loaded history yet.'}</p>}{history.error&&<p role="alert">{history.error}</p>}</section>
}
