import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import SuccessBanner from '../SuccessBanner/SuccessBanner'
import { MANAGERS } from '../../config/managers'
import { submitSkipEvent, checkDuplicateLocally } from '../../services/appsScriptService'
import './SkipForm.css'

const locales = ['EN_US', 'ES_US', 'ES_MX', 'ES_ES', 'PT_BR']

const SKIP_REASONS = [
  'Conventions are missing',
  'Conventions are unclear',
  'Sensitive content',
  'Task data (image or audio or prompt or response etc) does not load',
  'Task data (image or audio or prompt or response etc) is unclear',
  'Unable to access necessary website',
  'Unable to submit or proceed',
  'Unknown language',
]

const today = format(new Date(), 'yyyy-MM-dd')
const currentTime = format(new Date(), 'HH:mm')

/**
 * SkipForm — Amazon-style card form for reporting a skip event.
 *
 * Submits via the manager's Apps Script Web App (no OAuth required).
 * Duplicate detection runs client-side against in-session entries.
 */
export default function SkipForm({ onSessionEntry }) {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  // Local mirror of submitted entries — used for client-side duplicate detection.
  const [sessionEntries, setSessionEntries] = useState([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      date: today,
      time: currentTime,
    },
  })

  const selectedManagerId = watch('manager')
  const selectedManager = MANAGERS.find((m) => m.id === selectedManagerId)

  // Reset DA username whenever the manager changes.
  useEffect(() => {
    setValue('username', '')
  }, [selectedManagerId, setValue])

  // Auto-hide the success banner after 4 seconds.
  useEffect(() => {
    if (!submitted) return
    const timer = setTimeout(() => setSubmitted(false), 4000)
    return () => clearTimeout(timer)
  }, [submitted])

  async function onSubmit(data) {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Duplicate check (client-side, within the current session).
      const isDuplicate = checkDuplicateLocally(
        sessionEntries,
        data.date,
        data.time,
        data.username.trim(),
      )
      if (isDuplicate) {
        setSubmitError(
          'A skip event for this username at this exact time has already been recorded this session. Adjust the time if this is a new skip.',
        )
        return
      }

      // Submit to the manager's Apps Script Web App.
      const manager = MANAGERS.find((m) => m.id === data.manager)
      await submitSkipEvent(manager.scriptUrl, {
        date: data.date,
        time: data.time,
        managerName: manager.displayName,
        username: data.username.trim(),
        utterances: Number(data.utterances),
        skips: 1,
        reason: data.reason || '',
      })

      // Record locally for duplicate detection and session summary.
      const entry = {
        date: data.date,
        time: data.time,
        username: data.username.trim(),
        utterances: Number(data.utterances),
        skips: 1,
        reason: data.reason || '',
      }
      setSessionEntries((prev) => [entry, ...prev])
      onSessionEntry(entry)

      reset({
        manager: data.manager,
        username: data.username,
        local: data.local,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        utterances: '',
        reason: '',
      })
      setSubmitted(true)
    } catch (error) {
      setSubmitError(
        `Failed to record skip. Please check your connection and try again. (${error.message})`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="skip-form-card">
      {submitted && <SuccessBanner />}
      <h2 className="skip-form-card__heading">Report a Skip Event</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* ── Team Manager ── */}
        <div className="skip-form__field">
          <label className="skip-form__label" htmlFor="manager">
            Team Manager
          </label>
          <select
            id="manager"
            className={`skip-form__select${errors.manager ? ' skip-form__select--error' : ''}`}
            {...register('manager', { required: 'Please select your manager.' })}
          >
            <option value="" disabled>Select your manager...</option>
            {MANAGERS.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
          {errors.manager && (
            <span className="skip-form__error">{errors.manager.message}</span>
          )}
        </div>

        {/* ── DA login username (conditional on manager) ── */}
        <div className="skip-form__field">
          <label className="skip-form__label" htmlFor="username">
            Your login username
          </label>
          <select
            id="username"
            className={`skip-form__select${errors.username ? ' skip-form__select--error' : ''}`}
            disabled={!selectedManager}
            {...register('username', { required: 'Please select your username.' })}
          >
            <option value="">
              {selectedManager ? 'Select your username...' : 'Select a manager first...'}
            </option>
            {(selectedManager?.das ?? []).map((da) => (
              <option key={da} value={da}>{da}</option>
            ))}
          </select>
          {errors.username && (
            <span className="skip-form__error">{errors.username.message}</span>
          )}
        </div>

        {/* ── local ── */}
        <div className="skip-form__field">
          <label className="skip-form__label" htmlFor="local">
            Local
          </label>
          <select
            id="local"
            className={`skip-form__select${errors.local ? ' skip-form__select--error' : ''}`}
            {...register('local', { required: 'Please select your local.' })}
          >
            <option value="" disabled>Select your local...</option>
            {locales.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {errors.local && (
            <span className="skip-form__error">{errors.local.message}</span>
          )}
        </div>

        {/* ── Date + Time (side by side) ── */}
        <div className="skip-form__row">
          <div className="skip-form__field">
            <label className="skip-form__label" htmlFor="date">
              Date of skip
            </label>
            <input
              id="date"
              type="date"
              className={`skip-form__input${errors.date ? ' skip-form__input--error' : ''}`}
              {...register('date', { required: 'Date is required.' })}
            />
            {errors.date && (
              <span className="skip-form__error">{errors.date.message}</span>
            )}
          </div>

          <div className="skip-form__field">
            <label className="skip-form__label" htmlFor="time">
              Time of skip
            </label>
            <input
              id="time"
              type="time"
              className={`skip-form__input${errors.time ? ' skip-form__input--error' : ''}`}
              {...register('time', { required: 'Time is required.' })}
            />
            {errors.time && (
              <span className="skip-form__error">{errors.time.message}</span>
            )}
          </div>
        </div>

        {/* ── Utterances ── */}
        <div className="skip-form__field">
          <label className="skip-form__label" htmlFor="utterances">
            Number of utterances
          </label>
          <input
            id="utterances"
            type="number"
            min={1}
            max={500}
            placeholder="How many audios were in the task?"
            className={`skip-form__input${errors.utterances ? ' skip-form__input--error' : ''}`}
            {...register('utterances', {
              required: 'Utterance count is required.',
              min: { value: 1, message: 'Must be at least 1.' },
              max: { value: 500, message: 'Cannot exceed 500.' },
              valueAsNumber: true,
            })}
          />
          {errors.utterances && (
            <span className="skip-form__error">{errors.utterances.message}</span>
          )}
        </div>

        {/* ── Reason (optional) ── */}
        <div className="skip-form__field">
          <label className="skip-form__label" htmlFor="reason">
            Reason (optional)
          </label>
          <select
            id="reason"
            className="skip-form__select"
            {...register('reason')}
          >
            <option value="">Select a reason (optional)</option>
            {SKIP_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* ── Submit ── */}
        <button type="submit" className="skip-form__submit" disabled={isSubmitting}>
          {isSubmitting
            ? <span className="skip-form__spinner" aria-hidden="true" />
            : 'Submit Skip Report'
          }
        </button>
        {submitError && (
          <p className="skip-form__submit-error">{submitError}</p>
        )}

      </form>
    </div>
  )
}
