'use client'

import { Users } from 'lucide-react'

interface Coach {
  name: string
  role: string
  bio: string
  specialties: string[]
  style: string
  achievements: string[]
}

interface CoachCardProps {
  coach: Coach
}

export default function CoachCard({ coach }: CoachCardProps) {
  return (
    <div className="apple-card overflow-hidden p-0 md:flex md:gap-8">
      {/* 教练照片占位区 */}
      <div className="flex flex-shrink-0 items-center justify-center bg-apple-gray-100 md:h-64 md:w-56">
        <div className="flex h-40 w-40 flex-col items-center justify-center md:h-56 md:w-48">
          <div className="rounded-full bg-apple-gray-200 p-8 text-apple-gray-400">
            <Users className="h-24 w-24 md:h-32 md:w-32" />
          </div>
          <p className="mt-4 text-sm text-apple-gray-500">教练照片</p>
          <p className="text-xs text-apple-gray-400">(后续补充)</p>
        </div>
      </div>

      {/* 教练信息 */}
      <div className="flex flex-col justify-center p-6 md:p-8 md:flex-1">
        <h3 className="text-2xl font-black text-apple-gray-900">{coach.name}</h3>
        <p className="mt-1 font-semibold text-apple-blue">{coach.role}</p>

        <p className="mt-5 leading-7 text-apple-gray-700">{coach.bio}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-apple-gray-500">擅长方向</p>
            <div className="mt-2 space-y-1">
              {coach.specialties.map((specialty) => (
                <p key={specialty} className="text-sm text-apple-gray-700">
                  • {specialty}
                </p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-apple-gray-500">带训风格</p>
            <p className="mt-2 text-sm leading-6 text-apple-gray-700">{coach.style}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-apple-gray-500">代表经历</p>
          <div className="mt-2 space-y-1">
            {coach.achievements.map((achievement) => (
              <p key={achievement} className="text-sm text-apple-gray-700">
                • {achievement}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
