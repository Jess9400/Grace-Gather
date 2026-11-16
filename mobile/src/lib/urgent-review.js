// These are possible safety signals, not a diagnosis or a determination of risk.
// Only the moderator-only confession queue supplies them.
export function needsPriorityReview(item, reports = []) {
  return (item?.status === 'pending' || item?.status === 'reported') &&
    (item?.signals?.includes('safety_context') || item?.signals?.includes('threat') ||
      reports.some(report => report.target === item.id));
}
export function priorityReviewCount(items, reports = []) {
  return Array.isArray(items) ? items.filter(item => needsPriorityReview(item, reports)).length : 0;
}
