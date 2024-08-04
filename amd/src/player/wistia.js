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
 * Doc: https://docs.wistia.com/docs/javascript-player-api
 *
 * @module     mod_interactivevideo/player/wistia
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import {dispatchEvent} from 'core/event_dispatcher';
let player;

class Wistia {
    constructor(url, start, end, showControls) {
        this.type = 'wistia';
        this.start = start;
        this.frequency = 0.3;
        this.support = {
            playbackrate: true,
            quality: true,
        };
        var regex = /(?:https?:\/\/)?(?:www\.)?(?:wistia\.com)\/medias\/([^\/]+)/g;
        var match = regex.exec(url);
        var videoId = match[1];
        this.videoId = videoId;
        $("#player").html(`<div class="wistia_embed wistia_async_${videoId} wmode=transparent
             controlsVisibleOnLoad=${showControls} playButton=${showControls} videoFoam=false
              fullscreenButton=false volume=0" style="height:100%;width:100%"></div>`);
        var self = this;
        $.get('https://fast.wistia.com/oembed.json?url=' + url)
            .then(function(data) {
                self.posterImage = data.thumbnail_url;
            });
        var ready = false;
        var wistiaOptions = {
            id: videoId,
            onReady: function(video) {
                player = video;
                end = !end ? video.duration() : Math.min(end, video.duration());
                if (start > 0) {
                    video.play();
                    video.time(start);
                    video.pause();
                    video.on("pause", () => {
                        if (!ready) {
                            ready = true;
                            dispatchEvent('iv:playerReady');
                        }
                    });

                } else {
                    ready = true;
                    dispatchEvent('iv:playerReady');
                }
                video.volume(1);

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
                    dispatchEvent('iv:playerSeek', {time: e});
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
                    if (!ready) {
                        return;
                    }
                    if (s > end) {
                        dispatchEvent('iv:playerEnded');
                        video.time(start);
                        video.pause();
                    }
                });

                video.on("error", (e) => {
                    dispatchEvent('iv:playerError', {error: e});
                });

                video.on("playbackratechange", (e) => {
                    dispatchEvent('iv:playerRateChange', {rate: e});
                });

            },
            onError: function(e) {
                dispatchEvent('iv:playerError', {error: e});
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
        player.time(time);
        dispatchEvent('iv:playerSeek', {time: time});
        return time;
    }
    getCurrentTime() {
        return player.time();
    }
    getDuration() {
        return player.duration();
    }
    isPaused() {
        return player.state() === 'paused';
    }
    isPlaying() {
        return player.state() === 'playing';
    }
    isEnded() {
        return player.state() === 'ended';
    }
    ratio() {
        if (player.aspect() > 16 / 9) {
            return player.aspect();
        } else {
            return 16 / 9;
        }
    }
    destroy() {
        player.remove();
    }
    getState() {
        return player.state();
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
        player.videoQuality(quality);
        dispatchEvent('iv:playerQualityChange', {quality: quality});
        return quality;
    }
    getQualities() {
        return {
            qualities: ['auto', '360', '540', '720', '1080', '2160'],
            qualitiesLabel: ['Auto', '360p', '540p', '720p', '1080p', '4k'],
            currentQuality: player.videoQuality() == 'auto' ? 0 : player.videoQuality(),
        };
    }
}

export default Wistia;