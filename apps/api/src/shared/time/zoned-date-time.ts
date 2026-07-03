const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

type CalendarParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function partsInTimeZone(value: Date, timeZone: string): CalendarParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const values = Object.fromEntries(
    formatter
      .formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>

  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
  }
}

/** Convert an availability calendar date and wall-clock time in an IANA zone to UTC. */
export function zonedDateTimeToUtc(
  date: Date | string,
  time: string,
  timeZone: string,
): Date {
  if (!timePattern.test(time)) throw new RangeError('Time must use HH:mm format')

  const calendarDate = new Date(date)
  if (Number.isNaN(calendarDate.getTime())) throw new RangeError('Invalid calendar date')

  // Availability dates are stored as UTC-midnight calendar markers. Read their
  // UTC date components so the host server's local timezone cannot shift the day.
  const year = calendarDate.getUTCFullYear()
  const month = calendarDate.getUTCMonth() + 1
  const day = calendarDate.getUTCDate()
  const [hourText, minuteText] = time.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0)

  // Iteratively remove the zone offset. This uses only built-in Intl data and
  // works for fixed-offset and daylight-saving zones.
  let instant = desiredAsUtc
  for (let index = 0; index < 3; index += 1) {
    const represented = partsInTimeZone(new Date(instant), timeZone)
    const representedAsUtc = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
    )
    const next = desiredAsUtc - (representedAsUtc - instant)
    if (next === instant) break
    instant = next
  }

  const result = new Date(instant)
  const actual = partsInTimeZone(result, timeZone)
  if (
    actual.year !== year ||
    actual.month !== month ||
    actual.day !== day ||
    actual.hour !== hour ||
    actual.minute !== minute
  ) {
    throw new RangeError('The selected local time does not exist in this timezone')
  }

  return result
}
