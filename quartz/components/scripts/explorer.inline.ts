import { FileTrieNode } from "../../util/fileTrie"
import { FullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { ContentDetails } from "../../plugins/emitters/contentIndex"

type MaybeHTMLElement = HTMLElement | undefined

interface ParsedOptions {
  folderClickBehavior: "collapse" | "link"
  folderDefaultState: "collapsed" | "open"
  useSavedState: boolean
  sortFn: (a: FileTrieNode, b: FileTrieNode) => number
  filterFn: (node: FileTrieNode) => boolean
  mapFn: (node: FileTrieNode) => void
  order: "sort" | "filter" | "map"[]
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
        { slug: 'notes/the-ontology-of-the-human-observer'},
        { slug: 'notes/way-of-being'},
        { slug: 'notes/basic-moods-of-life'},
        { slug: 'notes/ontological-distinction'}
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
        { slug: 'notes/photography',
          children: [
            { slug: 'notes/photos'},
            { slug: 'notes/astrophotography'},
            { slug: 'notes/100-hours-learning-affinity-photo'},
            { slug: 'notes/imatch-to-site' }
          ],
        },
        { slug: 'notes/lego',
          children: [
            { slug: 'notes/building-the-millennium-falcon-in-lego' },
            { slug: 'notes/building-r2-d2-in-lego' },
            { slug: 'notes/building-the-batman-tumbler-in-lego' }
          ]
        },
        { slug: 'notes/video-gaming'},
        { slug: 'notes/home-theatre'},
        { slug: 'notes/cross-stitch'},
        { slug: 'notes/software-development'},
        { slug: 'cmdrs-log/index'},
      ]
    },
    {
      slug: 'projects',
      children: [
        { slug: 'notes/complete-photo-cataloguing' }
      ]
    },
    {
      slug: 'notes/quantum-os',
    },
    { slug: 'subscribe'},
    { slug: 'about'}
]

type FolderState = {
  path: string
  collapsed: boolean
}

let currentExplorerState: Array<FolderState>
function toggleExplorer(this: HTMLElement) {
  const nearestExplorer = this.closest(".explorer") as HTMLElement
  if (!nearestExplorer) return
  const explorerCollapsed = nearestExplorer.classList.toggle("collapsed")
  nearestExplorer.setAttribute(
    "aria-expanded",
    nearestExplorer.getAttribute("aria-expanded") === "true" ? "false" : "true",
  )

  if (!explorerCollapsed) {
    // Stop <html> from being scrollable when mobile explorer is open
    document.documentElement.classList.add("mobile-no-scroll")
  } else {
    document.documentElement.classList.remove("mobile-no-scroll")
  }
}

function toggleFolder(evt: MouseEvent) {
  evt.stopPropagation()
  const target = evt.target as MaybeHTMLElement
  if (!target) return

  // Check if target was svg icon or button
  const isSvg = target.nodeName === "svg"

  // corresponding <ul> element relative to clicked button/folder
  const folderContainer = (
    isSvg
      ? // svg -> div.folder-container
        target.parentElement
      : // button.folder-button -> div -> div.folder-container
        target.parentElement?.parentElement
  ) as MaybeHTMLElement
  if (!folderContainer) return
  const childFolderContainer = folderContainer.nextElementSibling as MaybeHTMLElement
  if (!childFolderContainer) return

  childFolderContainer.classList.toggle("open")

  // Collapse folder container
  const isCollapsed = !childFolderContainer.classList.contains("open")
  setFolderState(childFolderContainer, isCollapsed)

  const currentFolderState = currentExplorerState.find(
    (item) => item.path === folderContainer.dataset.folderpath,
  )
  if (currentFolderState) {
    currentFolderState.collapsed = isCollapsed
  } else {
    currentExplorerState.push({
      path: folderContainer.dataset.folderpath as FullSlug,
      collapsed: isCollapsed,
    })
  }

  const stringifiedFileTree = JSON.stringify(currentExplorerState)
  localStorage.setItem("fileTree", stringifiedFileTree)
}

function createFileNode(currentSlug: FullSlug, node: FileTrieNode): HTMLLIElement {
  const template = document.getElementById("template-file") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const a = li.querySelector("a") as HTMLAnchorElement
  a.href = resolveRelative(currentSlug, node.slug).replace("..","") // Halts /notes/notes recursion error
  a.dataset.for = node.slug
  a.textContent = node.displayName

  if (currentSlug === node.slug) {
    a.classList.add("active")
  }

  return li
}

