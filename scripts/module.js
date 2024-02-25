const thisModuleName = "Suss Soundboard";

function htmlEncode(string) {
    const text = document.createTextNode(string);
    const element = document.createElement("div");
    element.appendChild(text);
    return element.innerHTML;
}

function getPlaylistName(player) {
    const pcName = player.character.name;
    return `${pcName} Sounds`;
}

function getPlaylistForPlayer(player) {
    const playlistName = getPlaylistName(player);
    return game.playlists.find(pl => pl.name === playlistName);
}

async function setupPlayerPlaylists() {
    if (!game?.user?.isGM) {
        // Only the GM can create playlists and manage their permissions initially.
        return;
    }

    const players = game.users.filter(u => u.character);
    for (const player of players) {
        try {
            await setupPlayerPlaylist(player);
        }
        catch (error) {
            console.error(`Error ensuring playlist for ${player?.name || '<unknown>'}:`, error);
        }
    }
}

async function setupPlayerPlaylist(player) {
    const playlist = await getOrCreatePlayerPlaylist(player);

    if (playlist) {
        await ensurePlayerHasPermissionsToPlaylist(player, playlist);
    }
}

async function getOrCreatePlayerPlaylist(player) {
    return getPlaylistForPlayer(player) || await createPlaylistForPlayer(player);
}

async function createPlaylistForPlayer(player) {
    const playlistName = getPlaylistName(player);
    const playerName = player.name;
    const pcName = player.character.name;
    const playlistData = {
        name: playlistName,
        description: `A playlist for ${pcName} controlled by ${playerName} created by ${thisModuleName}`,
        playing: false
    }
    
    playlist = await Playlist.create(playlistData);

    if (!playlist) {
        ui.notifications.error(`Failed to create the playlist ${playlistName}.`);
        return;
    }

    return playlist;
}

async function ensurePlayerHasPermissionsToPlaylist(player, playlist) {
    const originalOwnership = playlist.ownership;
    const newOwnership = { ...originalOwnership };
    newOwnership[player.id] = 3;
    await playlist.update({"ownership": newOwnership});
}

async function remindPlayerOfTracks() {
    if (!game?.user?.character)
        return;

    const playlist = getPlaylistForPlayer(game.user);
    if (!playlist) {
        ui.notifications.error(`A GM must log in to create a ${thisModuleName} playlist for you.`);
        return;
    }

    const playlistName = htmlEncode(playlist.name);
    const soundNames = playlist.sounds.map(s => htmlEncode(s.name));
    const messageContent = [
        `Your playlist name: <b>${playlistName}</b><br />`,
        '<ul>',
        ...soundNames.map(s => `<li>${s}</li>`),
        '</ul>'
    ].join('');

    const whisperMessage = {
        content: messageContent,
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
        whisper: [game.user.id]
    };

    await ChatMessage.create(whisperMessage);
}

async function onReady() {
    if (game.user.isGM) {
        await setupPlayerPlaylists();
    } else {
        await remindPlayerOfTracks();
    }
}

Hooks.once('ready', onReady);
