type SongMapping = {
    sourceTrack: Spicetify.PlayerTrack;
    boundTracks: Spicetify.PlayerTrack[];
};

const onSongChange = (data: Spicetify.PlayerState) => {
    const { uri } = data?.item;

    const mappings = getAllMappings();

    if (!mappings[uri]) return;

    const songToQueueUri = mappings[uri].boundTracks[0].uri;

    if (songToQueueUri) {
        addPlayNext([songToQueueUri]);
    }
};

const addPlayNext = async (uris: string[]) => {
    await Spicetify.addToQueue(uris.map((uri) => ({ uri })));

    const before = (Spicetify.Queue.nextTracks || []).filter(
        (track) => track.provider !== "context"
    ).length;

    if (before) {
        // what is difference?
        const difference = Spicetify.Queue.nextTracks
            .filter((track) => track.provider !== "context")
            .filter((_, index) => index >= before);

        await Spicetify.Platform.PlayerAPI.reorderQueue(
            difference.map((track) => track.contextTrack),
            { before: Spicetify.Queue.nextTracks[0].contextTrack }
        );
    }
};

function addSongMapping(sourceSongUri: string, addToPlayNextUri: SongMapping) {
    const STORAGE_KEY = "songMappings";

    const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
    let mappings: { [key: string]: SongMapping } = {};

    try {
        if (raw) {
            mappings = JSON.parse(raw);
        }
    } catch (e) {
        console.warn(
            "Failed to parse songMappings from LocalStorage, starting fresh."
        );
    }

    mappings[sourceSongUri] = addToPlayNextUri;

    Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(mappings));
}

function removeSongMapping(uri: string) {
    const STORAGE_KEY = "songMappings";

    const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
    let mappings: { [key: string]: SongMapping } = {};

    try {
        if (raw) {
            mappings = JSON.parse(raw);
        }
    } catch (e) {
        console.warn(
            "Failed to parse songMappings from LocalStorage, starting fresh."
        );
    }

    delete mappings[uri];

    Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(mappings));
}

function getAllMappings(): Record<string, SongMapping> {
    const STORAGE_KEY = "songMappings";

    const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
    if (!raw) {
        console.log("No song mappings found.");
        return {};
    }

    try {
        const mappings = JSON.parse(raw);

        return mappings;
    } catch (e) {
        console.error("Failed to parse songMappings from LocalStorage:", e);
        return {};
    }
}

async function getTrackMetadata(uri: string) {
    const base62 = uri.split(":")[2];
    return await Spicetify.CosmosAsync.get(
        `https://api.spotify.com/v1/tracks/${base62}`
    );
}

const getContextMenuItem = async (uris: string[]) => {
    const { Type } = Spicetify.URI;

    if (
        [Type.PLAYLIST, Type.PLAYLIST_V2].includes(
            Spicetify.URI.fromString(uris[0]).type
        )
    )
        uris = (
            await Spicetify.Platform.PlaylistAPI.getContents(uris[0])
        ).items.map((item: { uri: string }) => item.uri);

    if (uris.length === 0) return;
    const addToPlayNextUri = uris[0];
    const currentSongUri = Spicetify.Player?.data?.item?.uri;

    // don't map song to itself
    if (addToPlayNextUri == currentSongUri) return;

    const currentTrack = Spicetify.Player?.data.item;
    const addToPlayNextTrack = await getTrackMetadata(uris[0]);
    const newMappingDestination: SongMapping = {
        sourceTrack: currentTrack,
        boundTracks: [addToPlayNextTrack],
    };

    addSongMapping(currentSongUri, newMappingDestination);
    // printSongMappings();
};

