import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { QuartzPluginData } from "./quartz/plugins/vfile";
import { SimpleSlug } from "./quartz/util/path";

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/jackyzha0/quartz",
      "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs({
      hideOnRoot: false,
      showCurrentPage: false,
    }),
    Component.ArticleTitle(),
    Component.ContentMeta({
      showComma: false
    }),
    Component.TagList(),
  ],
  afterBody: [
    Component.Backlinks(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({
      sortFn: (a, b) => {
        return 0
      }
    }),
  ],
  right: [
    Component.DesktopOnly(
      Component.TableOfContents(),
    ),
    Component.DesktopOnly(
      Component.RecentNotes({
        title: "Recent Blogs",
        linkToMore: "blog" as SimpleSlug,
        showTags: false,
        limit: 5,
        filter: (note: QuartzPluginData) => {
          return note.slug!.startsWith("notes") && note.frontmatter!.tags!.includes("blog");
        }  
      }),
    ),
    Component.DesktopOnly(
      Component.Graph({
        localGraph: {
          showTags: false
        },
        globalGraph: {
          showTags: false
        }
      }),
    )
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs({
      hideOnRoot: false,
      showCurrentPage: false,
    }), 
    Component.ArticleTitle(), 
    Component.ContentMeta()],
  afterBody: [],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [],
}
