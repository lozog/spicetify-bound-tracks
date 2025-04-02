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

    // console.timeEnd("autoQueueSongMap loaded successfully");
}

export default main;