class CardContainer extends HTMLElement {
    constructor(info: SongMapping) {
        super();
        // console.log("creating CardContainer for", info);

        const { sourceTrack, boundTracks } = info;

        // const sourceImageUrl = sourceTrack.images?.[1].url;
        const boundTrack = boundTracks[0];
        // const boundImageUrl = boundTrack.images?.[1].url;

        // ${
        //     sourceImageUrl && false
        //         ? `<img aria-hidden="false" draggable="false" loading="eager" src="${sourceImageUrl}" alt="${sourceTrack.name}" class="bookmark-card-image">`
        //         : ""
        // }

        // TODO: turn this into JSX
        this.innerHTML = `
            <style>
                .bookmark-card .ButtonInner-md-iconOnly:hover {
                    transform: scale(1.06);
                }
            </style>
            <div class="bookmark-card">
                <div class="bookmark-card-info">
                    <div><span>${sourceTrack.name}</span></div>
                    <div><span>${sourceTrack.artists?.[0].name}</span></div>
                </div>
                <span> -> </span>
                <div class="bookmark-card-info">
                    <div><span>${boundTrack.name}</span></div>
                    <div><span>${boundTrack.artists?.[0].name}</span></div>
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
                console.log("remove", sourceTrack.uri);
                removeSongMapping(sourceTrack.uri);
                event.stopPropagation();
            };
        }
    }
}

class BoundTracksCollection {
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
        this.items.textContent = ""; // Remove all childs

        const collection = getAllMappings();
        for (const songMapping of Object.values(collection)) {
            this.items.append(new CardContainer(songMapping));
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
            padding-bottom: 10px;
            position: absolute;
            z-index: 5001;
        }
        .bookmark-menu-title {
            font-size: 16px;
        }
        .bookmark-card {
            display: flex;
            flex-direction: row;
            // justify-content: flex-start;
            align-items: center;
            // margin-top: 10px;
            // cursor: pointer;
            // padding: 0 10px;
        }
        .bookmark-card-image {
            width: 70px;
            height: 70px;
            object-fit: cover;
            object-position: center center;
            border-radius: 4px;
        }
        .bookmark-card-info {
            // display: flex;
            // flex-direction: column;
            // justify-content: center;
            // align-items: flex-start;
            // width: 100%;
            padding: 10px 10px;
            color: var(--spice-text);
        }
        .bookmark-card-info span {
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            display: -webkit-box;
            white-space: normal;
            overflow: hidden;
            text-overflow: ellipsis;
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

async function main() {
    const { CosmosAsync, Player, LocalStorage, ContextMenu, URI } = Spicetify;
    if (!(CosmosAsync && URI)) {
        setTimeout(main, 300);
        return;
    }

    Spicetify.Player.addEventListener("songchange", (event) => {
        if (!event) return;
        onSongChange(event.data);
    });

    const { Type } = Spicetify.URI;
    const shouldShowOption = (uris: string[]) =>
        uris.every((uri) =>
            [
                Type.TRACK,
                // Type.PLAYLIST,
                // Type.PLAYLIST_V2,
                // Type.ALBUM,
                // Type.LOCAL,
                // Type.EPISODE,
            ].includes(Spicetify.URI.fromString(uri).type)
        );

    new Spicetify.ContextMenu.Item(
        "Always play this after the current song",
        getContextMenuItem,
        shouldShowOption
    ).register();

    customElements.define("bookmark-card-container", CardContainer);
    const LIST = new BoundTracksCollection();

    new Spicetify.Topbar.Button(
        "Bound Tracks",
        // TODO: fix icon
        `<svg height="32px" width="32px" version="1.1" id="XMLID_127_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
            viewBox="0 0 24 24" xml:space="preserve">
            <g id="connect">
                <g>
                    <path d="M5.9,24c-1.6,0-3.1-0.6-4.2-1.7C0.6,21.2,0,19.7,0,18.1c0-1.6,0.6-3.1,1.7-4.2l3.8-3.8l2,2l2.8-2.8l1.4,1.4l-2.8,2.8
                        l1.6,1.6l2.8-2.8l1.4,1.4l-2.8,2.8l2,2l-3.7,3.8C9,23.3,7.5,24,5.9,24z M5.5,12.9l-2.3,2.3C2.4,16,2,17,2,18s0.4,2,1.2,2.8
                        c1.5,1.5,4.1,1.5,5.6,0l2.3-2.4L5.5,12.9z M18.5,13.9l-8.4-8.4l3.7-3.8C14.9,0.6,16.5,0,18,0c1.5,0,3,0.6,4.2,1.7
                        C23.4,2.8,24,4.3,24,5.9s-0.6,3.1-1.7,4.2L18.5,13.9z M13,5.5l5.5,5.5l2.3-2.3C21.6,7.9,22,7,22,5.9c0-1-0.4-2-1.2-2.8
                        c-1.5-1.5-4-1.5-5.6,0L13,5.5z"/>
                </g>
            </g>
        </svg>`,
        (self) => {
            const bound = self.element.getBoundingClientRect();
            LIST.changePosition(bound.left, bound.top);
            document.body.append(LIST.container);
            LIST.setScroll();
        }
    );

    // console.log("mappings", getAllMappings());
}

export default main;
