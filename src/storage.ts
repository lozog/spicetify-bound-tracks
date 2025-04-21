import { SongMapping } from "./types/boundTracks";

// TODO: rename
export function addSongMapping(
    sourceSongUri: string,
    addToPlayNextUri: SongMapping
) {
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

export function removeSongMapping(uri: string) {
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

export function getAllMappings(): Record<string, SongMapping> {
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
