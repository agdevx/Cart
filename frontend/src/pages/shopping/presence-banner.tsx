// ABOUTME: Banner showing which household members are actively shopping on the same trip
// ABOUTME: Displays avatar initials and "[Name] is shopping with you"

interface PresenceUser {
  userId: string
  userName: string
}

interface PresenceBannerProps {
  users: PresenceUser[]
}

export const PresenceBanner = ({ users }: PresenceBannerProps) => {
  if (users.length === 0) {
    return null
  }

  const names = users.map((u) => u.userName)
  const message = names.length === 1
    ? `${names[0]} is shopping with you`
    : names.length === 2
      ? `${names[0]} and ${names[1]} are shopping with you`
      : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]} are shopping with you`

  return (
    <div className="bg-teal/8 border border-teal/20 rounded-xl px-3 py-2 mb-3 flex items-center gap-2.5 animate-fade-in">
      <div className="flex -space-x-1.5">
        {users.map((user) => (
          <div
            key={user.userId}
            className="w-7 h-7 bg-teal rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          >
            {user.userName.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      <span className="text-[13px] text-navy-soft">{message}</span>
    </div>
  )
}
