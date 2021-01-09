import { Message, VoiceConnection, StreamDispatcher } from 'discord.js';
import { Discord } from './core/server';

import { getInfo } from 'ytdl-core-discord';
import { getData } from './core/get-data-youtube';
import { DiscordServer } from './core/discordServer';
import { getCommand } from './core/getCommand';
import { play } from './core/play-core';

const PREFIX = '__';

let servers: { [x: string]: DiscordServer } = {};

const messageHandler = (message: Message) => {
	if (message.content.startsWith(PREFIX) && !message.author.bot) {
		const { command, id } = getCommand(message, PREFIX);
		switch (command) {
			case 'audio':
				if (message.member?.voice.channelID) {
					(async () => {
						const msgContent = message.content.replace(/\s+/g, ' ');
						const args = msgContent.split(' ');
						if (!args[1]) {
							return message.channel.send('Give a link or a youtube search');
						}
						// return;
						const { url, title } = await getData(args[1], message).catch();
						try {
							if (!servers[id]) {
								servers[id] = new DiscordServer(
									message,
									servers,
									id,
									url,
									title
								);
							} else {
								if (
									message.member?.voice.channelID !==
									message.guild?.voice?.channelID
								) {
									return message.channel.send(
										'Get into the same channel as the bot'
									);
								}
								if (Array.isArray(url)) {
									servers[id]?.queue.push(...url);
								} else {
									servers[id]?.queue.push(url);
								}
								message.react('🦆');
								title && message.channel.send(`Queued | ${title}`);
							}
							// console.log(connection);
						} catch (error) {
							console.log(error);
						}
					})();
				} else {
					message.channel.send('Connect to a channel first');
				}
				break;
			case 'pause':
				message.react('⏸');
				servers[id]?.dispatcher?.pause();
				break;
			case 'shuffle':
				message.react('🔀');
				const tmp = servers[id]?.getQueue;
				tmp.shift();
				tmp.length &&
					(servers[id].setQueue = tmp.sort(() => Math.random() - 0.5));
				break;
			case 'resume':
				message.react('⏯');
				// dispatcher[id]?.resume();
				servers[id]?.dispatcher?.resume();
				break;

			case 'fuckoff':
				message.react('🙋‍♂️');
				servers[id]?.getConnection?.disconnect();
				delete servers[id];
				break;

			case 'skip':
				if (!servers[id]?.loop) {
					servers[id]?.queue?.shift();
					if (servers[id]?.getQueue.length && servers[id]?.autoplay) {
						const [first] = servers[id]?.getQueue;
						servers[id].setAuto = first;
					}
				}
				(async () => {
					servers[id].dispatcher = await play(
						servers[id]?.getConnection,
						servers[id]?.getQueue,
						id,
						message,
						servers
					).catch((err) => null);
				})();
				break;
			case 'loop':
				servers[id].setLoop = servers[id]?.loop
					? false
					: servers[id]?.getQueue[0];
				message.react('♾');
				servers[id]?.loop
					? (async () => {
							const { title = null } = await getInfo(
								servers[id]?.loop as string
							)
								.then((res) => res.videoDetails)
								.catch((err) => {
									return { title: null };
								});
							title && message.channel.send(`Now looping forever | ${title}`);
					  })()
					: message.channel.send(`Loop is now off`);
				break;
			case 'autoplay':
				servers[id].setAuto = servers[id]?.autoplay
					? false
					: servers[id]?.getQueue[0];
				message.react('🤖');
				servers[id]?.autoplay
					? message.channel.send('AUTOPLAY in now on')
					: message.channel.send('AUTOPLAY in now off');
				// console.log(id, autoplay[id]);
				break;

			case 'help':
				message.channel.send(`
					  	\`\`\`
__audio anyYoutubeSearch
__audio youtubeUrl
__audio spotify Track Link
__audio spotify Playlist Link
__audio spotify Album Link
__skip (Skip current track)
__pause
__resume 
__fuckoff (Quit)
__loop (Loop current Song )
__autoplay (Keep Playing recommended songs after the queue is done)
__shuffle (Shuffle Current Queue)
						\`\`\`
				`);
				break;

			default:
				break;
		}
	}
};

const client = new Discord({
	messageHandler,
});

client.client.on('voiceStateUpdate', (arg0, arg1) => {
	const newGld = arg1.channel?.guild.id;
	const oldGld = arg0.channel?.guild.id;
	if (!newGld && oldGld && servers[oldGld]) {
		delete servers[oldGld];
	}
});
