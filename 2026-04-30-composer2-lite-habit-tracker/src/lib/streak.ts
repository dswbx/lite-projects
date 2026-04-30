import { localDateString, previousLocalDay } from './dates'

/**
 * current streak: consecutive days ending today if checked today, else ending yesterday if checked yesterday.
 * if neither today nor yesterday is complete, streak is 0.
 */
export function computeCurrentStreak(
  completedOnDates: string[],
  now: Date = new Date(),
): number {
  const set = new Set(completedOnDates)
  const todayStr = localDateString(now)
  const yesterdayStr = previousLocalDay(todayStr)

  let anchor: string | null = null
  if (set.has(todayStr)) anchor = todayStr
  else if (set.has(yesterdayStr)) anchor = yesterdayStr
  else return 0

  let streak = 0
  let d = anchor
  while (set.has(d)) {
    streak++
    d = previousLocalDay(d)
  }
  return streak
}
