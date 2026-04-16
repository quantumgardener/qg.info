import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

import style from "../styles/listPage.scss"
import { PageList, SortFn } from "../PageList"
import { Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { i18n } from "../../i18n"
import { QuartzPluginData } from "../../plugins/vfile"
import { ComponentChildren } from "preact"
import { concatenateResources } from "../../util/resources"
import { FileTrieNode } from "../../util/fileTrie"
import { stripSlashes, simplifySlug } from "../../util/path"

interface FolderContentOptions {
  /**
   * Whether to display number of folders
   */
  showFolderCount: boolean
  showSubfolders: boolean
  sort?: SortFn
}

const defaultOptions: FolderContentOptions = {
  showFolderCount: true,
  showSubfolders: true,
}

export default ((opts?: Partial<FolderContentOptions>) => {
  const options: FolderContentOptions = { ...defaultOptions, ...opts }
  let trie: FileTrieNode<
    QuartzPluginData & {
      slug: string
      title: string
      filePath: string
    }
  >

  const FolderContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData, allFiles, cfg } = props

    if (!trie) {
      trie = new FileTrieNode([])
      allFiles.forEach((file) => {
        if (file.frontmatter) {
          trie.add({
            ...file,
            slug: file.slug!,
            title: file.frontmatter.title,
            filePath: file.filePath!,
          })
        }
      })
    }

    const folderSlug = stripSlashes(simplifySlug(fileData.slug!))
    const folder = trie.findNode(fileData.slug!.split("/"))
    let allPagesInFolder: QuartzPluginData[] = [];

    // Reduce the list of pages shown depending on tag. By this point all source/* tags are stripped
    // of the source.
    
    switch (folderSlug) {
      case "blog":
      case "now":
        allFiles.forEach((file) => {
          if (file.frontmatter?.tags?.includes(folderSlug)) {
            allPagesInFolder.push(file)
          }
        })
        break
      case "books":
        allFiles.forEach((file) => {
          if (file.frontmatter?.tags?.includes("book")) {
            allPagesInFolder.push(file)
          }
        })
        break
      case "cmdrs-log":
        allFiles.forEach((file) => {
          if (file.frontmatter?.tags?.includes("cmdrs-log")) {
            allPagesInFolder.push(file)
          }
        })
        break
      case "movies":
        allFiles.forEach((file) => {
          if (file.frontmatter?.tags?.includes("movie")) {
            allPagesInFolder.push(file)
          }
        })
        break
      case "tv-shows":
        allFiles.forEach((file) => {
          if (file.frontmatter?.tags?.includes("tv-show")) {
            allPagesInFolder.push(file)
          }
        })
        break
      case "video-games":
        allFiles.forEach((file) => {
          if (file.frontmatter?.tags?.includes("video-game")) {
            allPagesInFolder.push(file)
          }
        })
        break
      default:
        allPagesInFolder =
          folder?.children
            .map((node) => {
              // regular file, proceed
              if (node.data) {
                return node.data
              }

              if (node.isFolder && options.showSubfolders) {
                // folders that dont have data need synthetic files
                const getMostRecentDates = (): QuartzPluginData["dates"] => {
                  let maybeDates: QuartzPluginData["dates"] | undefined = undefined
                  for (const child of node.children) {
                    if (child.data?.dates) {
                      // compare all dates and assign to maybeDates if its more recent or its not set
                      if (!maybeDates) {
                        maybeDates = { ...child.data.dates }
                      } else {
                        if (child.data.dates.created > maybeDates.created) {
                          maybeDates.created = child.data.dates.created
                        }

                        if (child.data.dates.modified > maybeDates.modified) {
                          maybeDates.modified = child.data.dates.modified
                        }

                        if (child.data.dates.published > maybeDates.published) {
                          maybeDates.published = child.data.dates.published
                        }
                      }
                    }
                  }
                  return (
                    maybeDates ?? {
                      created: new Date(),
                      modified: new Date(),
                      published: new Date(),
                    }
                  )
                }

                return {
                  slug: node.slug,
                  dates: getMostRecentDates(),
                  frontmatter: {
                    title: node.displayName,
                    tags: [],
                  },
                }
              }
            })
            .filter((page) => page !== undefined) ?? []
      }
    const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
    const classes = ["e-content", ...cssClasses].join(" ")
    const listProps = {
      ...props,
      sort: options.sort,
      allFiles: allPagesInFolder,
    }

    // Generate list of photo years at the top of the photo page
    const allYears = new Set<number>()
    for (const file of allPagesInFolder) {
      const createdDate = file.dates ? new Date(file.dates.created) : new Date(NaN)
      if (!isNaN(createdDate.getTime())) { // Check if the created date is valid
          const year = createdDate.getFullYear();
          allYears.add(year);
      }  
    }

    const allYearsArray = Array.from(allYears).sort((a, b) => b - a)
    const photoYearCallout = () => {
      return (
        <blockquote class="callout years" data-callout="years">
          <div class="callout-title">
            <div class="callout-icon"></div>
            <div class="callout-title-inner"><p>Years</p></div>
          </div>
          <div className="callout-content">
            <p>
              {allYearsArray.map((year, index) => (
                <span key={year}>
                  <a href={`#${year}`}>{year}</a>
                  {index < allYearsArray.length - 1 && " | "}
                </span>
              ))}
            </p>
          </div>
        </blockquote>
    )}

    const content = (
      (tree as Root).children.length === 0
        ? fileData.description
        : htmlToJsx(fileData.filePath!, tree)
    ) as ComponentChildren
    
    return (
      <div class="popover-hint">
        <article class={classes}>
          {content}
          {folderSlug === 'photos' && photoYearCallout()} {/* Remove the extra curly braces */}
        </article>
        <div class="page-listing">
          {options.showFolderCount && (
            <p>
              {i18n(cfg.locale).pages.folderContent.itemsUnderFolder({
                count: allPagesInFolder.length,
              })}
            </p>
          )}
          <div>
            <PageList {...listProps} />
          </div>
        </div>
      </div>
    )
  }

  FolderContent.css = concatenateResources(style, PageList.css)
  return FolderContent
}) satisfies QuartzComponentConstructor
