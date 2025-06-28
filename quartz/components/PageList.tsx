import { isFolderPath, resolveRelative, SimpleSlug } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { formatDate, getDate, latestDate  } from "./Date"
import { QuartzComponent, QuartzComponentProps } from "./types"
import { GlobalConfiguration } from "../cfg"
import { listClasses } from "../util/classes"
import { JSX } from "preact/jsx-runtime"
import { Data } from "vfile"

export type SortFn = (f1: QuartzPluginData, f2: QuartzPluginData) => number

export function byDateAndAlphabetical(cfg: GlobalConfiguration): SortFn {
  return (f1, f2) => {
    // Sort by date/alphabetical
    if (f1.dates && f2.dates) {
      // sort descending
      return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      // prioritize files with dates
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    // otherwise, sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

export function byDateAndAlphabeticalFolderFirst(cfg: GlobalConfiguration): SortFn {
  return (f1, f2) => {
    // Sort folders first
    const f1IsFolder = isFolderPath(f1.slug ?? "")
    const f2IsFolder = isFolderPath(f2.slug ?? "")
    if (f1IsFolder && !f2IsFolder) return -1
    if (!f1IsFolder && f2IsFolder) return 1

    // If both are folders or both are files, sort by date/alphabetical
    if (f1.dates && f2.dates) {
      // sort descending by latest of modified and create date for each item
      //return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime()
      return latestDate(f2)!.getTime() - latestDate(f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      // prioritize files with dates
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    // otherwise, sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

type Props = {
  limit?: number
  sort?: SortFn
} & QuartzComponentProps

export const PageList: QuartzComponent = ({ cfg, fileData, allFiles, limit, sort }: Props) => {
  const sorter = sort ?? byDateAndAlphabeticalFolderFirst(cfg)
  let list = allFiles.sort(sorter)
  if (limit) {
    list = list.slice(0, limit)
  }

  const groupedByYear = list.reduce((acc: Record<string, Data[]>, page: Data) => {
    const dateObj = page.dates ? latestDate(page) : null;
    const year = dateObj ? dateObj.toLocaleString(cfg.locale || "en", { year: "numeric" }) : "";
    if (!year) return acc; // Skip items without a valid date
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(page);
    return acc;
  }, {});

  const groupedByMonthYear = list.reduce((acc: Record<string, Data[]>, page: Data) => {
    const dateObj = page.dates ? latestDate(page) : null;
    const monthYear = dateObj ? dateObj.toLocaleString(cfg.locale || "en", { year: "numeric", month: "long" }) : "";
    if (!monthYear) return acc; // Skip items without a valid date
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(page);
    return acc;
  }, {});

  
  const defaultLayout = () => {
    return (
      <div className="section" data-layout="default">
        {Object.entries(groupedByMonthYear).map(([date, pages]) => {
          const id = date.replace(" ", "-").toLowerCase()
  
          return (
          <div key={date}>
            <hr/>
            <h2 id={id}>{date}</h2> {/* Display the grouped date as a heading */}
            <ul className="section-ul">
              {pages.map((page: Data) => {
                const title = page.frontmatter?.title
                const fileDataSlug = fileData.slug!
                const classList = listClasses(page)
                let pagedate:string | JSX.Element = ""
                if (page.dates && fileDataSlug! != "now/index") {
                  if (page.dates?.created.getTime() === page.dates?.modified.getTime()) {
                    pagedate = (
                      <span>
                        {formatDate(getDate(cfg, page)!, cfg.locale)}
                      </span>
                    )
                  } else {
                    pagedate = (
                      <span>
                        {formatDate(latestDate(page)!, cfg.locale)}
                        &dagger;
                      </span>
                    )
                  }
                }              
                return (
                  <li className="page-list-li">
                    <div className="page-list-meta">
                      <p>
                        <a
                          href={resolveRelative(fileDataSlug, page.slug!)}
                          className="internal"
                        >
                          {title}
                        </a> {pagedate}
                      </p>
                      {classList}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          )
        })}
      </div>
    )
  }

  // This is for the gallery of albums, not the album itself
  const albumGalleryLayout = () => {
    return (
      <div className="section" data-layout="album">
        <div class="my-gallery justified-gallery" >
          {list.map((page: Data) => {
            const title = page.frontmatter?.title?.replace("Album: ","")
            let thumbnail = page.frontmatter?.thumbnail
            if (thumbnail) {
              return (
                <a href={resolveRelative(fileData.slug!, page.slug!)}>
                    <img 
                      src={resolveRelative(fileData.slug!, "photos/"+thumbnail as SimpleSlug)} 
                      style="float:left; margin-top:0; margin-right:1rem;" 
                      alt={title}
                    />
                  </a>
              )  
            } else {
              console.error(`\nPhoto ${page.slug!} missing thumbnail for album.`)
              process.exit(1)            
            }
          })}
        </div>
      </div>
    )
  }

  const basicGalleryLayout = () => {
    return (
      <div className="section" data-layout="basic">
        <div class="my-gallery justified-gallery">
          {list.map((page: Data) => {
            const title = page.frontmatter?.title
            let thumbnail = page.frontmatter?.thumbnail as string
            if (thumbnail) {
              return (
                <a
                  href="#" 
                  data-fullsize={resolveRelative(fileData.slug!, "photos/" + thumbnail as SimpleSlug)}
                  data-caption={title}
                  data-photopage={resolveRelative(fileData.slug!, page.slug!)}
                  data-orientation={page.frontmatter?.orientation}
                  >
                  <img 
                    src={resolveRelative(fileData.slug!, "photos/" + thumbnail as SimpleSlug)}
                    alt={title}
                    class="thumbnail"
                  />
                </a>
              );
            } else {
              console.error(`\nPhoto ${page.slug!} missing thumbnail.`)
              process.exit(1)            
            }
          })}
        </div>
      </div>
    )
  }

  const datedGalleryLayout = () => {
    return (
      <div className="section"  data-layout="dated">
        {Object.keys(groupedByYear).sort((a, b) => b.localeCompare(a)).map(year => (
          <div key={year}>
            <hr/>
            <h2 id={year}>{year}</h2>
            <div class="my-gallery justified-gallery">
              {groupedByYear[year].map((page: Data) => {
                const title = page.frontmatter?.title;
                const thumbnail = page.frontmatter?.thumbnail as string;
                if (thumbnail) {
                  return (
                    <a
                      href="#" 
                      data-fullsize={resolveRelative(fileData.slug!, "photos/" + thumbnail as SimpleSlug)}
                      data-caption={title}
                      data-photopage={resolveRelative(fileData.slug!, page.slug!)}
                      data-orientation={page.frontmatter?.orientation}
                      >
                      <img 
                        src={resolveRelative(fileData.slug!, "photos/" + thumbnail as SimpleSlug)}
                        alt={title}
                        class="thumbnail"
                      />
                    </a>
                  );
                } else {
                  console.error(`\nPhoto ${page.slug!} missing thumbnail for photo gallery.`)
                  process.exit(1)
                }
              })}
            </div>
          </div>
        ))
        }
      </div>
    )
  }

  switch (fileData.slug?.split('/')[0]) {
    case "albums":
      return albumGalleryLayout()
    case "keywords":
      return basicGalleryLayout()
    case "photos":
      return datedGalleryLayout()
    default:
      return defaultLayout()
  }
  
}

PageList.css = `
.section h3 {
  margin: 0;
}

.section > .tags {
  margin: 0;
}
`
