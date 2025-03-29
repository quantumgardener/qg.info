import { pathToRoot, slugTag } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const iconClass = {
  'keyword' : 'nf nf-cod-key',
  'tag' : 'nf nf-cod-tag',
}

const TagList: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const tags = fileData.frontmatter?.tags ?? []
  const keywords = fileData.frontmatter?.keywords ?? []
  //const combinedItems = [...tags.map(tag => ({ type: 'tag' as 'tag, value: tag })), ...keywords.map(keyword => ({ type: 'keyword' as 'keyword', value: keyword }))]
  const combinedItems = [...keywords.map(keyword => ({ type: 'keyword' as 'keyword', value: keyword }))]
  const sortedCombinedItems = combinedItems.sort((a, b) => a.value.localeCompare(b.value));
  
  const baseDir = pathToRoot(fileData.slug!)
  if (sortedCombinedItems.length > 0) {
    return (
      <ul class={classNames(displayClass, "tags")}>
        {sortedCombinedItems.map((item) => {
          const linkDest = baseDir + `/${item.type}s/${slugTag(item.value)}`
          return (
            <li>
              <a href={linkDest} class="internal tag-link">
                {item.value} <i class={iconClass[item.type]}></i>
              </a>
            </li>
          )
        })}
      </ul>
    )
  } else {
    return null
  }
}

TagList.css = `
.tags {
  list-style: none;
  display: flex;
  padding-left: 0;
  gap: 0.4rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}

.section-li > .section > .tags {
  justify-content: flex-end;
}
  
.tags > li {
  display: inline-block;
  white-space: nowrap;
  margin: 0;
  overflow-wrap: normal;
}

a.internal.tag-link {
  border-radius: 8px;
  background-color: var(--highlight);
  padding: 0.2rem 0.4rem;
  margin: 0 0.1rem;
}
`

export default (() => TagList) satisfies QuartzComponentConstructor
