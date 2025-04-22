(async function() {
        while (!Spicetify.React || !Spicetify.ReactDOM) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        var boundDtracks = (() => {
  // src/storage.ts
  function addSongMapping(sourceSongUri, addToPlayNextUri) {
    const STORAGE_KEY = "songMappings";
    const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
    let mappings = {};
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
  function removeSongMapping(uri) {
    const STORAGE_KEY = "songMappings";
    const raw = Spicetify.LocalStorage.get(STORAGE_KEY);
    let mappings = {};
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
  function getAllMappings() {
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

  // src/BoundTracksCollection.ts
  var CardContainer = class extends HTMLElement {
    constructor(info, boundTracksCollection) {
      var _a, _b;
      super();
      const { sourceTrack, boundTracks } = info;
      const boundTrack = boundTracks[0];
      this.innerHTML = `
            <div class="bookmark-card">
                <div class="bookmark-card-info">
                    <div class="bookmark-card-title">${sourceTrack.name}</div>
                    <div class="bookmark-card-artist">${(_a = sourceTrack.artists) == null ? void 0 : _a[0].name}</div>
                </div>
                <span class="bookmark-card-arrow"> -> </span>
                <div class="bookmark-card-info">
                    <div class="bookmark-card-title">${boundTrack.name}</div>
                    <div class="bookmark-card-artist">${(_b = boundTrack.artists) == null ? void 0 : _b[0].name}</div>
                </div>
                <button class="bookmark-controls" data-tippy-content="Remove binding"><svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">${Spicetify.SVGIcons.x}</svg></button>
            </div>
        `;
      Spicetify.Tippy(
        this.querySelectorAll("[data-tippy-content]"),
        Spicetify.TippyProps
      );
      const removeBindingButton = this.querySelector(".bookmark-controls");
      if (removeBindingButton) {
        removeBindingButton.onclick = (event) => {
          removeSongMapping(sourceTrack.uri);
          boundTracksCollection.apply();
          event.stopPropagation();
        };
      }
    }
  };
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
  var BoundTracksCollection = class {
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
      this.items.textContent = "";
      const collection = getAllMappings();
      for (const songMapping of Object.values(collection)) {
        this.items.append(new CardContainer(songMapping, this));
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
  };

  // src/app.tsx
  var onSongChange = async (data) => {
    const { uri } = data == null ? void 0 : data.item;
    const mappings = getAllMappings();
    if (!mappings[uri])
      return;
    const songToQueueUri = mappings[uri].boundTracks[0].uri;
    setTimeout(async () => {
      var _a, _b, _c, _d;
      const queueData = await Spicetify.Platform.PlayerAPI.getQueue();
      const isSongAlreadyQueued = ((_b = (_a = queueData.nextUp) == null ? void 0 : _a[0]) == null ? void 0 : _b.uri) === songToQueueUri || ((_d = (_c = queueData.queued) == null ? void 0 : _c[0]) == null ? void 0 : _d.uri) === songToQueueUri;
      if (songToQueueUri && !isSongAlreadyQueued) {
        addPlayNext([songToQueueUri]);
      }
    }, 250);
  };
  var addPlayNext = async (uris) => {
    await Spicetify.addToQueue(uris.map((uri) => ({ uri })));
    const before = (Spicetify.Queue.nextTracks || []).filter(
      (track) => track.provider !== "context"
    ).length;
    if (before) {
      const difference = Spicetify.Queue.nextTracks.filter((track) => track.provider !== "context").filter((_, index) => index >= before);
      await Spicetify.Platform.PlayerAPI.reorderQueue(
        difference.map((track) => track.contextTrack),
        { before: Spicetify.Queue.nextTracks[0].contextTrack }
      );
    }
  };
  async function getTrackMetadata(uri) {
    const base62 = uri.split(":")[2];
    return await Spicetify.CosmosAsync.get(
      `https://api.spotify.com/v1/tracks/${base62}`
    );
  }
  var onClickContextMenuItem = async (uris, boundTracksCollection) => {
    var _a, _b, _c, _d;
    const { Type } = Spicetify.URI;
    if ([Type.PLAYLIST, Type.PLAYLIST_V2].includes(
      Spicetify.URI.fromString(uris[0]).type
    ))
      uris = (await Spicetify.Platform.PlaylistAPI.getContents(uris[0])).items.map((item) => item.uri);
    if (uris.length === 0)
      return;
    if (uris.length > 1) {
      Spicetify.showNotification(
        "Warning (Bound Tracks): Only binding the first track selected"
      );
    }
    const addToPlayNextUri = uris[0];
    const currentSongUri = (_c = (_b = (_a = Spicetify.Player) == null ? void 0 : _a.data) == null ? void 0 : _b.item) == null ? void 0 : _c.uri;
    if (addToPlayNextUri === currentSongUri)
      return;
    const currentTrack = (_d = Spicetify.Player) == null ? void 0 : _d.data.item;
    const addToPlayNextTrack = await getTrackMetadata(uris[0]);
    const newMappingDestination = {
      sourceTrack: currentTrack,
      boundTracks: [addToPlayNextTrack]
    };
    addSongMapping(currentSongUri, newMappingDestination);
    boundTracksCollection.apply();
  };
  async function main() {
    if (!(Spicetify.CosmosAsync && Spicetify.URI)) {
      setTimeout(main, 300);
      return;
    }
    Spicetify.Player.addEventListener("songchange", (event) => {
      if (!event)
        return;
      onSongChange(event.data);
    });
    const { Type } = Spicetify.URI;
    const shouldShowOption = (uris) => uris.every(
      (uri) => [Type.TRACK].includes(Spicetify.URI.fromString(uri).type)
    );
    new Spicetify.ContextMenu.Item(
      "Always play this after the current song",
      (uris) => {
        onClickContextMenuItem(uris, boundTracksCollection);
      },
      shouldShowOption
    ).register();
    customElements.define("bookmark-card-container", CardContainer);
    const boundTracksCollection = new BoundTracksCollection();
    const topbarButton = new Spicetify.Topbar.Button(
      "Bound Tracks",
      `<svg id="connect" height="24px" width="24px" version="1.1" id="XMLID_127_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
            viewBox="0 0 24 24" xml:space="preserve">
            <g>
                <path d="M5.9,24c-1.6,0-3.1-0.6-4.2-1.7C0.6,21.2,0,19.7,0,18.1c0-1.6,0.6-3.1,1.7-4.2l3.8-3.8l2,2l2.8-2.8l1.4,1.4l-2.8,2.8
                    l1.6,1.6l2.8-2.8l1.4,1.4l-2.8,2.8l2,2l-3.7,3.8C9,23.3,7.5,24,5.9,24z M5.5,12.9l-2.3,2.3C2.4,16,2,17,2,18s0.4,2,1.2,2.8
                    c1.5,1.5,4.1,1.5,5.6,0l2.3-2.4L5.5,12.9z M18.5,13.9l-8.4-8.4l3.7-3.8C14.9,0.6,16.5,0,18,0c1.5,0,3,0.6,4.2,1.7
                    C23.4,2.8,24,4.3,24,5.9s-0.6,3.1-1.7,4.2L18.5,13.9z M13,5.5l5.5,5.5l2.3-2.3C21.6,7.9,22,7,22,5.9c0-1-0.4-2-1.2-2.8
                    c-1.5-1.5-4-1.5-5.6,0L13,5.5z"/>
            </g>
        </svg>`,
      (self) => {
        const bound = self.element.getBoundingClientRect();
        boundTracksCollection.changePosition(bound.left, bound.top);
        document.body.append(boundTracksCollection.container);
        boundTracksCollection.setScroll();
      }
    );
    topbarButton.element.classList.add("bound-tracks-topbar-button");
    const style = document.createElement("style");
    style.textContent = `
        #connect {
            fill: var(--text-subdued);
        }
        .bound-tracks-topbar-button {
            margin-left: 12px;
        }
        .bound-tracks-topbar-button > button {
            background-color: var(--background-elevated-base);
            border-radius: 50%;
            height: 48px;
            width: 48px;
        }
    `;
    document.head.append(style);
  }
  var app_default = main;

  // ../../../../private/var/folders/57/4p0xy0jx58g37lgs7yrkt4cw0000gn/T/spicetify-creator/index.jsx
  (async () => {
    await app_default();
  })();
})();

      })();