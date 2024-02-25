const thisModuleName = "Suss Soundboard";
const soundboardOnlyMode = -1;

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
        console.log(`${thisModuleName} determined you are not a GM.`);
        return;
    }

    console.log(`${thisModuleName} found users:`, game.users);

    const players = game.users.filter(u => u.character);
    console.log(`${thisModuleName} found players:`, players);

    for (const player of players) {
        try {
            await setupPlayerPlaylist(player);
            console.log(`${thisModuleName} is done setting up playlist for player.`, player);
        }
        catch (error) {
            console.error(`Error ensuring playlist for ${player?.name || '<unknown>'}:`, error);
        }
    }
    console.log(`${thisModuleName} is done setting up playlists for players.`);
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
    
    const playlist = await Playlist.create(playlistData);

    if (!playlist) {
        ui.notifications.error(`Failed to create the playlist ${playlistName}.`);
        return;
    }

    ui.notifications.info(`${thisModuleName} created playlist ${playlistName} for ${playerName}.`);

    return playlist;
}

async function ensurePlayerHasPermissionsToPlaylist(player, playlist) {
    const originalOwnership = playlist.ownership;
    if (!originalOwnership[player.id] || originalOwnership[player.id] != 3) {
        const newOwnership = { ...originalOwnership };
        newOwnership[player.id] = 3;
        await playlist.update({"ownership": newOwnership});
        await ui.notifications.info(`${thisModuleName} granted ${player.name} control of playlist ${playlist.name}.`);
    }

    if (playlist.mode != soundboardOnlyMode) {
        await playlist.update({"mode": soundboardOnlyMode});
        await ui.notifications.info(`${thisModuleName} put playlist ${playlist.name} in Soundboard Only mode.`);
    }
}

async function remindPlayerOfTracks() {
    if (!game?.user?.character) {
        // Only users with characters get a playlist.
        console.log(`${thisModuleName} determined you are not a player.`);
        return;
    }

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
    await setupPlayerPlaylists();
    await remindPlayerOfTracks();
}

Hooks.once('ready', onReady);
