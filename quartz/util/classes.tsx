import { JSX } from "preact"
import { Data } from "vfile"

function createClassLink(target:string, text:string, icon:string = "nf nf-fa-link") {
    if (target != "") {
        return (
            <li>
                <a class="internal tag-link" href={`${target}`}>
                    <i className={icon}></i> {text}
                </a>                
            </li>
        )
    } else {
         return (
            <li>
                <i className={icon}></i> {text}
            </li>
        )
    }
}



export function listClasses(fileData:Data): string | JSX.Element {
    const sortedClasses = fileData.frontmatter?.tags?.sort() || []  // Classes are stored in tags
    const classes: (string | JSX.Element)[] = []
    for (let i = 0; i < sortedClasses.length; i++) {
        const cls = sortedClasses[i]
        const clsText = cls.replace(/-/g, " ")
        switch (cls) {
        case 'album': // photo album, not music
            classes.push( createClassLink("/albums/", clsText, "nf nf-md-image_album") )
            break;
        case 'blog':
        case 'now':
            classes.push( createClassLink(`/${cls}/`, clsText, "nf nf-fa-square_rss") )
            break;
        case 'book':
            classes.push( createClassLink("/books/", clsText, "nf nf-md-book") )
            break;
        case 'book-series':
            classes.push( createClassLink("", clsText, "nf nf-md-bookshelf") )
            break;
        case 'cmdrs-log':
            classes.push( createClassLink("/cmdrs-log/", clsText, "nf nf-fa-shuttle_space") )
            break;
        case 'gear':
            classes.push( createClassLink("/uses#gear-that-i-use", clsText) )
            break;
        case 'movie':
            classes.push( createClassLink("/movies/", clsText, "nf nf-md-movie_open") )
            break;
        case 'ontological-distinction':
            classes.push( createClassLink("/notes/ontological-distinction/", clsText, "nf nf-md-thought_bubble") )
            break;
        case 'person':
            // Not linked anywhere
            classes.push( createClassLink("", clsText, "nf nf-oct-person") )
            break;
        case 'photo':
            classes.push( createClassLink("/photos/", clsText, "nf nf-fa-camera") )
            break;
        case 'project':
            classes.push( createClassLink("/projects/", clsText, "nf nf-oct-goal") )
            break;
        case 'quote':
            classes.push( createClassLink("/quotes/", clsText, "nf nf-fa-quote_right") )
            break;    
        case 'slash-page':
            classes.push( createClassLink("/slashes/", clsText, "nf nf-md-slash_forward") )
            break;
        case 'software':
            classes.push( createClassLink("/uses#software-that-i-use", clsText, "nf nf-fa-laptop_code") )
            break;
        case 'tv-show':
            classes.push( createClassLink("/tv-shows/", clsText, "nf nf-md-remote_tv") )
            break;
        case 'video-game':
            classes.push( createClassLink("/video-games/", clsText, "nf nf-fa-gamepad") )
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