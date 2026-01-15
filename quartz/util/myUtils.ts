import { ProcessedContent } from "../plugins/vfile";
import { QuartzPluginData } from "../plugins/vfile";
import { FullSlug } from "./path";
import { URLSearchParams } from "url";
import { WEBMENTION_TOKEN } from "./myUtils_cfg";
import { PerfTimer } from "./perf";

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
  const perf = new PerfTimer()
  const filteredAllFiles = filteredContent.map((c) => c[1].data)

  // Build previous and next navigation
  tags.forEach(tag => {
    let processedFiles = 0
    
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
      })
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
  console.log(`Inter-page navigation built in ${perf.timeSince()}`)
}

export async function buildWebmentions(filteredContent: ProcessedContent[]) {
  const params = new URLSearchParams({
    "token" : WEBMENTION_TOKEN,
    //"since_id" : "1951999" 
  })

  const perf = new PerfTimer()
  
  const response = await fetch(`https://webmention.io/api/mentions.jf2?${params}`)
  if (!response.ok) {
    throw new Error(`HTTP error querying webmentions. Status: ${response.status}`);
  }
  const allWebmentions = await response.json()
  const filteredAllFiles = filteredContent.map((c) => c[1].data)
  filteredAllFiles.forEach( f => {
    const matchedWebmentions = allWebmentions.children.filter( (wm: WebmentionEntry) => 
      wm["wm-target"].replace("https://quantumgardener.info/","") === f.slug
      && !wm["wm-private"]
    )
    const webmentions: ProcessedWebMentions = {
      likes: 0,
      reposts: 0,
      mentions: []
    }
    matchedWebmentions.forEach( (mwm: WebmentionEntry) => {
      switch (mwm["wm-property"]) {
        case "like-of":
          webmentions.likes = (webmentions.likes ?? 0) + 1
          break;
        case "repost-of":
          webmentions.reposts = (webmentions.reposts ?? 0) + 1
          break;
        case "in-reply-to":
          (webmentions.mentions ??= []).push(mwm)
          break;
      }
    })
    f.webmentions = webmentions
  })
  console.log(`Webmentions processed in ${perf.timeSince()}`)
}

export function toTitleCase(str) {
  const smallWords = new Set([
    "a", "an", "and", "as", "at", "but", "by", "for", "from",
    "in", "into", "nor", "of", "on", "or", "over", "per",
    "the", "to", "via", "with"
  ]);

  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      // Always capitalize the first and last word
      if (index === 0 || index === str.split(/\s+/).length - 1) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }

      // Lowercase "small words"
      if (smallWords.has(word)) {
        return word;
      }

      // Capitalize everything else
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}


export interface WebmentionEntry {
  type: "entry";
  author: {
    type: "card";
    name: string;
    photo: string;
    url: string;
  };
  url: string;
  published: string; // ISO 8601 datetime string
  "wm-received": string; // ISO 8601 datetime string
  "wm-id": number;
  "wm-source": string;
  "wm-target": string;
  "wm-protocol": "webmention";
  content: {
    html: string;
    text: string;
  };
  "in-reply-to": string;
  "wm-property": string;
  "wm-private": boolean;
}

export interface SeriesLink {
  slug?: FullSlug
  title?: string
}

export interface ProcessedWebMentions {
  likes?: number
  reposts?: number
  mentions?: WebmentionEntry[]
}

declare module "vfile" {
  interface DataMap {
    prevFile: QuartzPluginData
    nextFile: QuartzPluginData
    seriesLink: SeriesLink
    webmentions: ProcessedWebMentions
  }
}