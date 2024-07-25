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
 * Vimeo Player class
 *
 * @module     mod_interactivevideo/player/vimeo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { dispatchEvent } from 'core/event_dispatcher';
let player;

class Vimeo {
    constructor(url, start, end, showControls) {
        this.type = 'vimeo';
        this.start = start;
        this.frequency = 0.27;

        // Documented at https://developer.vimeo.com/player/sdk/reference
        var VimeoPlayer;
        var regex = /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com)\/(?:video\/|)([^\/]+)/g;
        this.videoId = regex.exec(url)[1];
        // Get poster image using oEmbed
        var posterUrl = 'https://vimeo.com/api/oembed.json?url=https%3A//vimeo.com/' + this.videoId;
        var self = this;
        fetch(posterUrl)
            .then(response => response.json())
            .then(data => {
                var poster = data.thumbnail_url;
                // Change the dimensions of the poster image to 16:9
                poster = poster.replace(/_\d+x\d+/, '_720x405');
                self.posterImage = poster;
            });

        var option = {
            url: url,
            width: 1080,
            height: 720,
            autoplay: false,
            quality: showControls ? '540p' : 'auto', // Reduce quality in editor
            controls: showControls,
            loop: false,
            muted: false,
            playsinline: true,
            background: false,
            byline: false,
            portrait: false,
            title: false,
            speed: false,
            transparent: false,
            responsive: false,
            start_time: start,
            end_time: end,
            pip: false,
            fullscreen: false,
            watch_full_video: false,
            play_button_position: 'bottom',
            keyboard: false,
        };

        const vimeoEvents = (player) => {
            player.on('error', function (e) {
                dispatchEvent('iv:playerError', { error: e });
            });

            player.on('loaded', function () {
                player.getDuration().then(function (duration) {
                    end = !end ? duration : Math.min(end, duration);
                });
                dispatchEvent('iv:playerReady');
            });

            player.on('timeupdate', async function () {
                let isEnded = await player.getEnded();
                let currentTime = await player.getCurrentTime();
                if (isEnded || (end && currentTime >= end)) {
                    dispatchEvent('iv:playerEnded');
                    player.pause();
                } else if (await player.getPaused()) {
                    dispatchEvent('iv:playerPaused');
                } else {
                    dispatchEvent('iv:playerPlaying');
                }
            });

            player.on('seeked', function (e) {
                dispatchEvent('iv:playerSeek', { time: e.seconds });
            });
        };
        if (!VimeoPlayer) {
            require(['https://player.vimeo.com/api/player.js'], function (Player) {
                VimeoPlayer = Player;
                player = new Player('player', option);
                vimeoEvents(player);
            });
        } else {
            player = new VimeoPlayer('player', option);
            vimeoEvents(player);
        }
    }
    play() {
        player.play();
    }
    pause() {
        player.pause();
    }
    stop(starttime) {
        player.setCurrentTime(starttime);
        player.pause();
    }
    seek(time) {
        return new Promise((resolve) => {
            player.setCurrentTime(time);
            resolve();
        });
    }
    getCurrentTime() {
        return new Promise((resolve) => {
            player.getCurrentTime().then(function (time) {
                resolve(time);
            });
        });
    }
    getDuration() {
        return new Promise((resolve) => {
            player.getDuration().then(function (duration) {
                resolve(duration);
            });
        });
    }
    isPaused() {
        return new Promise((resolve) => {
            player.getPaused().then(function (paused) {
                resolve(paused);
            });
        });
    }
    isPlaying() {
        return new Promise((resolve) => {
            player.getPaused().then(function (paused) {
                resolve(!paused);
            });
        });
    }
    isEnded() {
        player.getEnded().then(function (ended) {
            return Promise.resolve(ended);
        });
    }
    ratio() {
        return new Promise((resolve) => {
            // If wide video, use that ratio; otherwise, 16:9
            player.getVideoWidth().then(function (width) {
                player.getVideoHeight().then(function (height) {
                    if (width / height > 16 / 9) {
                        resolve(width / height);
                    } else {
                        resolve(16 / 9);
                    }
                });
            });
        });
    }
    destroy() {
        player.destroy();
    }
    getState() {
        return new Promise((resolve) => {
            player.getPaused().then(function (paused) {
                resolve(paused ? 'paused' : 'playing');
            });
        });
    }
    setRate(rate) {
        player.setPlaybackRate(rate);
    }
    mute() {
        player.setVolume(0);
    }
    unMute() {
        player.setVolume(1);
    }
    originalPlayer() {
        return player;
    }
    setQuality(quality) {
        player.setQuality(quality);
        return quality;
    }
}

export default Vimeo;