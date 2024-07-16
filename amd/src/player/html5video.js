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
import { dispatchEvent } from 'core/event_dispatcher';
import $ from 'jquery';

class Html5Video {
    constructor(url, start, end, showControls) {
        this.type = "html5video";
        this.start = start;
        this.end = end;
        this.frequency = 0.28;
        var player = document.getElementById('player');
        player.src = url;
        player.controls = true;
        player.autoplay = false;
        player.preload = 'metadata';
        player.currentTime = start;
        // Disable keyboard controls.
        player.tabIndex = -1;
        this.posterImage = player.poster;

        if (!showControls) {
            $('body').addClass('no-original-controls');
        }

        // Play inline.
        player.setAttribute('playsinline', '');

        player.addEventListener('loadedmetadata', function () {
            dispatchEvent('iv:playerReady');
            end = !end ? player.duration : Math.min(end, player.duration);
        });

        player.addEventListener('seeked', function () {
            dispatchEvent('iv:playerSeek', { time: player.currentTime });
        });

        player.addEventListener('timeupdate', function () {
            if (player.ended || (end && player.currentTime >= end)) {
                dispatchEvent('iv:playerEnded');
                player.pause();
            } else if (player.paused) {
                dispatchEvent('iv:playerPaused');
            } else if (!player.paused) {
                dispatchEvent('iv:playerPlaying');
            }
        });

        player.addEventListener('error', function (e) {
            dispatchEvent('iv:playerError', { error: e });
        });

        this.player = player;
    }
    play() {
        this.player.play();
    }
    pause() {
        this.player.pause();
    }
    stop(starttime) {
        this.player.pause();
        this.player.currentTime = starttime;
    }
    seek(time) {
        this.player.currentTime = time;
        return Promise.resolve();
    }
    getCurrentTime() {
        return Promise.resolve(this.player.currentTime);
    }
    getDuration() {
        return Promise.resolve(this.player.duration);
    }
    isPaused() {
        return Promise.resolve(this.player.paused);
    }
    isPlaying() {
        return Promise.resolve(!this.player.paused);
    }
    isEnded() {
        return Promise.resolve(this.player.ended);
    }
    ratio() {
        // If wide video, use that ratio; otherwise, 16:9
        if (this.player.videoWidth / this.player.videoHeight > 16 / 9) {
            return Promise.resolve(this.player.videoWidth / this.player.videoHeight);
        } else {
            return Promise.resolve(16 / 9);
        }
    }
    destroy() {
        this.player.pause();
        this.player.removeAttribute('src');
        this.player.load();
    }
    getState() {
        return Promise.resolve(this.player.paused ? 'paused' : 'playing');
    }
    setRate(rate) {
        this.player.playbackRate = rate;
    }
    mute() {
        this.player.muted = true;
    }
    unMute() {
        this.player.muted = false;
    }
    originalPlayer() {
        return this.player;
    }
}

export default Html5Video;