function createFolderNode(
  currentSlug: FullSlug,
  node: FileTrieNode,
  opts: ParsedOptions,
): HTMLLIElement {
  const template = document.getElementById("template-folder") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const folderContainer = li.querySelector(".folder-container") as HTMLElement
  const titleContainer = folderContainer.querySelector("div") as HTMLElement
  const folderOuter = li.querySelector(".folder-outer") as HTMLElement
  const ul = folderOuter.querySelector("ul") as HTMLUListElement

  const folderPath = node.slug
  folderContainer.dataset.folderpath = folderPath

  if (opts.folderClickBehavior === "link") {
    // Replace button with link for link behavior
    const button = titleContainer.querySelector(".folder-button") as HTMLElement
    const a = document.createElement("a")
    a.href = resolveRelative(currentSlug, folderPath).replace("..","") // Halts /notes/notes recursion error
    a.dataset.for = folderPath
    a.className = "folder-title"
    a.textContent = node.displayName
    button.replaceWith(a)
  } else {
    const span = titleContainer.querySelector(".folder-title") as HTMLElement
    span.textContent = node.displayName
  }

  // if the saved state is collapsed or the default state is collapsed
  const isCollapsed =
    currentExplorerState.find((item) => item.path === folderPath)?.collapsed ??
    opts.folderDefaultState === "collapsed"

  // if this folder is a prefix of the current path we
  // want to open it anyways
  const simpleFolderPath = simplifySlug(folderPath)
  const folderIsPrefixOfCurrentSlug =
    simpleFolderPath === currentSlug.slice(0, simpleFolderPath.length)

  if (!isCollapsed || folderIsPrefixOfCurrentSlug) {
    folderOuter.classList.add("open")
  }

  for (const child of node.children) {
    const childNode = child.isFolder
      ? createFolderNode(currentSlug, child, opts)
      : createFileNode(currentSlug, child)
    ul.appendChild(childNode)
  }

  return li
}

