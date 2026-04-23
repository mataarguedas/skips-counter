import './SuccessBanner.css'

/**
 * SuccessBanner — Amazon-style green confirmation bar.
 *
 * Fades in via CSS animation on mount. Parent controls visibility
 * by conditionally rendering this component.
 */
export default function SuccessBanner() {
  return (
    <div className="success-banner" role="status" aria-live="polite">
      <span className="success-banner__check" aria-hidden="true">✓</span>
      <span>Skip event reported successfully. The form is ready for your next entry.</span>
    </div>
  )
}
