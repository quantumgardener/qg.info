import { formatDate } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import readingTime from "reading-time"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import { JSX } from "preact"
import style from "./styles/contentMeta.scss"
import { listClasses } from "../util/classes"
import { addYearsToUTC } from "../util/myUtils"
import { resolveRelative } from "../util/path"

interface ContentMetaOptions {
  /**
   * Whether to display reading time
   */
  showReadingTime: boolean
  showComma: boolean
  showDate: boolean
}

const defaultOptions: ContentMetaOptions = {
  showReadingTime: true,
  showComma: true,
  showDate: true
}

export default ((opts?: Partial<ContentMetaOptions>) => {
  // Merge options with defaults
  const options: ContentMetaOptions = { ...defaultOptions, ...opts }

  function ContentMetadata({ cfg, fileData, displayClass }: QuartzComponentProps) {
    const text = fileData.text

    if (text) {
      const segments: (string | JSX.Element)[] = []

      switch (fileData.slug) {
        case "blog/index":
        case "keywords/index":
        case "notes/index":
        case "now/index":
          if(fileData.dates?.created) {
            fileData.dates.created = fileData.dates?.published
          }
          if(fileData.dates?.modified) {
            fileData.dates.modified = fileData.dates?.published
          }
          break
        default:
          break
      }

      if (fileData.dates && options.showDate) {
        // Assumes I always have dates

        if (fileData.dates?.created.getTime() == fileData.dates?.modified.getTime()) {
          let displayDate = ""
          let prefix = ""
          if (!fileData.frontmatter?.tags?.includes("cmdrs-log")) {
            displayDate = formatDate(fileData.dates?.created,cfg.locale)
          } else { 
            prefix = "Universal Galactic Time: "
            displayDate = formatDate(addYearsToUTC(fileData.dates?.created,1286),cfg.locale)
          }
          segments.push(
            <a href={`/${fileData?.slug}`} className="u-url">{prefix}
              <time class="dt-published" datetime={`${fileData.dates?.created.toISOString()}`}>{`${displayDate}`}</time>
            </a>)
        } else {
          segments.push(
            <>
              <a href={`/${fileData?.slug}`} className="u-url">
                <time class="dt-published" datetime={`${fileData.dates?.modified.toISOString()}`}>{`${formatDate(fileData.dates?.modified,cfg.locale)}`}</time>
              </a>
              {' '}
              [original {formatDate(fileData.dates?.created,cfg.locale)}]
            </>
          )
        }
      }

      // Display reading time if enabled, but only if more than 2 minutes
      if (options.showReadingTime) {
        const { minutes, words: _words } = readingTime(text)
        if ( minutes >= 2) {
          const displayedTime = i18n(cfg.locale).components.contentMeta.readingTime({
            minutes: Math.ceil(minutes),
          })
          segments.push(<span> | {displayedTime}</span>)
        }
      }

      if(fileData.frontmatter?.rating) {
        const regex = /\[\[(.*?)\|(.*?)\]\]/
        const match = fileData.frontmatter?.rating.match(regex)
        if (match) {
          const ratingSlug = match[1]
          const ratingStars = match[2]
          segments.push(<span> | <a href={`/notes/${ratingSlug}`}>{ratingStars}</a></span>)
        }        
      }

      if(fileData.seriesLink) {
        segments.push(<span> | <a href={`${resolveRelative(fileData.slug!, fileData.seriesLink.slug!)}`}>{fileData.seriesLink.title}</a></span>)
      }

      const classList = listClasses(fileData)


      return (
        <div class={classNames(displayClass, "content-meta")}>
          <p show-comma={options.showComma}>
            {segments}
          </p>
          {classList} 
        </div>
      )
    } else {
      return null
    }
  }

  ContentMetadata.css = style

  return ContentMetadata
}) satisfies QuartzComponentConstructor
