// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * DailyMotion Player class
 * Documented at https://developers.dailymotion.com/sdk/player-sdk/web/
 * @module     mod_interactivevideo/player/dailymotion
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {dispatchEvent} from 'core/event_dispatcher';
import $ from 'jquery';
let player;
class DailyMotion {
    /**
     * Constructs a new Dailymotion player instance.
     *
     * @param {string} url - The URL of the Dailymotion video.
     * @param {number} start - The start time of the video in seconds.
     * @param {number} end - The end time of the video in seconds.
     * @param {object} opts - The options for the player.
     */
    constructor(url, start, end, opts = {}) {
        const showControls = opts.showControls || false;
        const customStart = opts.customStart || false;
        const node = opts.node || 'player';
        this.type = 'dailymotion';
        this.start = start;
        this.frequency = 0.27;
        this.support = {
            playbackrate: true,
            quality: true,
        };

        const reg = /(?:https?:\/\/)?(?:www\.)?(?:dai\.ly|dailymotion\.com)\/(?:embed\/video\/|video\/|)([^\/]+)/g;
        const match = reg.exec(url);
        const videoId = match[1];
        this.videoId = videoId;
        var self = this;
        fetch(`https://api.dailymotion.com/video/${videoId}?fields=thumbnail_720_url`)
            .then(response => response.json())
            .then(data => {
                self.posterImage = data.thumbnail_720_url;
                return;
            })
            .catch(() => {
                return;
            });
        var ready = false;
        var dmOptions = {
            video: videoId,
            params: {
                startTime: start,
            },
        };
        let dailymotion;
        const dailymotionEvents = async (player) => {
            self.aspectratio = await self.ratio();
            if (showControls) {
                player.setQuality(480);
            }
            const state = await player.getState();
            end = !end ? state.videoDuration : Math.min(end, state.videoDuration);
            self.end = end;
            self.title = state.videoTitle;
            // Handle Dailymotion behavior. Video always start from the start time,
            // So if you seek before starting the video, it will just start from the beginning.
            // So, to deal with this, we have to start the video as soon as the player is ready.
            // Let it plays on mute which sometimes include ads. When the ad is done, the VIDEO_START event will fire.
            // That's when we let user know, player is ready.
            const playerEvents = () => {
                player.on(dailymotion.events.VIDEO_SEEKEND, function(e) {
                    dispatchEvent('iv:playerSeek', e.videoTime);
                });

                player.on(dailymotion.events.VIDEO_END, function() {
                    player.seek(start);
                    player.pause();
                    dispatchEvent('iv:playerEnded');
                });

                player.off(dailymotion.events.VIDEO_TIMECHANGE);
                player.on(dailymotion.events.VIDEO_TIMECHANGE, function(e) {
                    if (!ready) {
                        return;
                    }

                    if (e.videoTime >= end) {
                        dispatchEvent('iv:playerEnded');
                        player.pause();
                    } else if (e.playerIsPlaying === false) {
                        dispatchEvent('iv:playerPaused');
                    } else if (e.playerIsPlaying === true) {
                        dispatchEvent('iv:playerPlaying');
                    }
                });

                player.on(dailymotion.events.VIDEO_PLAY, function() {
                    dispatchEvent('iv:playerPlaying');
                });

                player.on(dailymotion.events.VIDEO_PAUSE, function() {
                    dispatchEvent('iv:playerPaused');
                });

                player.on(dailymotion.events.VIDEO_END, function() {
                    dispatchEvent('iv:playerEnded');
                });

                player.on(dailymotion.events.PLAYER_ERROR, function(e) {
                    dispatchEvent('iv:playerError', {error: e});
                });

                player.on(dailymotion.events.PLAYER_PLAYBACKSPEEDCHANGE, function(e) {
                    dispatchEvent('iv:playerRateChange', {rate: e.playerPlaybackSpeed});
                });

                player.on(dailymotion.events.VIDEO_QUALITYCHANGE, function(e) {
                    dispatchEvent('iv:playerQualityChange', {quality: e.videoQuality});
                });
            };

            if (customStart) {
                player.setMute(true);
                player.play(); // Start the video to get the ad out of the way.
                player.on(dailymotion.events.VIDEO_TIMECHANGE, function() {
                    $("#start-screen").removeClass('bg-transparent');
                    if (ready == true) { // When the video is replayed, it will fire VIDEO_START event again.
                        player.setMute(true);
                    }
                    setTimeout(async () => {
                        player.seek(start);
                        player.setMute(false);
                        if (!ready) {
                            await self.pause();
                            playerEvents();
                            ready = true;
                            dispatchEvent('iv:playerReady');
                        }
                    }, 1000);
                });
            } else {
                playerEvents();
                ready = true;
                dispatchEvent('iv:playerReady');
            }

            // Show ads to user so they know ad is playing, not because something is wrong.
            player.on(dailymotion.events.AD_START, function() {
                $(".video-block").css('background', 'transparent');
                $("#start-screen").addClass('bg-transparent');
                $('#annotation-canvas').removeClass('d-none');
            });
        };

        if (!window.dailymotion) {
            // Add dailymotion script.
            var tag = document.createElement('script');
            if (showControls) {
                tag.src = "https://geo.dailymotion.com/libs/player/xsyje.js";
            } else {
                tag.src = "https://geo.dailymotion.com/libs/player/xsyj8.js";
            }
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            window.dailymotion = {
                onScriptLoaded: () => {
                    dailymotion = window.dailymotion;
                    dailymotion.createPlayer(node, dmOptions).then(function(pl) {
                        player = pl;
                        dailymotionEvents(player);
                        return;
                    }).catch(() => {
                        // Do nothing.
                    });
                }
            };
        } else {
            window.dailymotion.createPlayer(node, dmOptions).then(function(pl) {
                player = pl;
                dailymotionEvents(player);
                dailymotion = window.dailymotion;
                return;
            }).catch(() => {
                // Do nothing.
            });
        }
    }
    /**
     * Plays the Dailymotion video using the player instance.
     */
    play() {
        player.play();
    }
    /**
     * Pauses the Dailymotion player.
     *
     * This method calls the `pause` function on the `player` object to halt video playback.
     */
    async pause() {
        await player.pause();
    }
    /**
     * Stops the video playback and seeks to the specified start time.
     *
     * @param {number} starttime - The time (in seconds) to seek to before pausing the video.
     */
    stop(starttime) {
        player.seek(starttime);
        player.pause();
    }
    /**
     * Seeks the video player to a specified time.
     *
     * @param {number} time - The time in seconds to seek to.
     * @returns {Promise<void>} A promise that resolves when the seek operation is complete.
     */
    async seek(time) {
        await player.seek(time);
        dispatchEvent('iv:playerSeek', {time: time});
    }
    /**
     * Retrieves the current playback time of the video.
     *
     * @returns {Promise<number>} A promise that resolves to the current video time in seconds.
     */
    async getCurrentTime() {
        const state = await player.getState();
        return state.videoTime;
    }
    /**
     * Asynchronously retrieves the duration of the video.
     *
     * @returns {Promise<number>} A promise that resolves to the duration of the video in seconds.
     */
    async getDuration() {
        const state = await player.getState();
        return state.videoDuration;
    }
    /**
     * Checks if the Dailymotion player is paused.
     *
     * @async
     * @function isPaused
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the player is paused.
     */
    async isPaused() {
        const state = await player.getState();
        return !state.playerIsPlaying;
    }
    /**
     * Checks if the Dailymotion player is currently playing.
     *
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating if the player is playing.
     */
    async isPlaying() {
        const state = await player.getState();
        return state.playerIsPlaying;
    }

