import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps} from "./types"
import modernStyle from "./styles/sitetoc.scss"
import { classNames } from "../util/lang"
import { QuartzPluginData } from "../plugins/vfile"
// @ts-ignore
import script from "./scripts/sitetoc.inline"
import OverflowListFactory from "./OverflowList"
import { concatenateResources } from "../util/resources"
import { resolveRelative } from "../util/path"

export default ((opts?: Partial<Options>) => {
  const { OverflowList, overflowListAfterDOMLoaded } = OverflowListFactory()
  const SiteTableOfContents: QuartzComponent = ({
    fileData,
    displayClass,
    cfg,
    allFiles
  }: QuartzComponentProps) => {
    if (!fileData.sitetoc) {
      return null
    }

    return (
      <div class={classNames(displayClass, "sitetoc")}>
        <button
          type="button"
          class={fileData.collapseToc ? "collapsed sitetoc-header" : "sitetoc-header"}
          aria-controls="sitetoc-content"
          aria-expanded={!fileData.collapseToc}
        >
          <h3>Site Contents</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="fold"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class={fileData.collapseToc ? "collapsed sitetoc-content" : "sitetoc-content"}>
          <OverflowList>
          {fileData.sitetoc.map((tocEntry) => {
            const matchedFile: QuartzPluginData | undefined = allFiles.find((file) => file.slug === tocEntry.slug); 
            if (matchedFile) {
                const slug = resolveRelative(fileData.slug!, tocEntry.slug)
                return (
                <li key={slug} className={` depth-${tocEntry.depth}`}>
                    <a href={`${slug}`} data-for={slug} className={"internal"}>
                    {matchedFile.frontmatter?.title ?? ""}
                    </a>
                </li>
                );
            } else {
                return null; // Return null if no match is found
            }
            })}
          </OverflowList>
        </div>
      </div>
    )
  }

  SiteTableOfContents.css = modernStyle
  SiteTableOfContents.afterDOMLoaded = concatenateResources(script, overflowListAfterDOMLoaded)

  return SiteTableOfContents
}) satisfies QuartzComponentConstructor
