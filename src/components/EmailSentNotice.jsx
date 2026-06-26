import { SuccessCallout, SuccessActions } from './SuccessCallout.jsx'

/** Email-sent inline success — wraps {@link SuccessCallout}. */
export default function EmailSentNotice({ children, className = '', compact = false }) {
  return (
    <SuccessCallout compact={compact} className={className}>
      {children}
    </SuccessCallout>
  )
}

export { SuccessActions as EmailSentActions }