async function setupExplorer(currentSlug: FullSlug) {
  const allExplorers = document.querySelectorAll("div.explorer") as NodeListOf<HTMLElement>

  for (const explorer of allExplorers) {
    const dataFns = JSON.parse(explorer.dataset.dataFns || "{}")
    const opts: ParsedOptions = {
      folderClickBehavior: (explorer.dataset.behavior || "collapse") as "collapse" | "link",
      folderDefaultState: (explorer.dataset.collapsed || "collapsed") as "collapsed" | "open",
      useSavedState: explorer.dataset.savestate === "true",
      order: dataFns.order || ["filter", "map", "sort"],
      sortFn: new Function("return " + (dataFns.sortFn || "undefined"))(),
      filterFn: new Function("return " + (dataFns.filterFn || "undefined"))(),
      mapFn: new Function("return " + (dataFns.mapFn || "undefined"))(),
    }

    // Get folder state from local storage
    const storageTree = localStorage.getItem("fileTree")
    const serializedExplorerState = storageTree && opts.useSavedState ? JSON.parse(storageTree) : []
    const oldIndex = new Map<string, boolean>(
      serializedExplorerState.map((entry: FolderState) => [entry.path, entry.collapsed]),
    )

    const data = await fetchData
    // const entries = [...Object.entries(data)] as [FullSlug, ContentDetails][]
    // const trie = FileTrieNode.fromEntries(entries)
    const trie = new FileTrieNode<ContentDetails>([])
    const parseMenu = (items: MenuItem[], parent: FileTrieNode<ContentDetails>) => {
      items.forEach(item => {
        const slugSegments = item.slug.split("/")
        const newNode = new FileTrieNode<ContentDetails>(
          slugSegments,
          data[item.slug]
        )
        parent.children.push(newNode)
        if (item.children) {
          newNode.isFolder = true
          parseMenu(item.children,newNode)
        }
        // if (item.slug == 'albums/index') {
        //   // Special case, build a list of albums automatically
        //   newNode.isFolder = true
        //   const albums = Object.keys(data)
        //     .filter(key => key.startsWith("albums/") && key !== "albums/index")
        //     .sort((a, b) => a.localeCompare(b))
        //   albums.forEach(album => {
        //     const albumSlugSegments = album.split("/")
        //     const newAlbum = new FileTrieNode<ContentDetails>(
        //       albumSlugSegments,
        //       data[album]
        //     )
        //     newAlbum.displayName = data[album]['title'].slice(7)
        //     newNode.children.push(newAlbum)
        //   })
        // }

        // if (item.slug == 'slashes') {
        //   // Special case, build a list of albums automatically
        //   // ***** Currenltly working on folder, not slash tagged pages. It should be the tags.
        //   newNode.isFolder = true
        //   const slashes = Object.keys(data)
        //     .filter(key => !key.includes("/") && key !== "slashes" && key !== "index")
        //     .sort((a, b) => a.localeCompare(b))
        //   slashes.forEach(slash => {
        //     const slashSlugSegments = slash.split("/")
        //     const newSlash = new FileTrieNode<ContentDetails>(
        //       slashSlugSegments,
        //       data[slash]
        //     )
        //     newNode.children.push(newSlash)
        //   })
        //   newNode.children.sort((a, b) => {
        //     if (!a || !a.data || !a.data.title) return 1;
        //     if (!b || !b.data || !b.data.title) return -1;
        //     return a.data.title.localeCompare(b.data.title);
        //   });
        // }
      })
    }              
    parseMenu(menu, trie)

    // Apply functions in order
    for (const fn of opts.order) {
      switch (fn) {
        case "filter":
          if (opts.filterFn) trie.filter(opts.filterFn)
          break
        case "map":
          if (opts.mapFn) trie.map(opts.mapFn)
          break
        case "sort":
          if (opts.sortFn) trie.sort(opts.sortFn)
          break
      }
    }
    // Get folder paths for state management
    const folderPaths = trie.getFolderPaths()
    currentExplorerState = folderPaths.map((path) => {
      const previousState = oldIndex.get(path)
      return {
        path,
        collapsed:
          previousState === undefined ? opts.folderDefaultState === "collapsed" : previousState,
      }
    })

    const explorerUl = explorer.querySelector(".explorer-ul")
    if (!explorerUl) continue

    // Create and insert new content
    const fragment = document.createDocumentFragment()
    for (const child of trie.children) {
      const node = child.isFolder
        ? createFolderNode(currentSlug, child, opts)
        : createFileNode(currentSlug, child)

      fragment.appendChild(node)
    }
    explorerUl.insertBefore(fragment, explorerUl.firstChild)

    // restore explorer scrollTop position if it exists
    const scrollTop = sessionStorage.getItem("explorerScrollTop");
    if (scrollTop) {
      explorerUl.scrollTop = parseInt(scrollTop);
    } else {
      const activeElement = explorerUl.querySelector(".active") as HTMLElement;
      if (activeElement) {
        // Ensure explorerUl is scrollable
        const explorerRect = explorerUl.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        const isBelow = activeRect.bottom > explorerRect.bottom;
        const isAbove = activeRect.top < explorerRect.top;

        if (isBelow || isAbove) {
          // Scroll manually to center the active element
          const offsetTop = activeElement.offsetTop;
          const offsetHeight = activeElement.offsetHeight;
          const containerHeight = explorerUl.clientHeight;

          explorerUl.scrollTop = offsetTop - containerHeight / 2 + offsetHeight / 2;
        }
      }
    }

    // Set up event handlers
    const explorerButtons = explorer.getElementsByClassName(
      "explorer-toggle",
    ) as HTMLCollectionOf<HTMLElement>
    for (const button of explorerButtons) {
      button.addEventListener("click", toggleExplorer)
      window.addCleanup(() => button.removeEventListener("click", toggleExplorer))
    }

    // Set up folder click handlers
    if (opts.folderClickBehavior === "collapse") {
      const folderButtons = explorer.getElementsByClassName(
        "folder-button",
      ) as HTMLCollectionOf<HTMLElement>
      for (const button of folderButtons) {
        button.addEventListener("click", toggleFolder)
        window.addCleanup(() => button.removeEventListener("click", toggleFolder))
      }
    }

    const folderIcons = explorer.getElementsByClassName(
      "folder-icon",
    ) as HTMLCollectionOf<HTMLElement>
    for (const icon of folderIcons) {
      icon.addEventListener("click", toggleFolder)
      window.addCleanup(() => icon.removeEventListener("click", toggleFolder))
    }
  }
}

document.addEventListener("prenav", async () => {
  // save explorer scrollTop position
  const explorer = document.querySelector(".explorer-ul")
  if (!explorer) return
  sessionStorage.setItem("explorerScrollTop", explorer.scrollTop.toString())
})

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const currentSlug = e.detail.url
  await setupExplorer(currentSlug)

  // if mobile hamburger is visible, collapse by default
  for (const explorer of document.getElementsByClassName("explorer")) {
    const mobileExplorer = explorer.querySelector(".mobile-explorer")
    if (!mobileExplorer) return

    if (mobileExplorer.checkVisibility()) {
      explorer.classList.add("collapsed")
      explorer.setAttribute("aria-expanded", "false")

      // Allow <html> to be scrollable when mobile explorer is collapsed
      document.documentElement.classList.remove("mobile-no-scroll")
    }

    mobileExplorer.classList.remove("hide-until-loaded")
  }
})

window.addEventListener("resize", function () {
  // Desktop explorer opens by default, and it stays open when the window is resized
  // to mobile screen size. Applies `no-scroll` to <html> in this edge case.
  const explorer = document.querySelector(".explorer")
  if (explorer && !explorer.classList.contains("collapsed")) {
    document.documentElement.classList.add("mobile-no-scroll")
    return
  }
})

function setFolderState(folderElement: HTMLElement, collapsed: boolean) {
  return collapsed ? folderElement.classList.remove("open") : folderElement.classList.add("open")
}
