import { ProcessedContent } from "../plugins/vfile";
import { QuartzLogger } from "../util/log"
import { styleText } from "util"
import { QuartzPluginData } from "../plugins/vfile";
import { FullSlug } from "./path";
import { URLSearchParams } from "url";
import { WEBMENTION_TOKEN } from "./myUtils_cfg";

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

// Identify and add previous and next links to filtered content
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

export async function buildWebmentions(filteredContent: ProcessedContent[]) {
  const params = new URLSearchParams({
    "token" : WEBMENTION_TOKEN,
    //"since_id" : "1951999" 
  })

  const response = await fetch(`https://webmention.io/api/mentions.jf2?${params}`)
  if (!response.ok) {
    throw new Error(`HTTP error querying webmentions. Status: ${response.status}`);
  }
  const allWebmentions = await response.json()
  console.log(allWebmentions.children)
  const filteredAllFiles = filteredContent.map((c) => c[1].data)
  filteredAllFiles.forEach( f => {
    const matchedWebmentions = allWebmentions.children.filter( (wm) => wm["wm-target"].replace("https://quantumgardener.info/","") === f.slug)
    const webmentions: WebMentions = {
      likes: 0,
      reposts: 0,
      mentions: []
    }
    matchedWebmentions.forEach( mwm => {
      switch (mwm["wm-property"]) {
        case "like-of":
          webmentions.likes += 1
          break;
        case "repost-of":
          webmentions.reposts += 1
          break;
        case "in-reply-to":
          webmentions.mentions.push(mwm)
          break;
      }
    })
    f.webmentions = webmentions
  })
}

export interface SeriesLink {
  slug: FullSlug | undefined
  title: string | undefined
}

export interface WebMentions {
  likes: number
  reposts: number
  mentions: []
}

declare module "vfile" {
  interface DataMap {
    prevFile: QuartzPluginData
    nextFile: QuartzPluginData
    seriesLink: SeriesLink
    webmentions: WebMentions
  }
}