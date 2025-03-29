import { JSX } from "preact"
import { Data } from "vfile"

function createClassLink(target:string, text:string, icon:string = "nf nf-fa-link") {
    return (
        <li>
        <a class="internal tag-link" href={`${target}`}>
        {text} <i className={icon}></i>
        </a>                
    </li>
    )
}



export function listClasses(fileData:Data): string | JSX.Element {
    const sortedClasses = fileData.frontmatter?.tags?.sort() || []  // Classes are stored in tags
    const classes: (string | JSX.Element)[] = []
    for (let i = 0; i < sortedClasses.length; i++) {
        const cls = sortedClasses[i]
        const clsText = cls.replace(/-/g, " ")
        switch (cls) {
        case 'album': // photo album, not music
            classes.push( createClassLink("/albums", clsText) )
            break;
        case 'blog':
        case 'now':
            classes.push( createClassLink(`/${cls}`, clsText, "nf nf-fa-square_rss") )
            break;
        case 'book':
            classes.push( createClassLink("/books", clsText, "nf nf-fa-book_open") )
            break;
        case 'gear':
            classes.push( createClassLink("/uses", clsText) )
            break;
        case 'movie':
            classes.push( createClassLink("/movies", clsText, "nf nf-md-movie_open") )
            break;
        case 'ontological-distinction':
            classes.push( createClassLink("/notes/ontological-distinction", clsText, "nf nf-md-thought_bubble") )
            break;
        case 'photo':
            classes.push( createClassLink("/photos", clsText, "nf nf-fa-camera") )
            break;
        case 'slash-page':
            classes.push( createClassLink("/slashes", clsText) )
            break;
        case 'tv-show':
            classes.push( createClassLink("/tv", clsText, "nf nf-md-remote_tv") )
            break;
        case 'video-game':
            classes.push( createClassLink("/video-games", clsText, "nf nf-fa-gamepad") )
            break;
        default:
            break;
        }
    }
    let classList: (string | JSX.Element) = ""
    if (classes.length > 0) {
        classList = (
        <div> 
            <ul class="tags">
                {classes}
            </ul>
        </div>
        )
    }

    return classList
}