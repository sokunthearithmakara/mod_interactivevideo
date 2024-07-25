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
 * Wistia Player class
 *
 * @module     mod_interactivevideo/player/wistia
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import { dispatchEvent } from 'core/event_dispatcher';
let player;

class Wistia {
    constructor(url, start, end, showControls) {
        this.type = 'wistia';
        this.start = start;
        this.frequency = 0.3;
        var regex = /(?:https?:\/\/)?(?:www\.)?(?:wistia\.com)\/medias\/([^\/]+)/g;
        var match = regex.exec(url);
        var videoId = match[1];
        this.videoId = videoId;
        var playerIframe = `<iframe id="player" src="https://fast.wistia.net/embed/iframe/${videoId}?`;
        playerIframe += `seo=false&videoFoam=false&controlsVisibleOnLoad=${showControls}`;
        playerIframe += `&playButton=${showControls}&time=${start}&autoPlay=false&efullscreenButton=false" `;
        playerIframe += `allow="autoplay;" allowtransparency="true" frameborder="0" scrolling="no"`;
        playerIframe += `class="wistia_embed" name="wistia_embed" msallowfullscreen></iframe>`;
        $("#player").replaceWith(playerIframe);
        var self = this;
        $.get('https://fast.wistia.com/oembed.json?url=' + url)
            .then(function (data) {
                self.posterImage = data.thumbnail_url;
            });
        var ready = false;
        var wistiaOptions = {
            id: videoId,
            options: {
                autoPlay: false,
                time: start,
                fullscreenButton: false,
                controlsVisibleOnLoad: showControls,
                playButton: showControls,
                playerColor: "#54bbff",
                wmode: "transparent",
            },
            onReady: function (video) {
                player = video;
                end = !end ? video.duration() : Math.min(end, video.duration());

                var interval = setInterval(() => {
                    if (video.state() === 'paused') {
                        ready = true;
                        dispatchEvent('iv:playerReady');
                        clearInterval(interval);
                    }
                }, 1000);

                video.on("pause", () => {
                    if (!ready) {
                        return;
                    }
                    dispatchEvent('iv:playerPaused');
                });

                video.on("seek", (e) => {
                    if (!ready) {
                        return;
                    }
                    dispatchEvent('iv:playerSeek', { time: e });
                });

                video.bind('play', () => {
                    if (!ready) {
                        return;
                    }
                    dispatchEvent('iv:playerPlaying');
                    if (video.time() > end) {
                        dispatchEvent('iv:playerEnded');
                        video.time(start);
                        video.pause();
                    }
                });

                video.on('timechange', (s) => {
                    if (s > end || s < start) {
                        dispatchEvent('iv:playerEnded');
                        video.time(start);
                        video.pause();
                    }
                    video.unmute();
                });

                video.on("error", (e) => {
                    dispatchEvent('iv:playerError', { error: e });
                });
            },
            onError: function (e) {
                dispatchEvent('iv:playerError', { error: e });
            }
        };

        if (!window._wq) {
            // Add wistia script
            var tag = document.createElement('script');
            tag.src = "https://fast.wistia.com/assets/external/E-v1.js";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            var interval = setInterval(() => {
                if (window._wq) {
                    clearInterval(interval);
                    window._wq.push(wistiaOptions);
                }
            }, 1000);
        } else {
            window._wq.push(wistiaOptions);
        }
    }
    play() {
        player.play();
    }
    pause() {
        player.pause();
    }
    stop(starttime) {
        player.pause();
        player.time(starttime);
    }
    seek(time) {
        return new Promise((resolve) => {
            player.time(time);
            resolve();
        });
    }
    getCurrentTime() {
        return new Promise((resolve) => {
            resolve(player.time());
        });
    }
    getDuration() {
        return new Promise((resolve) => {
            resolve(player.duration());
        });
    }
    isPaused() {
        return new Promise((resolve) => {
            resolve(player.state() === 'paused');
        });
    }
    isPlaying() {
        return new Promise((resolve) => {
            resolve(player.state() === 'playing');
        });
    }
    isEnded() {
        return Promise.resolve(player.state() === 'ended');
    }
    ratio() {
        return new Promise((resolve) => {
            // If wide video, use that ratio; otherwise, 16:9
            if (player.aspect() > 16 / 9) {
                resolve(player.aspect());
            } else {
                resolve(16 / 9);
            }
        });
    }
    destroy() {
        player.remove();
    }
    getState() {
        return new Promise((resolve) => {
            resolve(player.state());
        });
    }
    setRate(rate) {
        player.playbackRate(rate);
    }
    mute() {
        player.mute();
    }
    unMute() {
        player.unmute();
    }
    originalPlayer() {
        return player;
    }
    setQuality(quality) {
        player.setQuality(quality);
        return quality;
    }
}

export default Wistia;