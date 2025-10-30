import { ProcessedContent } from "../plugins/vfile";
import { QuartzLogger } from "../util/log"
import { styleText } from "util"

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
  tags.forEach(tag => {
    const log = new QuartzLogger(false)
    let processedFiles = 0
    log.start(`Creating links for ${tag}`)
    
    const matchedFiles = filteredAllFiles.filter(file => file.frontmatter?.tags?.includes(tag))
      .sort((a, b) => {
        const dateA = new Date(a.frontmatter?.created ?? 0);
        const dateB = new Date(b.frontmatter?.created ?? 0);
        return dateA.getTime() - dateB.getTime();
      })
  
    matchedFiles.map((file, index) => {
        //console.log("**", file.slug, index)
        file.prevFile = matchedFiles[index - 1] ?? null
        file.nextFile = matchedFiles[index + 1] ?? null
        //console.log( file.prevFile?.slug, file.nextFile?.slug)
        processedFiles += 1
        log.updateText(`${tag} ${styleText("gray", `${processedFiles}/${matchedFiles.length}`)}`)
      })
    log.end(`Created links for ${tag}`)
  });
}