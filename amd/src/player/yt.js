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
import {dispatchEvent} from 'core/event_dispatcher';
let player;
class Yt {
    /**
     * Creates an instance of the YouTube player.
     *
     * @constructor
     * @param {string} url - The URL of the YouTube video.
     * @param {number} start - The start time of the video in seconds.
     * @param {number} end - The end time of the video in seconds.
     * @param {object} opts - The options for the player.
     */
    constructor(url, start, end, opts = {}) {
        const showControls = opts.showControls || false;
        const customStart = opts.customStart || false;
        const preload = opts.preload || false;
        const node = opts.node || 'player';
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
        this.frequency = 0.25;
        this.support = {
            playbackrate: true,
            quality: false,
        };
        // Documented at https://developers.google.com/youtube/iframe_api_reference
        var YT;
        let regex = new RegExp(
            '(?:https?:\\/\\/)?' +
            '(?:www\\.)?' +
            '(?:youtube\\.com|youtu\\.be|youtube-nocookie\\.com)' +
            '(?:\\/embed\\/|\\/watch\\?v=|\\/)([^\\/]+)',
            'g'
        );
        var match = regex.exec(url);
        var videoId = match[1];
        videoId = videoId.split("&")[0];
        this.videoId = videoId;
        this.posterImage = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        let loadedcaption = false;
        var ready = false;
        var self = this;
        var options = {
            videoId: videoId,
            width: 1080,
            height: 720,
            playerVars: {
                autoplay: opts.autoplay || 0,
                hl: M.cfg.language,
                start: start,
                end: end,
                controls: showControls ? 1 : 0,
                showinfo: 0,
                fs: 0,
                modestbranding: 1,
                iv_load_policy: 3,
                cc_load_policy: 0,
                autohide: 1,
                rel: 0,
                playsinline: 1,
                disablekb: 1,
                mute: 0,
            },
            events: {
                onError: function(e) {
                    dispatchEvent('iv:playerError', {error: e.data});
                },
                onReady: function(e) {
                    self.title = e.target.videoTitle;
                    self.end = !self.end ? e.target.getDuration() : Math.min(self.end, e.target.getDuration());
                    self.aspectratio = self.ratio();
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

                onStateChange: function(e) {
                    if (ready === false) {
                        return;
                    }
                    switch (e.data) {
                        case YT.PlayerState.BUFFERING:
                            dispatchEvent('iv:playerBuffering');
                            break;
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

                onPlaybackRateChange: function(e) {
                    dispatchEvent('iv:playerRateChange', {rate: e.data});
                },

                onApiChange: function() {
                    // Always load captions
                    if (!loadedcaption) {
                        player.loadModule('captions');
                        loadedcaption = true;
                    }
                    player.setOption('captions', 'track', {});

                    let tracks;
                    try {
                        tracks = player.getOption('captions', 'tracklist');
                    } catch (e) {
                        tracks = [];
                    }
                    if (tracks && tracks.length > 0) {
                        // Set the first track as active.
                        tracks = tracks.map((track) => {
                            return {
                                label: track.displayName,
                                code: track.languageCode,
                            };
                        });
                        self.captions = tracks;
                        dispatchEvent('iv:captionsReady', {captions: tracks});
                    }
                    loadedcaption = true;
                },
            }
        };

        if (url.includes('youtube-nocookie')) {
            options.host = 'https://www.youtube-nocookie.com';
        }
        // Load the IFrame Player API code asynchronously.
        if (!window.YT) {
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            tag.async = true;
            tag.as = "script";
            tag.rel = "preload";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            // Replace the 'player' element with an <iframe> and YouTube player
            window.onYouTubeIframeAPIReady = function() {
                YT = window.YT || {};
                player = new YT.Player(node, options);
            };
        } else {
            YT = window.YT || {};
            player = new YT.Player(node, options);
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
    async pause() {
        await player.pauseVideo();
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
     * @return {Boolean}
     */
    async seek(time) {
        player.seekTo(time, true);
        dispatchEvent('iv:playerSeek', {time: time});
        return true;
    }
    /**
     * Get the current time of the video
     * @return {Number}
     */
    getCurrentTime() {
        return player.getCurrentTime();
    }
    /**
     * Get the duration of the video
     * @return {Number}
     */
    getDuration() {
        return player.getDuration();
    }
    /**
     * Check if the video is paused
     * @return {Boolean}
     */
    isPaused() {
        return player.getPlayerState() === 2;
    }
    /**
     * Check if the video is playing
     * @return {Boolean}
     */
    isPlaying() {
        return player.getPlayerState() === 1;
    }
    /**
     * Check if the video is ended
     * @return {Boolean}
     */
    isEnded() {
        if (player.getPlayerState() === 0) {
            return true;
        } else {
            if (player.getCurrentTime() >= this.end) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get the aspect ratio of the video
     * @return {Number}
     */
    ratio() {
        return 16 / 9; // YT always return 16:9 as of 2024.
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
     * @return {Number}
     */
    getState() {
        return player.getPlayerState();
    }
    /**
     * Set playback rate of the video
     * @param {Number} rate
     */
    setRate(rate) {
        player.setPlaybackRate(rate);
        return rate;
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

    /**
     * Set subtitle
     * @param {string} track language code
     */
    setCaption(track) {
        player.setOption('captions', 'track', track ? {languageCode: track} : {});
    }
}

export default Yt;