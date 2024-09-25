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
 * HTML5 Video Player class
 *
 * @module     mod_interactivevideo/player/html5video
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {dispatchEvent} from 'core/event_dispatcher';
import $ from 'jquery';

class Html5Video {
    /**
     * Creates an instance of an HTML5 video player.
     *
     * @constructor
     * @param {string} url - The URL of the video to be played.
     * @param {number} start - The start time of the video in seconds.
     * @param {number} [end] - The end time of the video in seconds. If not provided, defaults to the video's duration.
     * @param {boolean} showControls - Whether to show the video controls.
     *
     * @property {string} type - The type of the player, set to "html5video".
     * @property {number} start - The start time of the video.
     * @property {number} end - The end time of the video.
     * @property {number} frequency - The frequency of some operation, set to 0.28.
     * @property {Object} support - An object indicating support for playback rate and quality.
     * @property {boolean} support.playbackrate - Indicates if playback rate control is supported.
     * @property {boolean} support.quality - Indicates if quality control is supported.
     * @property {HTMLVideoElement} player - The HTML5 video element.
     * @property {string} posterImage - The poster image of the video.
     *
     * @fires iv:playerReady - Dispatched when the video's metadata is loaded.
     * @fires iv:playerSeek - Dispatched when the video is seeked.
     * @fires iv:playerEnded - Dispatched when the video ends.
     * @fires iv:playerPaused - Dispatched when the video is paused.
     * @fires iv:playerPlaying - Dispatched when the video is playing.
     * @fires iv:playerError - Dispatched when there is an error with the video.
     * @fires iv:playerRateChange - Dispatched when the playback rate changes.
     */
    constructor(url, start, end, showControls) {
        this.type = "html5video";
        this.start = start;
        this.end = end;
        this.frequency = 0.28;
        this.support = {
            playbackrate: true,
            quality: false,
        };
        var player = document.getElementById('player');
        player.src = url;
        player.controls = showControls;
        player.autoplay = false;
        player.currentTime = start;
        // Disable keyboard controls.
        player.tabIndex = -1;
        this.posterImage = player.poster;
        let self = this;
        if (!showControls) {
            $('body').addClass('no-original-controls');
        }

        // Play inline.
        player.setAttribute('playsinline', '');

        // Disable picture-in-picture.
        player.setAttribute('disablePictureInPicture', '');

        player.addEventListener('loadedmetadata', function() {
            self.aspectratio = self.ratio();
            dispatchEvent('iv:playerReady');
            end = !end ? player.duration : Math.min(end, player.duration);

        });

        player.addEventListener('seeked', function() {
            dispatchEvent('iv:playerSeek', {time: player.currentTime});
        });

        player.addEventListener('timeupdate', function() {
            if (player.ended || (end && player.currentTime >= end)) {
                dispatchEvent('iv:playerEnded');
                player.pause();
            } else if (player.paused) {
                dispatchEvent('iv:playerPaused');
            } else if (!player.paused) {
                dispatchEvent('iv:playerPlaying');
            }
        });

        player.addEventListener('error', function(e) {
            dispatchEvent('iv:playerError', {error: e});
        });

        player.addEventListener('ratechange', function() {
            dispatchEvent('iv:playerRateChange', {rate: player.playbackRate});
        });

        this.player = player;
    }

    /**
     * Plays the HTML5 video using the player instance.
     *
     * @method play
     */
    play() {
        this.player.play();
    }
    /**
     * Pauses the video playback.
     *
     * This method calls the pause function on the player instance to stop the video.
     */
    pause() {
        this.player.pause();
    }
    /**
     * Stops the video playback and sets the current time to the specified start time.
     *
     * @param {number} starttime - The time (in seconds) to set the video's current time to.
     */
    stop(starttime) {
        this.player.pause();
        this.player.currentTime = starttime;
    }
    /**
     * Seeks the video to a specified time.
     *
     * @param {number} time - The time in seconds to seek to.
     * @returns {boolean} Returns true when the seek operation is initiated.
     */
    seek(time) {
        this.player.currentTime = time;
        return true;
    }
    /**
     * Retrieves the current playback time of the video.
     *
     * @returns {number} The current time of the video in seconds.
     */
    getCurrentTime() {
        return this.player.currentTime;
    }
    /**
     * Retrieves the duration of the video.
     *
     * @returns {number} The duration of the video in seconds.
     */
    getDuration() {
        return this.player.duration;
    }
    /**
     * Checks if the video player is currently paused.
     *
     * @returns {boolean} True if the player is paused, false otherwise.
     */
    isPaused() {
        return this.player.paused;
    }
    /**
     * Checks if the video player is currently playing.
     *
     * @returns {boolean} True if the video is playing, false if it is paused.
     */
    isPlaying() {
        return !this.player.paused;
    }
    /**
     * Checks if the video has ended.
     *
     * @returns {boolean} True if the video has ended, otherwise false.
     */
    isEnded() {
        return this.player.ended;
    }
    /**
     * Calculates the aspect ratio of the video.
     * If the video is wider than a 16:9 ratio, it returns the actual video ratio.
     * Otherwise, it returns the 16:9 ratio.
     *
     * @returns {number} The aspect ratio of the video.
     */
    ratio() {
        // If wide video, use that ratio; otherwise, 16:9
        return this.player.videoWidth / this.player.videoHeight;
    }
    /**
     * Destroys the HTML5 video player instance.
     *
     * This method pauses the video, removes the source attribute, and reloads the player.
     * It is used to clean up the player instance and release any resources it may be holding.
     */
    destroy() {
        this.player.pause();
        this.player.removeAttribute('src');
        this.player.load();
    }
    /**
     * Retrieves the current state of the video player.
     *
     * @returns {string} - Returns 'paused' if the player is paused, otherwise 'playing'.
     */
    getState() {
        return this.player.paused ? 'paused' : 'playing';
    }
    /**
     * Sets the playback rate of the video player.
     *
     * @param {number} rate - The desired playback rate. A value of 1.0 represents normal speed.
     */
    setRate(rate) {
        this.player.playbackRate = rate;
    }
    /**
     * Mutes the HTML5 video player.
     */
    mute() {
        this.player.muted = true;
    }
    /**
     * Unmutes the video player.
     */
    unMute() {
        this.player.muted = false;
    }
    /**
     * Returns the original video player instance.
     *
     * @returns {Object} The video player instance.
     */
    originalPlayer() {
        return this.player;
    }
    /**
     * Sets the video quality.
     *
     * Note: This functionality is not supported.
     *
     * @param {string} quality - The desired quality setting.
     * @returns {string} The quality setting that was passed in.
     */
    setQuality(quality) {
        return quality;
    }
}

export default Html5Video;