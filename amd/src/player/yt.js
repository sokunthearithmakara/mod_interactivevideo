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
 * Youtube Player class
 *
 * @module     mod_interactivevideo/player/yt
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { dispatchEvent } from 'core/event_dispatcher';
let player;
class Yt {
    constructor(url, start, end, showControls, customStart = false, preload = false) {
        /**
         * The type of the player
         * @type {String}
         * @default yt
         * @private
         * @readonly
         */
        this.type = 'yt';
        /**
         * The start time of the video
         * @type {Number}
         * @private
         */
        this.start = start;
        /**
         * The end time of the video
         * @type {Number}
         */
        this.end = end;
        /**
         * Interval frequency
         * @type {Number}
         */
        this.frequency = 0.15;
        this.support = {
            playbackrate: true,
            quality: false,
        };
        // Documented at https://developers.google.com/youtube/iframe_api_reference
        var YT;
        var regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)(?:\/embed\/|\/watch\?v=|\/)([^\/]+)/g;
        var match = regex.exec(url);
        var videoId = match[1];
        this.videoId = videoId;
        this.posterImage = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        var ready = false;
        var self = this;
        var options = {
            videoId: videoId,
            // host: 'https://www.youtube-nocookie.com',
            width: 1080,
            height: 720,
            playerVars: {
                origin: window.location.host,
                autoplay: 0,
                hl: M.cfg.language,
                start: start,
                end: end,
                controls: showControls ? 1 : 0,
                showinfo: 0,
                fs: 0,
                cc_load_policy: 1,
                cc_lang_pref: M.cfg.language,
                iv_load_policy: 3,
                autohide: 1,
                rel: 0,
                playsinline: 1,
                disablekb: 1,
            },
            events: {
                onError: function (e) {
                    dispatchEvent('iv:playerError', { error: e.data });
                },
                onReady: function (e) {
                    self.end = !self.end ? e.target.getDuration() : Math.min(self.end, e.target.getDuration());
                    // It's always good idea to play the video at the beginning to download some data.
                    // Otherwise, if user seek before start, they're gonna get blackscreen.
                    if (preload == true && customStart == false) {
                        ready = true;
                        dispatchEvent('iv:playerReady');
                    } else {
                        e.target.mute();
                        e.target.playVideo();
                        let interval = setInterval(() => {
                            if (e.target.getCurrentTime() > 0) {
                                clearInterval(interval);
                                e.target.seekTo(self.start);
                                e.target.pauseVideo();
                                e.target.unMute();
                                ready = true;
                                dispatchEvent('iv:playerReady');
                            }
                        }, 1000);
                    }
                },

                onStateChange: function (e) {
                    if (ready === false) {
                        return;
                    }
                    switch (e.data) {

                        case YT.PlayerState.ENDED:
                            dispatchEvent('iv:playerEnded');
                            break;
                        case YT.PlayerState.PLAYING:
                            if (player.getCurrentTime() >= self.end || player.getCurrentTime() < self.start) {
                                player.seekTo(self.start);
                                dispatchEvent('iv:playerEnded');
                            } else {
                                dispatchEvent('iv:playerPlaying');
                            }
                            break;
                        case YT.PlayerState.PAUSED:
                            dispatchEvent('iv:playerPaused');
                            break;
                        case YT.PlayerState.CUED:
                            if (player.getCurrentTime() >= self.end) {
                                player.seekTo(self.start);
                            }
                            break;
                    }
                },

                onPlaybackRateChange: function (e) {
                    dispatchEvent('iv:playerRateChange', { rate: e.data });
                }
            }
        };

        // Load the IFrame Player API code asynchronously.
        if (!window.YT) {
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            // Replace the 'player' element with an <iframe> and YouTube player
            window.onYouTubeIframeAPIReady = function () {
                YT = window.YT || {};
                player = new YT.Player('player', options);
            };
        } else {
            YT = window.YT || {};
            player = new YT.Player('player', options);
        }
    }
    /**
     * Play the video
     * @return {Void}
     */
    play() {
        player.playVideo();
    }
    /**
     * Pause the video
     * @return {Void}
     */
    pause() {
        player.pauseVideo();
    }
    /**
     * Stop the video
     * @param {Number} starttime
     * @return {Void}
     */
    stop(starttime) {
        player.seekTo(starttime);
        player.pauseVideo();
    }
    /**
     * Seek the video to a specific time
     * @param {Number} time
     * @return {Promise}
     */
    seek(time) {
        player.seekTo(time, true);
        dispatchEvent('iv:playerSeek', { time: time });
        return Promise.resolve();
    }
    /**
     * Get the current time of the video
     * @return {Promise}
     */
    getCurrentTime() {
        return Promise.resolve(player.getCurrentTime());
    }
    /**
     * Get the duration of the video
     * @return {Promise}
     */
    getDuration() {
        return Promise.resolve(player.getDuration());
    }
    /**
     * Check if the video is paused
     * @return {Promise}
     * @resolve {Boolean}
     */
    isPaused() {
        return Promise.resolve(player.getPlayerState() === 2);
    }
    /**
     * Check if the video is playing
     * @return {Promise}
     * @resolve {Boolean}
     */
    isPlaying() {
        return Promise.resolve(player.getPlayerState() === 1);
    }
    /**
     * Check if the video is ended
     * @return {Promise}
     */
    isEnded() {
        if (player.getPlayerState() === 0) {
            return Promise.resolve(true);
        } else {
            if (player.getCurrentTime() >= this.end) {
                return Promise.resolve(true);
            }
        }
        return Promise.resolve(false);
    }
    /**
     * Get the aspect ratio of the video
     * @return {Promise}
     */
    ratio() {
        return Promise.resolve(16 / 9);
    }
    /**
     * Destroy the player
     * @return {Void}
     */
    destroy() {
        player.destroy();
        dispatchEvent('iv:playerDestroyed');
    }
    /**
     * Get the state of the player
     * @return {Promise}
     * @resolve {Number} The state of the player
     */
    getState() {
        return Promise.resolve(player.getPlayerState());
    }
    /**
     * Set playback rate of the video
     * @param {Number} rate
     */
    setRate(rate) {
        player.setPlaybackRate(rate);
        return Promise.resolve();
    }
    /**
     * Mute the video
     */
    mute() {
        player.mute();
    }
    /**
     * Unmute the video
     */
    unMute() {
        player.unMute();
    }
    /**
     * Get the original player object
     */
    originalPlayer() {
        return player;
    }
}

export default Yt;