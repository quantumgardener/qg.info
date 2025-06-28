import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import style from "../styles/listPage.scss"
import { PageList, SortFn } from "../PageList"
import { FullSlug, getAllSegmentPrefixes, simplifySlug } from "../../util/path"
import { QuartzPluginData } from "../../plugins/vfile"
import { Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { i18n } from "../../i18n"
import { ComponentChildren } from "preact"
import { concatenateResources } from "../../util/resources"

interface KeywordContentOptions {
  sort?: SortFn
  numPages: number
}

const defaultOptions: KeywordContentOptions = {
  numPages: 10,
}

export default ((opts?: Partial<KeywordContentOptions>) => {
  const options: KeywordContentOptions = { ...defaultOptions, ...opts }

  const KeywordContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData, allFiles, cfg } = props
    const slug = fileData.slug

    if (!(slug?.startsWith("keywords/") || slug === "keywords")) {
      throw new Error(`Component "KeywordContent" tried to render a non-keyword page: ${slug}`)
    }

    const keyword = simplifySlug(slug.slice("keywords/".length) as FullSlug)
    const allPagesWithKeyword = (keyword: string) =>
      allFiles.filter((file) =>
        (file.frontmatter?.keywords ?? []).flatMap(getAllSegmentPrefixes).includes(keyword),
      )

    const content = (
      (tree as Root).children.length === 0
        ? fileData.description
        : htmlToJsx(fileData.filePath!, tree)
    ) as ComponentChildren
    const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
    const classes = cssClasses.join(" ")
    if (keyword === "/") {
      // Root index page. Shows just the keywords, grouped by first letter
      const keywords = [
        ...new Set(
          allFiles.flatMap((data) => data.frontmatter?.keywords ?? []).flatMap(getAllSegmentPrefixes),
        ),
      ].sort((a, b) => a.localeCompare(b))
      const keywordItemMap: Map<string, QuartzPluginData[]> = new Map()
      for (const keyword of keywords) {
        keywordItemMap.set(keyword, allPagesWithKeyword(keyword))
      }
      
      type Accumulator = Record<string, string[]>;

      const excludedKeywords = ['genre']
      const groupedKeywords = keywords.reduce<Accumulator>((acc, keyword) => {
        if (excludedKeywords.includes(keyword)) { // Keywords to ignore
            return acc
        }

        const firstLetter = keyword[0].toLowerCase()
        if (!acc[firstLetter]) {
            acc[firstLetter] = [];
        }
        acc[firstLetter].push(keyword);
        return acc;
      }, {});

      // This is the page for the keyword
      return (
        <div class="popover-hint">
          <article class={classes}>
            <p>{content}</p>
          </article>
          <div className="section">
            {Object.keys(groupedKeywords).sort().map(letter => (
              <div key={letter}>
                <hr/>
                <h2 id={letter}>{letter.toUpperCase()}</h2>
                <ul class="tags">
                  {groupedKeywords[letter].map((keyword, index) => {

                    return (
                      <li key={index}>
                        <a class="internal tag-link" href={`../keywords/${keyword}`}>
                          {keyword} ({allPagesWithKeyword(keyword).length})
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )
    } else {
      const pages = allPagesWithKeyword(keyword)
      const listProps = {
        ...props,
        allFiles: pages,
      }

      // This is a keyword page, listing the thumbnails
      return (
        <div class={classes}>
          <article>{content}</article>
          <div class="page-listing popover-hint">
            <p>{i18n(cfg.locale).pages.keywordContent.itemsUnderKeyword({ count: pages.length })}</p>
            <div>
              <PageList {...listProps} sort={options?.sort} />
            </div>
          </div>
        </div>
      )
    }
  }

  KeywordContent.css = concatenateResources(style, PageList.css)
  return KeywordContent
}) satisfies QuartzComponentConstructor
