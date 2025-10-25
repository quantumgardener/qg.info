export function addYearsToUTC(inputDate: unknown, yearsToAdd: number): Date {

  const date = new Date(inputDate as string | number | Date);

  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  ));

  utcDate.setUTCFullYear(utcDate.getUTCFullYear() + yearsToAdd);

  return utcDate;
}
