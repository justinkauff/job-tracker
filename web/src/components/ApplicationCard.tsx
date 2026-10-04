import { formatDate } from '../format'
import { OUTREACH_LABELS, type Application, type Contact } from '../types'

// Props: the inputs a parent passes in, like constructor arguments.
// A component never changes its props; it only displays them.
interface ApplicationCardProps {
  application: Application
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const { company, role, location, date_applied, url } = application

  return (
    <article className="card">
      <div className="card-company">{company}</div>
      {role && <div className="card-role">{role}</div>}

      <div className="card-meta">
        {date_applied && <span>Applied {formatDate(date_applied)}</span>}
        {location && <span>{location}</span>}
        {url && (
          // rel="noreferrer" stops the opened page from seeing or controlling this tab
          // stopPropagation: following the link shouldn't also open the edit dialog
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            Posting ↗
          </a>
        )}
      </div>

      <ContactLine contacts={application.contacts} />
    </article>
  )
}

// "Need to find contact" from the old spreadsheet, now computed instead of typed by hand:
// it shows whenever an application has no contacts
function ContactLine({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return <div className="card-contact card-contact-missing">⚠ No contact yet</div>
  }

  const others = contacts.length - 1
  const more = others > 0 && <span className="card-contact-more"> +{others} more</span>

  // A referral is the most useful thing to see at a glance, so it wins over the first contact
  const referrer = contacts.find((c) => c.referral_status === 'referred')
  if (referrer) {
    return (
      <div className="card-contact">
        <span className="card-contact-referred">✓ Referred</span> by {referrer.name}
        {more}
      </div>
    )
  }

  const [first] = contacts
  // Join only the parts that exist, e.g. "Pat Recruiter · Recruiter · Reached out"
  const details = [first.name, first.title, OUTREACH_LABELS[first.outreach_status]]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="card-contact">
      Contact: {details}
      {more}
    </div>
  )
}
