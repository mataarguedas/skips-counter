import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import SuccessBanner from '../SuccessBanner/SuccessBanner'
import { MANAGERS } from '../../config/managers'
import { useAuth } from '../../context/AuthContext'
import {
  checkDuplicateEntry,
  ensureTabExists,
  ensureHeaderRow,
  formatTabOnFirstUse,
  appendSkipRow,
  upsertTotalsRow,
} from '../../services/sheetsService'
import './SkipForm.css'

const AREAS = ['EN_US', 'ES_US', 'ES_MX', 'ES_ES', 'PT_BR']

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
 * Uses react-hook-form for state and validation. On valid submit the
 * form data is logged to the console; Sheets API wiring comes later.
 */
export default function SkipForm({ onSessionEntry }) {
  const { accessToken, logout } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

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

  // Auto-hide the banner after 4 seconds
  useEffect(() => {
    if (!submitted) return
    const timer = setTimeout(() => setSubmitted(false), 4000)
    return () => clearTimeout(timer)
  }, [submitted])

  async function onSubmit(data) {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const manager = MANAGERS.find((m) => m.id === data.manager)
      const tabName = data.username.trim()
      const { spreadsheetId } = manager

      const isDuplicate = await checkDuplicateEntry(
        accessToken, spreadsheetId, tabName,
        data.date, data.time, data.username.trim(),
      )
      if (isDuplicate) {
        setSubmitError(
          'A skip event for this username at this exact time has already been recorded. If this is a new skip, adjust the time and resubmit.'
        )
        return
      }

      await ensureTabExists(accessToken, spreadsheetId, tabName)
      const wasNew = await ensureHeaderRow(accessToken, spreadsheetId, tabName)
      if (wasNew) {
        await formatTabOnFirstUse(accessToken, spreadsheetId, tabName)
      }
      await appendSkipRow(accessToken, spreadsheetId, tabName, {
        date: data.date,
        time: data.time,
        managerName: manager.displayName,
        username: data.username.trim(),
        area: data.area,
        utterances: Number(data.utterances),
        skips: 1,
        reason: data.reason || '',
      })
      await upsertTotalsRow(accessToken, spreadsheetId, tabName, data.date)

      onSessionEntry({
        time: data.time,
        utterances: Number(data.utterances),
        skips: 1,
        reason: data.reason || '',
      })

      reset({
        manager: data.manager,
        username: data.username,
        area: data.area,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        utterances: '',
        reason: '',
      })
      setSubmitted(true)
    } catch (error) {
      if (error.message.includes('401')) {
        logout()
        setSubmitError('Your session has expired. Please sign in again to continue.')
      } else {
        setSubmitError(
          `Failed to record skip. Please check your connection and try again. (${error.message})`
        )
      }
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

        {/* ── Area ── */}
        <div className="skip-form__field">
          <label className="skip-form__label" htmlFor="area">
            Area
          </label>
          <select
            id="area"
            className={`skip-form__select${errors.area ? ' skip-form__select--error' : ''}`}
            {...register('area', { required: 'Please select your area.' })}
          >
            <option value="" disabled>Select your area...</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {errors.area && (
            <span className="skip-form__error">{errors.area.message}</span>
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
