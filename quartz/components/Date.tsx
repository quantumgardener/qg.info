import { GlobalConfiguration } from "../cfg"
import { ValidLocale } from "../i18n"
import { QuartzPluginData } from "../plugins/vfile"

interface Props {
  date: Date
  locale?: ValidLocale
}

export type ValidDateType = keyof Required<QuartzPluginData>["dates"]

export function getDate(cfg: GlobalConfiguration, data: QuartzPluginData): Date | undefined {
  if (!cfg.defaultDateType) {
    throw new Error(
      `Field 'defaultDateType' was not set in the configuration object of quartz.config.ts. See https://quartz.jzhao.xyz/configuration#general-configuration for more details.`,
    )
  }
  return data.dates?.[cfg.defaultDateType]
}

export function formatDate(d: Date, locale: ValidLocale = "en-US"): string {
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatTime(d: Date, locale: ValidLocale = "en-US"): string {
  return d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function Date({ date, locale }: Props) {
  return <time datetime={date.toISOString()}>{formatDate(date, locale)}</time>
}

export function latestDate(data: QuartzPluginData): Date | undefined {
  if (!data.dates?.created || !data.dates?.modified) {
    // Handle cases where dates are undefined or missing
    return undefined;
  }

  if (data.dates?.created.getTime() === data.dates?.modified.getTime()) {
    return data.dates?.created;
  } else {
    return data.dates?.modified;
  }
}