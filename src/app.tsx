import { BoundTracksCollection, CardContainer } from "./BoundTracksCollection";
import { addSongMapping, getAllMappings } from "./storage";
import { SongMapping } from "./types/boundTracks";

const onSongChange = async (data: Spicetify.PlayerState) => {
    const { uri } = data?.item;

    const mappings = getAllMappings();

    const songToQueueUri = mappings[uri]?.boundTracks[0]?.uri;
    if (!songToQueueUri) return;

    setTimeout(async () => {
        const queueData = await Spicetify.Platform.PlayerAPI.getQueue();
        const isSongAlreadyQueued =
            queueData.nextUp?.[0]?.uri === songToQueueUri ||
            queueData.queued?.[0]?.uri === songToQueueUri;

        if (songToQueueUri && !isSongAlreadyQueued) {
            addPlayNext([songToQueueUri]);
        }
    }, 250); // delay needed so that we get new queue data (i.e. after song change occurs)
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

async function getTrackMetadata(uri: string) {
    const base62 = uri.split(":")[2];
    return await Spicetify.CosmosAsync.get(
        `https://api.spotify.com/v1/tracks/${base62}`
    );
}

const onClickContextMenuItem = async (
    uris: string[],
    boundTracksCollection: BoundTracksCollection
) => {
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
    if (uris.length > 1) {
        Spicetify.showNotification(
            "Warning (Bound Tracks): Only binding the first track selected"
        );
    }

    const addToPlayNextUri = uris[0];
    const currentSongUri = Spicetify.Player?.data?.item?.uri;

    // don't map song to itself
    if (addToPlayNextUri === currentSongUri) return;

    const currentTrack = Spicetify.Player?.data.item;
    const addToPlayNextTrack = await getTrackMetadata(uris[0]);
    const newMappingDestination: SongMapping = {
        sourceTrack: currentTrack,
        boundTracks: [addToPlayNextTrack],
    };

    addSongMapping(currentSongUri, newMappingDestination);
    boundTracksCollection.apply();
    // printSongMappings();
};

async function main() {
    if (!(Spicetify.CosmosAsync && Spicetify.URI)) {
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
            [Type.TRACK].includes(Spicetify.URI.fromString(uri).type)
        );

    new Spicetify.ContextMenu.Item(
        "Always play this after the current song",
        (uris: string[]) => {
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

export default main;
