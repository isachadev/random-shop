const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatDateTime(isoDate: string): string {
  return dateTime.format(new Date(isoDate))
}
