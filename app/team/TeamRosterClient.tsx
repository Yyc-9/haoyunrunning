'use client'

import Image from 'next/image'
import { Award, BadgeCheck, Route, UserRound, UsersRound } from 'lucide-react'
import { useMemo } from 'react'
import { useSiteContent } from '@/app/site-content-provider'
import { defaultCoachPublicProfiles, getDefaultCourseCoachKeys } from '@/lib/coach-profiles'

function compactCourseName(name: string) {
  return name
    .replace(/^2026\s*/, '')
    .replace(/^好運跑步訓練營\s*X\s*/, '')
    .trim()
}

export default function TeamRosterClient() {
  const { coachProfiles, courseOverrides, courses } = useSiteContent()

  const assignments = useMemo(() => {
    const byCoach = new Map<string, string[]>()
    courses.forEach((course) => {
      const override = courseOverrides[course.slug]
      const coachKeys = override?.coachKeys?.length
        ? override.coachKeys
        : getDefaultCourseCoachKeys(override?.templateSlug || course.slug)

      coachKeys.forEach((coachKey) => {
        const current = byCoach.get(coachKey) ?? []
        byCoach.set(coachKey, [...current, compactCourseName(course.name)])
      })
    })
    return byCoach
  }, [courseOverrides, courses])

  const coaches = Object.values(coachProfiles).filter((coach) =>
    coach.published && (coach.coachKey in defaultCoachPublicProfiles || assignments.has(coach.coachKey))
  )

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <section className="border-b border-black/10 bg-black px-4 py-14 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-wide text-emerald-300">GOOD LUCK TEAM</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl lg:text-6xl">團隊陣容</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/70 sm:text-lg">
            每一堂團練由不同專長的教練與助教共同照顧。課程頁只保留姓名與負責班級，完整公開資料集中在這裡。
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-apple-blue">COACHES & ASSISTANTS</p>
              <h2 className="mt-2 text-2xl font-black text-apple-gray-950 sm:text-3xl">一起帶領每一次訓練</h2>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-apple-gray-600 ring-1 ring-black/10">
              {coaches.length} 位
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {coaches.map((coach) => {
              const coachAssignments = assignments.get(coach.coachKey) ?? []
              const imageUrl = coach.avatarUrl || coach.fullBodyImageUrl

              return (
                <article
                  id={`coach-${coach.coachKey}`}
                  key={coach.coachKey}
                  className="scroll-mt-32 rounded-lg border border-black/10 bg-white p-5 shadow-sm transition target:border-black target:shadow-lg sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-apple-gray-100 shadow-md ring-1 ring-black/10 sm:h-28 sm:w-28">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={`${coach.displayName}教練照片`}
                          fill
                          sizes="112px"
                          className="object-cover"
                          style={{ objectPosition: `${coach.avatarFocusX ?? 50}% ${coach.avatarFocusY ?? 18}%` }}
                        />
                      ) : (
                        <UserRound className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-apple-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pt-2">
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
                  </div>

                  <p className="mt-5 text-sm leading-7 text-apple-gray-600">{coach.bio}</p>

                  {coachAssignments.length ? (
                    <div className="mt-5 border-t border-black/10 pt-4">
                      <p className="flex items-center gap-2 text-xs font-black text-apple-gray-400">
                        <Route className="h-3.5 w-3.5" />
                        本季度負責班級
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {coachAssignments.map((courseName) => (
                          <span key={courseName} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900">
                            {courseName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {coach.specialties.length ? (
                    <div className="mt-5">
                      <p className="flex items-center gap-2 text-xs font-black text-apple-gray-400">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        擅長方向
                      </p>
                      <p className="mt-2 text-sm leading-6 text-apple-gray-600">{coach.specialties.join('、')}</p>
                    </div>
                  ) : null}

                  {(coach.achievements.length || coach.certifications.length) ? (
                    <details className="mt-5 border-t border-black/10 pt-4">
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
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
