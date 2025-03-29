import { QuartzTransformerPlugin } from "../types"
import { Root } from "mdast"
import Slugger from "github-slugger"
import { FullSlug } from "../../util/path"

export interface Options {
  maxDepth: 1 | 2 | 3 | 4 | 5 | 6
  minEntries: number
  showByDefault: boolean
  collapseByDefault: boolean
}

const defaultOptions: Options = {
  maxDepth: 3,
  minEntries: 1,
  showByDefault: true,
  collapseByDefault: false,
}

interface MenuItem {
    slug: string;
    children?: MenuItem[];
    parent?: MenuItem | undefined;
    name?: string,
    depth?: number;
  }

const menu: MenuItem[] = [
    { slug: 'notes/humanity-in-the-workplace' },
    { 
        slug: 'notes/expand-my-way-of-being', 
        children: [
        { slug: 'notes/way-of-being'},
        { slug: 'notes/basic-moods-of-life'}
        ]
    },
    { 
        slug: 'notes/productive-laziness',
        children: [
        { slug: 'notes/personal-knowledge-management'}
        ]
    },
    { 
        slug: 'notes/hobby-together',
        children: [
        { slug: 'photos/index'},
        { slug: 'notes/photography'},
        { slug: 'notes/video-gaming'}
        ]
    },
    {
        slug: 'notes/quantum-os',
    },
    { slug: 'projects',
        children: [
        { slug: 'notes/100-hours-learning-affinity-photo'},
        { slug: 'notes/imatch-to-site' }
        ]
    },
    { slug: 'subscribe'}
]


interface SiteTocEntry {
  depth: number
  slug: FullSlug // full slug, different from page toc
}

const slugAnchor = new Slugger()
export const SiteTableOfContents: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "SiteTableOfContents",
    markdownPlugins() {
      return [
        () => {
          return async (tree: Root, file) => {
            const display = file.data.frontmatter?.enableToc ?? opts.showByDefault
            if (display) {
              slugAnchor.reset()
              const toc: SiteTocEntry[] = []
              let highestDepth: number = opts.maxDepth
              const parseMenu = (items: MenuItem[], depth = 0) => {
                items.forEach(item => {          
                    toc.push({
                        depth: depth,
                        slug: item.slug as FullSlug
                    })
                    highestDepth = Math.min(highestDepth, depth)
                    if (item.children) {
                        parseMenu(item.children, depth + 1)
                    }
                })
              }
          
              parseMenu(menu)

              if (toc.length > 0 && toc.length > opts.minEntries) {
                file.data.sitetoc = toc.map((entry) => ({
                  ...entry,
                  depth: entry.depth - highestDepth,
                }))
                file.data.collapseToc = opts.collapseByDefault
              }
            }
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    sitetoc: SiteTocEntry[]
    collapseToc: boolean
  }
}