    /**
     * Checks if the Dailymotion player has ended and is on the replay screen.
     *
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating if the player is on the replay screen.
     */
    async isEnded() {
        const state = await player.getState();
        return state.playerIsReplayScreen;
    }
    /**
     * Calculates the aspect ratio of the player and compares it to 16:9.
     * If the player's aspect ratio is greater than 16:9, it returns the player's aspect ratio.
     * Otherwise, it returns 16:9.
     *
     * @returns {Promise<number>} The aspect ratio of the player or 16:9.
     */
    async ratio() {
        const state = await player.getState();
        const ratio = state.playerAspectRatio.split(':');
        return ratio[0] / ratio[1];
    }
    /**
     * Destroys the Dailymotion player instance.
     *
     * This method calls the `destroy` method on the `player` object to clean up
     * and release any resources held by the player.
     */
    destroy() {
        player.destroy();
    }
    /**
     * Asynchronously retrieves the current state of the player.
     *
     * @returns {Promise<Object>} A promise that resolves to the current state of the player.
     */
    async getState() {
        const state = await player.getState();
        return state;
    }
    /**
     * Sets the playback speed of the Dailymotion player.
     *
     * @param {number} rate - The playback rate to set.
     */
    setRate(rate) {
        player.setPlaybackSpeed(rate);
    }
    /**
     * Mutes the Dailymotion player.
     *
     * This method sets the player's mute state to true, effectively silencing any audio.
     */
    mute() {
        player.setMute(true);
    }
    /**
     * Unmutes the Dailymotion player.
     */
    unMute() {
        player.setMute(false);
    }
    /**
     * Returns the original Dailymotion player instance.
     *
     * @returns {Object} The Dailymotion player instance.
     */
    originalPlayer() {
        return player;
    }
    /**
     * Sets the quality of the video player.
     *
     * @param {string} quality - The desired quality level for the video player.
     */
    setQuality(quality) {
        player.setQuality(quality);
    }
    /**
     * Retrieves the available video qualities and the current quality setting.
     *
     * @returns {Promise<Object>} An object containing:
     * - `qualities` {Array<string>}: A list of available video qualities including 'default'.
     * - `qualitiesLabel` {Array<string>}: A list of video quality labels including 'Auto'.
     * - `currentQuality` {string}: The current video quality setting, 'default' if set to 'Auto'.
     */
    async getQualities() {
        let states = await this.getState();
        return {
            qualities: ['default', ...states.videoQualitiesList],
            qualitiesLabel: ['Auto', ...states.videoQualitiesList],
            currentQuality: states.videoQuality == 'Auto' ? 'default' : states.videoQuality,
        };
    }
}

export default DailyMotion;