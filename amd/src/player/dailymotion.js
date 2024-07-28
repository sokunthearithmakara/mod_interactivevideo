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
 *
 * @module     mod_interactivevideo/player/dailymotion
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { dispatchEvent } from 'core/event_dispatcher';
import $ from 'jquery';
let player;

class DailyMotion {
    constructor(url, start, end, showControls, customStart = false) {
        this.type = 'dailymotion';
        this.start = start;
        this.frequency = 0.27;
        this.support = {
            playbackrate: true,
            quality: true,
        };
        // Documented at https://developer.dailymotion.com/player#player-parameters.
        var reg = /(?:https?:\/\/)?(?:www\.)?(?:dai\.ly|dailymotion\.com)\/(?:embed\/video\/|video\/|)([^\/]+)/g;
        var match = reg.exec(url);
        var videoId = match[1];
        this.videoId = videoId;
        var self = this;
        fetch(`https://api.dailymotion.com/video/${videoId}?fields=thumbnail_720_url`)
            .then(response => response.json())
            .then(data => {
                self.posterImage = data.thumbnail_720_url;
                return;
            })
            .catch(() => {
                // Do nothing.
            });
        var ready = false;
        var dmOptions = {
            video: videoId,
            params: {
                startTime: start,
            },
        };
        let dailymotion;
        const dailymotionEvents = (player) => {
            if (showControls) {
                player.setQuality(480);
            }
            player.getState().then(function (state) {
                end = !end ? state.videoDuration : Math.min(end, state.videoDuration);
                self.qualities = state.videoQualitiesList;
                return;
            }).catch(() => {
                // Do nothing.
            });
            // Handle Dailymotion behavior. Video always start from the start time,
            // So if you seek before starting the video, it will just start from the beginning.
            // So, to deal with this, we have to start the video as soon as the player is ready.
            // Let it plays on mute which sometimes include ads. When the ad is done, the VIDEO_START event will fire.
            // That's when we let user know, player is ready.
            if (customStart) {
                player.setMute(true);
                player.play();
                player.on(dailymotion.events.VIDEO_START, function () {
                    if (ready == true) { // When the video is replayed, it will fire VIDEO_START event again.
                        player.setMute(true);
                    }
                    setTimeout(() => {
                        player.seek(start);
                        player.setMute(false);
                        if (!ready) {
                            player.pause();
                            ready = true;
                            dispatchEvent('iv:playerReady');
                        }
                    }, 1000);
                });
            } else {
                ready = true;
                dispatchEvent('iv:playerReady');
            }

            // Show ads to user so they know ad is playing, not because something is wrong.
            player.on(dailymotion.events.AD_START, function () {
                $(".video-block").css('background', 'transparent');
            });

            player.on(dailymotion.events.VIDEO_SEEKEND, function (e) {
                dispatchEvent('iv:playerSeek', e.videoTime);
            });

            player.on(dailymotion.events.VIDEO_END, function () {
                player.seek(start);
                player.pause();
                dispatchEvent('iv:playerEnded');
            });

            player.on(dailymotion.events.VIDEO_TIMECHANGE, function (e) {
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

            player.on(dailymotion.events.PLAYER_ERROR, function (e) {
                dispatchEvent('iv:playerError', { error: e });
            });

            player.on(dailymotion.events.PLAYER_PLAYBACKSPEEDCHANGE, function (e) {
                dispatchEvent('iv:playerRateChange', { rate: e.playerPlaybackSpeed });
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
                    dailymotion.createPlayer("player", dmOptions).then(function (pl) {
                        player = pl;
                        dailymotionEvents(player);
                        return;
                    }).catch(() => {
                        // Do nothing.
                    });
                }
            };
        } else {
            dailymotion.createPlayer("player", dmOptions).then(function (pl) {
                player = pl;
                dailymotionEvents(player);
                dailymotion = window.dailymotion;
                return;
            }).catch(() => {
                // Do nothing.
            });
        }
    }
    play() {
        player.play();
    }
    pause() {
        player.pause();
    }
    stop(starttime) {
        player.seek(starttime);
        player.pause();
    }
    seek(time) {
        return new Promise((resolve) => {
            player.seek(time);
            dispatchEvent('iv:playerSeek', { time: time });
            resolve();
        });
    }
    getCurrentTime() {
        return new Promise((resolve) => {
            player.getState().then(function (state) {
                resolve(state.videoTime);
            });
        });
    }
    getDuration() {
        return new Promise((resolve) => {
            player.getState().then(function (state) {
                resolve(state.videoDuration);
            });
        });
    }
    isPaused() {
        return new Promise((resolve) => {
            player.getState().then(function (state) {
                resolve(!state.playerIsPlaying);
            });
        });
    }
    isPlaying() {
        return new Promise((resolve) => {
            player.getState().then(function (state) {
                resolve(state.playerIsPlaying);
            });
        });
    }
    isEnded() {
        player.getState().then(function (state) {
            return Promise.resolve(state.playerIsReplayScreen);
        });
    }
    ratio() {
        return new Promise((resolve) => {
            // If wide video, use that ratio; otherwise, 16:9.
            player.getState().then(function (state) {
                var ratio = state.playerAspectRatio.split(':');
                if (ratio[0] / ratio[1] > 16 / 9) {
                    resolve(ratio[0] / ratio[1]);
                } else {
                    resolve(16 / 9);
                }
            });
        });
    }
    destroy() {
        player.destroy();
    }
    getState() {
        return new Promise((resolve) => {
            player.getState().then(function (state) {
                resolve(state);
            });
        });
    }
    setRate(rate) {
        player.setPlaybackSpeed(rate);
    }
    mute() {
        player.setMute(true);
    }
    unMute() {
        player.setMute(false);
    }
    originalPlayer() {
        return player;
    }
    setQuality(quality) {
        player.setQuality(quality);
    }
    async getQualities() {
        let states = await this.getState();
        return {
            qualities: ['default', ...states.videoQualitiesList],
            currentQuality: states.videoQuality == 'Auto' ? 'default' : states.videoQuality,
        };
    }
}

export default DailyMotion;