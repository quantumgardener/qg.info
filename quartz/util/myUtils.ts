import { ProcessedContent } from "../plugins/vfile";
import { QuartzLogger } from "../util/log"
import { styleText } from "util"
import { QuartzPluginData } from "../plugins/vfile";
import { FullSlug } from "./path";

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

// Now that we have filtered content, process to identify previous and next links
export function buildNavigation(filteredContent: ProcessedContent[]) {
  const tags = ["blog", "cmdrs-log"]
  const filteredAllFiles = filteredContent.map((c) => c[1].data)

  // Build previous and next navigation
  tags.forEach(tag => {
    const log = new QuartzLogger(false)
    let processedFiles = 0
    log.start(`Creating links for ${tag}`)
    
    // Find the position of the current file within the list of all filtered files.
    const matchedFiles = filteredAllFiles.filter(file => file.frontmatter?.tags?.includes(tag))
      .sort((a, b) => {
        const dateA = new Date(a.frontmatter?.created ?? 0);
        const dateB = new Date(b.frontmatter?.created ?? 0);
        return dateA.getTime() - dateB.getTime();
      })
  
    matchedFiles.map((file, index) => {
        file.prevFile = matchedFiles[index - 1] ?? null
        file.nextFile = matchedFiles[index + 1] ?? null
        processedFiles += 1
        log.updateText(`${tag} ${styleText("gray", `${processedFiles}/${matchedFiles.length}`)}`)
      })
    log.end(`Created links for ${tag}`)
  });

  // Process all files with a series. We want to convert the series [[ ]] value to a slug
  const matchedFilesWithSeries = filteredAllFiles.filter(file => file.frontmatter?.series)
  matchedFilesWithSeries.map(file=> {
    const seriesTitle = file.frontmatter?.series?.replace(/^\[\[|\]\]$/g, '')
    const matchedSeriesFiles = filteredAllFiles.filter(f => f.frontmatter?.title == seriesTitle)

    if (matchedSeriesFiles.length == 1) {
      file.seriesLink = {
        slug: matchedSeriesFiles[0].slug,
        title: seriesTitle
      }
    }
    
    if (matchedSeriesFiles.length > 1) {
      console.error("Matched too many series")
    }
  })
}

export interface SeriesLink {
  slug: FullSlug | undefined
  title: string | undefined
}

declare module "vfile" {
  interface DataMap {
    prevFile: QuartzPluginData
    nextFile: QuartzPluginData
    seriesLink: SeriesLink
  }
}