'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Award, BadgeCheck, ChevronLeft, ChevronRight, ListFilter, Route, UserRound, UsersRound, X } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSiteContent } from '@/app/site-content-provider'
import { getDefaultCourseCoachKeys } from '@/lib/coach-profiles'
import { formatCourseWeekday } from '@/lib/course-weekday'

function compactCourseName(name: string) {
  return name
    .replace(/^2026\s*/, '')
    .replace(/^好運跑步訓練營\s*X\s*/, '')
    .trim()
}

function getCoachShortName(name: string) {
  const shortName = name
    .replace(/^\s*總教練\s*/, '')
    .replace(/\s*(?:總教練|主教練|教練|助教)\s*$/, '')
    .trim()
  return shortName || name
}

export default function TeamRosterClient() {
  const { coachProfiles, courseOverrides, courses, team, pageMedia } = useSiteContent()

  const assignments = useMemo(() => {
    const byCoach = new Map<string, Array<{ name: string; slug: string }>>()
    courses.forEach((course) => {
      const override = courseOverrides[course.slug]
      const coachKeys = override?.coachKeys?.length
        ? override.coachKeys
        : getDefaultCourseCoachKeys(override?.templateSlug || course.slug)

      coachKeys.forEach((coachKey) => {
        const current = byCoach.get(coachKey) ?? []
        if (!current.some((assignment) => assignment.slug === course.slug)) {
          byCoach.set(coachKey, [...current, { name: formatCourseWeekday(compactCourseName(course.name)), slug: course.slug }])
        }
      })
    })
    return byCoach
  }, [courseOverrides, courses])

  const coaches = useMemo(() => Object.values(coachProfiles).filter((coach) => coach.published), [coachProfiles])
  const coachKeySignature = coaches.map((coach) => coach.coachKey).join('|')
  const [activeCoachKey, setActiveCoachKey] = useState<string | null>(null)
  const [selectedCoachKey, setSelectedCoachKey] = useState<string | null>(null)
  const selectedCoach = coaches.find((coach) => coach.coachKey === selectedCoachKey) ?? null
  const coachRowRef = useRef<HTMLDivElement>(null)
  const coachCardRefs = useRef<Record<string, HTMLElement | null>>({})
  const scrollFrameRef = useRef<number | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const activeCoachIndex = Math.max(0, coaches.findIndex((coach) => coach.coachKey === activeCoachKey))

  const scrollToCoach = useCallback((coachKey: string, behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth') => {
    const row = coachRowRef.current
    const card = coachCardRefs.current[coachKey]
    if (row && card) {
      const rowBox = row.getBoundingClientRect()
      const cardBox = card.getBoundingClientRect()
      row.scrollTo({ left: row.scrollLeft + cardBox.left - rowBox.left, behavior })
    }
    setActiveCoachKey(coachKey)
  }, [prefersReducedMotion])

  const syncActiveCoach = useCallback(() => {
    const row = coachRowRef.current
    if (!row || coaches.length === 0) return
    const rowStart = row.getBoundingClientRect().left + (Number.parseFloat(window.getComputedStyle(row).paddingLeft) || 0)
    let closestKey: string | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    coaches.forEach((coach) => {
      const card = coachCardRefs.current[coach.coachKey]
      if (!card) return
      const distance = Math.abs(card.getBoundingClientRect().left - rowStart)
      if (distance < closestDistance) {
        closestDistance = distance
        closestKey = coach.coachKey
      }
    })

    if (closestKey) setActiveCoachKey(closestKey)
  }, [coaches])

  useEffect(() => {
    if (!coaches.length) {
      setActiveCoachKey(null)
      return
    }
    if (!activeCoachKey || !coaches.some((coach) => coach.coachKey === activeCoachKey)) {
      setActiveCoachKey(coaches[0].coachKey)
    }
  }, [activeCoachKey, coaches])

  useEffect(() => {
    const row = coachRowRef.current
    if (!row) return

    const handleScroll = () => {
      if (scrollFrameRef.current !== null) return
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null
        syncActiveCoach()
      })
    }

    syncActiveCoach()
    row.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      row.removeEventListener('scroll', handleScroll)
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current)
      scrollFrameRef.current = null
    }
  }, [coachKeySignature, syncActiveCoach])

  useEffect(() => {
    if (!coaches.length || !window.location.hash.startsWith('#coach-')) return
    let hashCoachKey = window.location.hash.slice('#coach-'.length)
    try {
      hashCoachKey = decodeURIComponent(hashCoachKey)
    } catch {
      return
    }
    if (!coaches.some((coach) => coach.coachKey === hashCoachKey)) return
    window.requestAnimationFrame(() => scrollToCoach(hashCoachKey, 'auto'))
  }, [coachKeySignature, coaches, scrollToCoach])

  useEffect(() => {
    if (!selectedCoach) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    document.body.classList.add('mobile-sheet-open')
    closeButtonRef.current?.focus()

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSelectedCoachKey(null)
        return
      }
      if (event.key !== 'Tab') return

      const dialog = closeButtonRef.current?.closest<HTMLElement>('[role="dialog"]')
      const focusable = dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        : []
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleDialogKeyDown)
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown)
      document.body.classList.remove('mobile-sheet-open')
      previousFocusRef.current?.focus()
    }
  }, [selectedCoach])

  return (
    <main className="kinetic-page min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <section className="kinetic-hero relative isolate flex min-h-[390px] overflow-hidden border-b border-black/10 text-white sm:min-h-[480px]">
        <Image
          src={pageMedia.teamHero}
          alt="好運跑班教練團隊背影合照"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="container relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div className="max-w-4xl">
            <p className="text-sm font-black uppercase tracking-wide text-emerald-300">{team.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-black sm:text-6xl">{team.title}</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-white/80 sm:text-lg">
            {team.description}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-apple-blue">{team.rosterLabel}</p>
              <h2 className="mt-2 text-2xl font-black text-apple-gray-950 sm:text-3xl">{team.rosterTitle}</h2>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-apple-gray-600 ring-1 ring-black/10">
              {coaches.length} 位
            </span>
          </div>

          <div className="team-coach-index mb-5 md:hidden" aria-label="直接選擇教練">
            <div className="flex items-center justify-between gap-3">
              <p className="team-coach-index-title flex items-center gap-2 text-sm font-black text-apple-gray-900">
                <ListFilter aria-hidden="true" className="h-4 w-4 text-apple-blue" />
                直接選擇教練
              </p>
              <p className="team-coach-index-count shrink-0 text-xs font-black text-apple-gray-500">
                第 {coaches.length ? activeCoachIndex + 1 : 0} / {coaches.length} 位
              </p>
            </div>
            <div className="team-coach-index-grid mt-3" role="group" aria-label="教練姓名">
              {coaches.map((coach) => (
                <button
                  key={coach.coachKey}
                  type="button"
                  aria-pressed={activeCoachKey === coach.coachKey}
                  aria-label={'選擇' + coach.displayName}
                  onClick={() => scrollToCoach(coach.coachKey, 'auto')}
                  className="team-coach-index-button"
                >
                  {getCoachShortName(coach.displayName)}
                </button>
              ))}
            </div>
          </div>

          <div ref={coachRowRef} className="team-coach-row touch-scroll-row gap-4 md:grid md:grid-cols-2 md:gap-5 xl:grid-cols-3">
            {coaches.map((coach) => {
              const coachAssignments = assignments.get(coach.coachKey) ?? []
              const imageUrl = coach.fullBodyImageUrl || coach.avatarUrl

              return (
                <article
                  id={'coach-' + coach.coachKey}
                  key={coach.coachKey}
                  ref={(element) => {
                    coachCardRefs.current[coach.coachKey] = element
                  }}
                  onClick={(event) => {
                    if (!window.matchMedia('(max-width: 767px)').matches) return
                    if ((event.target as HTMLElement).closest('a, button, details, summary')) return
                    setSelectedCoachKey(coach.coachKey)
                  }}
                  className="team-coach-card kinetic-card relative scroll-mt-32 w-full shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition target:border-black target:shadow-lg md:w-auto"
                >
                  <div className="kinetic-image relative aspect-[3/2] w-full overflow-hidden border-b border-black/10 bg-apple-gray-100">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={`${coach.displayName}教練照片`}
                          fill
                          sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                          style={{ objectPosition: `${coach.fullBodyFocusX ?? 50}% ${coach.fullBodyFocusY ?? 10}%` }}
                        />
                      ) : (
                        <UserRound className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-apple-gray-300" />
                      )}
                  </div>
                  <div className="team-coach-card-body p-5 sm:p-6">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-xl font-black text-apple-gray-950 sm:text-2xl">{coach.displayName}</h3>
                          {coach.nickname ? <p className="mt-1 text-sm font-bold text-apple-blue">{coach.nickname}</p> : null}
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white">
                          <UsersRound className="h-4 w-4" />
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-black leading-6 text-apple-gray-700">{coach.role}</p>
                    </div>

                  <p className="team-coach-card-desktop-detail mt-5 text-sm leading-7 text-apple-gray-600">{coach.bio}</p>

                  {coachAssignments.length ? (
                    <div className="team-coach-card-desktop-detail mt-5 border-t border-black/10 pt-4">
                      <p className="flex items-center gap-2 text-xs font-black text-apple-gray-400">
                        <Route className="h-3.5 w-3.5" />
                        本季度負責班級
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {coachAssignments.map((assignment) => (
                          <Link
                            key={assignment.slug}
                            href={`/courses/${assignment.slug}`}
                            className="group/class inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 ring-1 ring-emerald-900/10 transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25 active:translate-y-0 active:scale-[0.98]"
                            aria-label={`查看${assignment.name}課程`}
                          >
                            {assignment.name}
                            <ArrowUpRight className="h-3 w-3 shrink-0 transition-transform duration-200 group-hover/class:translate-x-0.5 group-hover/class:-translate-y-0.5" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {coach.specialties.length ? (
                    <div className="team-coach-card-desktop-detail mt-5">
                      <p className="flex items-center gap-2 text-xs font-black text-apple-gray-400">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        擅長方向
                      </p>
                      <p className="mt-2 text-sm leading-6 text-apple-gray-600">{coach.specialties.join('、')}</p>
                    </div>
                  ) : null}

                  {(coach.achievements.length || coach.certifications.length) ? (
                    <details className="team-coach-card-desktop-detail mt-5 border-t border-black/10 pt-4">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-apple-gray-800">
                        <Award className="h-4 w-4 text-apple-blue" />
                        經歷與證照
                      </summary>
                      <div className="mt-3 space-y-3 text-xs leading-6 text-apple-gray-600">
                        {coach.achievements.length ? <p>{coach.achievements.join('・')}</p> : null}
                        {coach.certifications.length ? <p>{coach.certifications.join('・')}</p> : null}
                      </div>
                    </details>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setSelectedCoachKey(coach.coachKey)}
                    className="team-coach-card-open-overlay"
                    aria-haspopup="dialog"
                    aria-controls="team-coach-sheet"
                    aria-label={'查看' + coach.displayName + '的完整介紹'}
                  >
                    <span>查看完整介紹<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></span>
                  </button>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="team-coach-controls md:hidden" aria-label="教練卡片控制">
            <button
              type="button"
              onClick={() => activeCoachIndex > 0 && scrollToCoach(coaches[activeCoachIndex - 1].coachKey)}
              disabled={activeCoachIndex <= 0}
              className="team-coach-control-button"
              aria-label="上一位教練"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <p className="team-coach-control-status" aria-live="polite">
              <span>左右滑動</span>
              <span>第 {coaches.length ? activeCoachIndex + 1 : 0} / {coaches.length} 位</span>
            </p>
            <button
              type="button"
              onClick={() => activeCoachIndex < coaches.length - 1 && scrollToCoach(coaches[activeCoachIndex + 1].coachKey)}
              disabled={!coaches.length || activeCoachIndex >= coaches.length - 1}
              className="team-coach-control-button"
              aria-label="下一位教練"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {selectedCoach ? (
        <div className="team-coach-sheet-layer" role="presentation">
          <button type="button" className="team-coach-sheet-backdrop" aria-label="關閉教練介紹" onClick={() => setSelectedCoachKey(null)} />
          <section id="team-coach-sheet" className="team-coach-sheet" role="dialog" aria-modal="true" aria-labelledby="team-coach-sheet-title">
            <div className="team-coach-sheet-handle" aria-hidden="true" />
            <div className="team-coach-sheet-header">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-black/10 bg-apple-gray-100">
                {selectedCoach.avatarUrl || selectedCoach.fullBodyImageUrl ? (
                  <Image src={selectedCoach.avatarUrl || selectedCoach.fullBodyImageUrl || ''} alt="" fill sizes="64px" className="object-cover" style={{ objectPosition: String(selectedCoach.avatarFocusX ?? 50) + '% ' + String(selectedCoach.avatarFocusY ?? 50) + '%' }} />
                ) : <UserRound className="absolute inset-0 m-auto h-7 w-7 text-apple-gray-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="team-coach-sheet-title" className="truncate text-xl font-black text-apple-gray-950">{selectedCoach.displayName}</h2>
                <p className="mt-1 text-sm font-bold text-apple-blue">{selectedCoach.role}</p>
              </div>
              <button ref={closeButtonRef} type="button" onClick={() => setSelectedCoachKey(null)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 text-apple-gray-600" aria-label="關閉教練介紹"><X aria-hidden="true" className="h-5 w-5" /></button>
            </div>
            <div className="team-coach-sheet-content">
              <h3 className="text-lg font-black text-apple-gray-950">教練介紹</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-apple-gray-700">{selectedCoach.bio}</p>
              {assignments.get(selectedCoach.coachKey)?.length ? (
                <div className="mt-7">
                  <h3 className="text-lg font-black text-apple-gray-950">本季度負責班級</h3>
                  <div className="mt-3 space-y-2">{assignments.get(selectedCoach.coachKey)?.map((assignment) => <Link key={assignment.slug} href={'/courses/' + assignment.slug} onClick={() => setSelectedCoachKey(null)} className="flex min-h-11 items-center justify-between rounded-lg border border-black/10 px-4 text-sm font-bold text-apple-blue">{assignment.name}<ArrowUpRight className="h-4 w-4" /></Link>)}</div>
                </div>
              ) : null}
              {selectedCoach.specialties.length ? (
                <div className="mt-7">
                  <h3 className="text-lg font-black text-apple-gray-950">擅長方向</h3>
                  <div className="mt-3 flex flex-wrap gap-2">{selectedCoach.specialties.map((item) => <span key={item} className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">{item}</span>)}</div>
                </div>
              ) : null}
              {(selectedCoach.achievements.length || selectedCoach.certifications.length) ? (
                <div className="mt-7">
                  <h3 className="text-lg font-black text-apple-gray-950">經歷與證照</h3>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-apple-gray-700">
                    {selectedCoach.achievements.map((item) => <p key={item}>{item}</p>)}
                    {selectedCoach.certifications.map((item) => <p key={item}>{item}</p>)}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
