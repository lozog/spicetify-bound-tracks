import { getAllMappings, removeSongMapping } from "./storage";
import { SongMapping } from "./types/boundTracks";

export class CardContainer extends HTMLElement {
    constructor(
        info: SongMapping,
        boundTracksCollection: BoundTracksCollection
    ) {
        super();
        // console.log("creating CardContainer for", info);
        const { sourceTrack, boundTracks } = info;
        const boundTrack = boundTracks[0];

        // TODO: turn this into JSX
        this.innerHTML = `
            <div class="bookmark-card">
                <div class="bookmark-card-info">
                    <div class="bookmark-card-title">${sourceTrack.name}</div>
                    <div class="bookmark-card-artist">${sourceTrack.artists?.[0].name}</div>
                </div>
                <span class="bookmark-card-arrow"> -> </span>
                <div class="bookmark-card-info">
                    <div class="bookmark-card-title">${boundTrack.name}</div>
                    <div class="bookmark-card-artist">${boundTrack.artists?.[0].name}</div>
                </div>
                <button class="bookmark-controls" data-tippy-content="Remove binding"><svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">${Spicetify.SVGIcons.x}</svg></button>
            </div>
        `;

        Spicetify.Tippy(
            this.querySelectorAll("[data-tippy-content]"),
            Spicetify.TippyProps
        );

        const removeBindingButton: HTMLButtonElement | null =
            this.querySelector(".bookmark-controls");
        if (removeBindingButton) {
            removeBindingButton.onclick = (event) => {
                // console.log("remove", sourceTrack.uri);
                removeSongMapping(sourceTrack.uri);
                boundTracksCollection.apply();
                event.stopPropagation();
            };
        }
    }
}

function createMenu() {
    const container = document.createElement("div");
    container.id = "bookmark-spicetify";
    container.className = "context-menu-container";
    container.style.zIndex = "1029";

    const style = document.createElement("style");
    style.textContent = `
        #bookmark-spicetify {
            position: absolute;
            left: 0;
            right: 0;
            width: 100vw;
            height: 100vh;
            z-index: 5000;
        }
        #bookmark-menu {
            display: inline-block;
            width: 25%;
            min-width: 500px;
            max-height: 70%;
            overflow: hidden auto;
            position: absolute;
            z-index: 5001;
            padding: 8px;
        }
        bookmark-card-container:last-child .bookmark-card {
            border: none;
            margin: 0;
        }
        .bookmark-card {
            display: grid;
            grid-template-columns: 1fr 24px 1fr 42px;
            margin-bottom: 8px;
            border-bottom: solid 1px #7f7f7f;
        }
        .bookmark-card-image {
            width: 70px;
            height: 70px;
            object-fit: cover;
            object-position: center center;
            border-radius: 4px;
        }
        .bookmark-card-info {
            padding: 10px 10px;
            color: var(--spice-text);
        }
        .bookmark-card-arrow {
            display: flex;
            align-items: center;
        }
        .bookmark-card-title {
            color: var(--text-base);
            font-size: var(--encore-text-size-base);
        }
        .bookmark-card-artist {
            color: var(--text-subdued);
            font-size: var(--encore-text-size-smaller);
        }
        .bookmark-controls {
            margin: 10px 0 10px 10px;
            width: 24px;
            height: 24px;
            align-items: center;
            background-color: rgba(var(--spice-rgb-shadow),.7);
            border: none;
            border-radius: 50%;
            color: var(--spice-text);
            cursor: pointer;
            display: inline-flex;
            justify-content: center;
            padding: 8px;
        }
    `;

    const menu = document.createElement("ul");
    menu.id = "bookmark-menu";
    menu.className = "main-contextMenu-menu";
    menu.onclick = (e) => e.stopPropagation();

    container.append(style, menu);

    return { container, menu };
}

export class BoundTracksCollection {
    container: HTMLDivElement;
    items: HTMLUListElement;
    lastScroll: number;

    constructor() {
        const menu = createMenu();
        this.container = menu.container;
        this.items = menu.menu;
        this.lastScroll = 0;
        this.container.onclick = () => {
            this.storeScroll();
            this.container.remove();
        };
        this.apply();
    }

    apply() {
        this.items.textContent = ""; // Remove all children

        const collection = getAllMappings();
        for (const songMapping of Object.values(collection)) {
            this.items.append(new CardContainer(songMapping, this));
        }
    }

    changePosition(x: number, y: number) {
        this.items.style.left = `${x}px`;
        this.items.style.top = `${y + 40}px`;
    }

    storeScroll() {
        this.lastScroll = this.items.scrollTop;
    }

    setScroll() {
        this.items.scrollTop = this.lastScroll;
    }
}
