const onSongChange = (data: Spicetify.PlayerState) => {
    const { uri } = data?.item;

    const mappings = getAllMappings();
    const songToQueueUri = mappings[uri];

    if (songToQueueUri) {
        addPlayNext([songToQueueUri]);
    }
};

const addPlayNext = async (uris: string[]) => {
    await Spicetify.addToQueue(uris.map((uri) => ({ uri })));

    // what is before?
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

function addSongMapping(currentSongUri: string, addToPlayNextUri: string) {
    const STORAGE_KEY = "songMappings";

    const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
    let mappings: { [key: string]: string } = {};

    try {
        if (raw) {
            mappings = JSON.parse(raw);
        }
    } catch (e) {
        console.warn(
            "Failed to parse songMappings from LocalStorage, starting fresh."
        );
    }

    mappings[currentSongUri] = addToPlayNextUri;

    Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(mappings));
}

function printSongMappings() {
    const STORAGE_KEY = "songMappings";

    const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
    console.log("raw", raw);
    if (!raw) {
        console.log("No song mappings found.");
        return;
    }

    try {
        const mappings = JSON.parse(raw);
        console.log("Current Song Mappings:");
        for (const [from, to] of Object.entries(mappings)) {
            console.log(`${from} → ${to}`);
        }
    } catch (e) {
        console.error("Failed to parse songMappings from LocalStorage:", e);
    }
}

function getAllMappings() {
    const STORAGE_KEY = "songMappings";

    const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
    if (!raw) {
        console.log("No song mappings found.");
        return;
    }

    try {
        const mappings = JSON.parse(raw);

        return mappings;
    } catch (e) {
        console.error("Failed to parse songMappings from LocalStorage:", e);
        return [];
    }
}

function clearSongMappings() {
    Spicetify.LocalStorage.clear();
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
    console.log("mapping", currentSongUri, "to", addToPlayNextUri);
    if (addToPlayNextUri == currentSongUri) return; // don't map song to itself

    addSongMapping(currentSongUri, addToPlayNextUri);
    printSongMappings();
};

const getContextMenuItemClear = () => {
    clearSongMappings();
};

class CardContainer extends HTMLElement {
    constructor(info) {
        super();
        console.log("creating CardContainer for", info);

        this.innerHTML = `
            <style>
            .bookmark-card .ButtonInner-md-iconOnly:hover {
            transform: scale(1.06);
            }
            </style>
            <div class="bookmark-card">
            ${
                info.imageUrl
                    ? `<img aria-hidden="false" draggable="false" loading="eager" src="${info.imageUrl}" alt="${info.title}" class="bookmark-card-image">`
                    : ""
            }
            <div class="bookmark-card-info">
                <div class="main-type-balladBold"><span>${
                    info.title
                }</span></div>
                <div class="main-type-mesto"><span>${
                    info.description
                }</span></div>
            </div>
            <button class="bookmark-controls" data-tippy-content="Remove binding"><svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">${
                Spicetify.SVGIcons.x
            }</svg></button>
            </div>
        `;

        Spicetify.Tippy(
            this.querySelectorAll("[data-tippy-content]"),
            Spicetify.TippyProps
        );

        // const controls = this.querySelector(".bookmark-controls");
        // controls?.onclick = (event) => {
        //     LIST.removeFromStorage(info.id);
        //     event.stopPropagation();
        // };

        this.onclick = () => {
            console.log("onclick");
        };
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
        // this.items.append(createMenuItem("Current page", storeThisPage));

        const collection = getAllMappings();
        for (const item of Object.entries(collection)) {
            this.items.append(new CardContainer(item));
        }
    }

    changePosition(x, y) {
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
            min-width: 380px;
            max-height: 70%;
            overflow: hidden auto;
            padding-bottom: 10px;
            position: absolute;
            z-index: 5001;
        }
            .bookmark-card {
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            align-items: center;
            margin-top: 20px;
            cursor: pointer;
            padding: 0 10px;
        }
        .bookmark-card-image {
            width: 70px;
            height: 70px;
            object-fit: cover;
            object-position: center center;
            border-radius: 4px;
        }
        .bookmark-card-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: flex-start;
            width: 100%;
            padding: 10px 20px;
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
        .bookmark-filter {
            margin-top: 7px;
            margin-left: 8px;
            border-radius: 4px;
            padding: 0 8px 0 12px;
            height: 32px;
            align-items: center;
            background-color: transparent;
            border: 0;
            color: var(--spice-text);
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
        .bookmark-fixed-height {
            height: 30px;
            display: flex;
            align-items: center;
        }
        .bookmark-progress {
            overflow: hidden;
            width: 100px;
            height: 4px;
            border-radius: 2px;
            background-color: rgba(var(--spice-rgb-text), .2);
        }

        .bookmark-progress__bar {
            --progress: 0;
            width: calc(var(--progress) * 100%);
            height: 4px;
            background-color: var(--spice-text);
        }

        .bookmark-progress__time {
            padding-left: 5px;
            color: var(--spice-subtext);
        }
    `;

    const menu = document.createElement("ul");
    menu.id = "bookmark-menu";
    menu.className = "main-contextMenu-menu";
    menu.onclick = (e) => e.stopPropagation();

    container.append(style, menu);

    return { container, menu };
}

function createMenuItem(title, callback) {
    const wrapper = document.createElement("div");
    Spicetify.ReactDOM.render(
        Spicetify.React.createElement(
            Spicetify.ReactComponent.MenuItem,
            {
                onClick: () => {
                    callback?.();
                },
            },
            title
        ),
        wrapper
    );

    return wrapper;
}

async function main() {
    // if (!started) console.time("autoQueueSongMap loaded successfully");

    // if (!(Spicetify.Platform && Spicetify.CosmosAsync)) {
    //     setTimeout(() => autoQueueSongMap(true), 300);
    //     return;
    // }
    // while (!Spicetify?.showNotification) {
    //   await new Promise(resolve => setTimeout(resolve, 100));
    // }

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

    new Spicetify.ContextMenu.Item(
        "Clear always play next Queue",
        getContextMenuItemClear,
        shouldShowOption
    ).register();

    customElements.define("bookmark-card-container", CardContainer);
    const LIST = new BoundTracksCollection();

    new Spicetify.Topbar.Button("Bound Tracks", "home", (self) => {
        const bound = self.element.getBoundingClientRect();
        LIST.changePosition(bound.left, bound.top);
        document.body.append(LIST.container);
        LIST.setScroll();
    });

    console.log("mappings", getAllMappings());

    // console.timeEnd("autoQueueSongMap loaded successfully");
}

export default main;
