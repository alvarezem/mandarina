export const ACTIVE_STATUSES = ['active']

export function isProActive(subscription) {
  return Boolean(subscription && ACTIVE_STATUSES.includes(subscription.status))
}
