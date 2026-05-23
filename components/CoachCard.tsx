import { UserRound } from 'lucide-react'

interface Coach {
  name: string
  nickname?: string
  role: string
  bio: string
  imageUrl?: string
  specialties: string[]
  style: string
  achievements: string[]
  certifications?: string[]
}

interface CoachCardProps {
  coach: Coach
  labels: {
    photo: string
    photoPending?: string
    specialties: string
    style: string
    achievements: string
    certifications?: string
  }
}

export default function CoachCard({ coach, labels }: CoachCardProps) {
  return (
    <div className="apple-card overflow-hidden p-0 md:flex md:gap-8">
      <div className="flex flex-shrink-0 items-center justify-center bg-gradient-to-br from-apple-gray-100 to-white p-8 md:min-h-72 md:w-64">
        <div className="flex flex-col items-center justify-center">
          {coach.imageUrl ? (
            <img
              src={coach.imageUrl}
              alt={coach.name}
              className="h-40 w-40 rounded-full object-cover object-center ring-8 ring-white md:h-48 md:w-48"
            />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-apple-gray-200 text-apple-gray-400 ring-8 ring-white md:h-44 md:w-44">
              <UserRound className="h-20 w-20 md:h-24 md:w-24" />
            </div>
          )}
          {coach.imageUrl && <p className="mt-4 text-sm font-semibold text-apple-gray-500">{labels.photo}</p>}
        </div>
      </div>

      <div className="flex flex-col justify-center p-6 md:flex-1 md:p-8">
        <h3 className="text-2xl font-black text-apple-gray-900">{coach.name}</h3>
        {coach.nickname && <p className="mt-1 text-sm font-bold text-apple-gray-500">{coach.nickname}</p>}
        <p className="mt-1 font-semibold text-apple-blue">{coach.role}</p>

        <p className="mt-5 leading-7 text-apple-gray-700">{coach.bio}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-apple-gray-500">{labels.specialties}</p>
            <div className="mt-2 space-y-1">
              {coach.specialties.map((specialty) => (
                <p key={specialty} className="text-sm text-apple-gray-700">
                  • {specialty}
                </p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-apple-gray-500">{labels.style}</p>
            <p className="mt-2 text-sm leading-6 text-apple-gray-700">{coach.style}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-apple-gray-500">{labels.achievements}</p>
          <div className="mt-2 space-y-1">
            {coach.achievements.map((achievement) => (
              <p key={achievement} className="text-sm text-apple-gray-700">
                • {achievement}
              </p>
            ))}
          </div>
        </div>

        {coach.certifications && coach.certifications.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-apple-gray-500">
              {labels.certifications || '教練證照'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {coach.certifications.map((certification) => (
                <span key={certification} className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-semibold text-apple-gray-700">
                  {certification}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
