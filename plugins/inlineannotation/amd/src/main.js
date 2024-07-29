
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
 * Main class for inlineannotation content type
 *
 * @module     ivplugin_inlineannotation/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Base from 'mod_interactivevideo/type/base';
import {dispatchEvent} from 'core/event_dispatcher';
import ModalForm from 'core_form/modalform';
import Templates from 'core/templates';
import {notifyFilterContentUpdated as notifyFilter} from 'core_filters/events';
export default class InlineAnnotation extends Base {
    postEditCallback() {
        // Do nothing
    }

    renderContainer(annotation) {
        const videoWrapper = $('#video-wrapper');
        videoWrapper.find('#message').remove();
        videoWrapper.append(`<div id="message" data-id="${annotation.id}"
             class="message text-white bg-transparent inlineannotation"></div>`);

        const updateAspectRatio = async (video, reset) => {
            let elem = video ? $('#player') : $(`#message[data-id='${annotation.id}']`);
            if ($("#wrapper").hasClass('fullscreen')) {
                let ratio = await this.player.ratio();
                let videowrapperaspect = videoWrapper.width() / videoWrapper.height();
                let gap = '- 55px';
                if ($("#wrapper").hasClass('no-videonav')) {
                    gap = '';
                }
                if (videowrapperaspect > ratio) {
                    elem.css('height', `calc(100vh ${gap})`);
                    elem.css('width', `calc((100vh ${gap}) * ${ratio})`);
                    elem.css('top', '0');
                    elem.css('left', `calc((100vw - (100vh ${gap}) * ${ratio}) / 2)`);
                } else if (videowrapperaspect < ratio) {
                    elem.css('width', '100vw');
                    elem.css('height', `${100 / ratio}vw`);
                    elem.css('top', `calc((100vh ${gap} - 100vw / ${ratio}) / 2)`);
                    elem.css('left', '0');
                }
            } else {
                elem.css('width', '100%');
                elem.css('height', '100%');
                elem.css('top', '0');
                elem.css('left', '0');
            }
            if (reset) {
                elem.css('width', '100%');
                elem.css('height', '100%');
                elem.css('top', '0');
                elem.css('left', '0');
            }
        };

        updateAspectRatio();
        updateAspectRatio(true);

        let vwrapper = document.querySelector('#video-wrapper');
        let resizeObserver = new ResizeObserver(() => {
            updateAspectRatio();
            updateAspectRatio(true);
        });

        resizeObserver.observe(vwrapper);

        $(document).on('timeupdate', function() {
            updateAspectRatio(true, true);
        });
    }

    postContentRender(annotation, data) {
        let self = this;
        var $videoWrapper = $('#video-wrapper');
        var $playerWrapper = $('#wrapper');
        const convertSecondsToMMSS = (seconds) => {
            let minutes = Math.floor(seconds / 60);
            seconds = Math.round(seconds - minutes * 60);
            return (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
        };

        const updatePositionInfo = (elem) => {
            let w = parseFloat(elem.outerWidth());
            let hw = parseFloat(elem.outerHeight());
            let t = parseFloat(elem.position().top) < 0 ? 0 : parseFloat(elem.position().top);
            let l = parseFloat(elem.position().left) < 0 ? 0 : parseFloat(elem.position().left);
            let z = elem.css('z-index');
            $(`#player-region #inlineannotation-btns #position`)
                .text(`x: ${Math.round(l)}, y: ${Math.round(t)}, z: ${z - 5}, w: ${Math.round(w)}, h: ${Math.round(hw)}`);
        };

        const recalculatingSize = (elem) => {
            let message = $videoWrapper.find(`#message`);
            $(`#player-region #inlineannotation-btns #down, #player-region #inlineannotation-btns #up`).removeAttr('disabled');
            let w = parseFloat(elem.outerWidth()) / parseFloat(message.width()) * 100;
            let h = parseFloat(elem.outerHeight()) / parseFloat(message.height()) * 100;
            if (elem.position().right < 0) {
                elem.css('right', '0');
            }
            if (elem.position().bottom < 0) {
                elem.css('bottom', '0');
            }
            let t = parseFloat(elem.position().top) / parseFloat(message.height()) * 100 < 0 ? 0
                : parseFloat(elem.position().top) / parseFloat(message.height()) * 100;
            let l = parseFloat(elem.position().left) / parseFloat(message.width()) * 100 < 0 ? 0
                : parseFloat(elem.position().left) / parseFloat(message.width()) * 100;
            let z = elem.css('z-index');
            let position = {
                'width': w + '%',
                'height': h + '%',
                'left': l + '%',
                'top': t + '%',
                'z-index': z,
            };
            elem.css(position);
            if (z == 6) {
                $(`#player-region #inlineannotation-btns #down`).attr('disabled', 'disabled');
            }
            updatePositionInfo(elem);
            if (elem.data('type') == 'video') {
                // Update size of the playpause button
                elem.find('.playpause').css({
                    'font-size': elem.outerHeight() * 0.2 + 'px',
                    'line-height': elem.outerHeight() * 0.2 + 'px',
                });
            }
            return position;
        };

        const recalculatingTextSize = (elem, button) => {
            let fontSize = elem.outerHeight();
            elem.find('.annotation-content').css({
                'font-size': (button ? fontSize * 0.7 : fontSize * 0.9) + 'px',
                'line-height': fontSize + 'px',
                'padding-left': (button ? 0.4 : 0.1) + 'em',
                'padding-right': (button ? 0.4 : 0.1) + 'em',
            });

            elem.css('width', 'auto');
        };

        const renderItems = (elements, active, update) => {
            if (!update) { // Clear the canvas if it is a new start.
                $videoWrapper.find(`#message`).empty();
            }
            elements.forEach((item) => {
                let prop = item.properties;
                let type = item.type;
                let id = item.id;
                let position = item.position;
                let wrapper = $(`<div class="annotation-wrapper"
                     data-anno="${annotation.id}" data-item="${id}" data-type="${type}"
                      data-property='${JSON.stringify(prop)}'></div>`);
                if (prop.resizable == '1' || self.isEditMode()) {
                    wrapper.addClass('resizable');
                    wrapper.attr('tabindex', 0);
                }
                switch (type) {
                    case 'image':
                        var parts = prop.timestamp.split(':');
                        var timestamp = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
                        if (prop.gotourl != '') {
                            wrapper.append(`<a href="${prop.gotourl}" target="_blank"><img src="${prop.url}" id="${id}"
                             class="annotation-content ${prop.rounded == 1 ? 'rounded' : 'rounded-0'} w-100
                              ${prop.shadow == '1' ? 'shadow' : ''}" alt="${prop.formattedalttext}"/></a>`);
                        } else {
                            wrapper.append(`<img src="${prop.url}" id="${id}"
                                 ${timestamp > 0 ? 'data-timestamp="' + timestamp + '"' : ''} class="annotation-content
                                 ${prop.rounded == 1 ? 'rounded' : 'rounded-0'} w-100 ${prop.shadow == '1' ? 'shadow' : ''}
                                  ${timestamp > 0 ? 'cursor-pointer' : ''}" alt="${prop.formattedalttext}"/>`);
                        }
                        if ((prop.gototurl != '' || timestamp > 0) && !self.isEditMode()) {
                            wrapper.removeClass('resizable');
                        }
                        wrapper.css(position);
                        wrapper.css('height', 'auto');
                        $videoWrapper.find(`#message`).append(wrapper);
                        break;

                    case 'video':
                        wrapper.append(`<video id="${id}" class="annotation-content ${prop.rounded == 1 ? 'rounded' : 'rounded-0'}
                             w-100 ${prop.shadow == '1' ? 'shadow' : ''}" preload="metadata" src="${prop.url}"
                              disablePictureInPicture/>
                        </video><i class="playpause bi bi-play-fill shadow position-absolute" style="font-size: unset"></i>`);
                        var video = wrapper.find('video')[0];
                        video.autoplay = prop.autoplay == '1';
                        video.playsInline = true;
                        if (self.isEditMode()) {
                            video.autoplay = false;
                        }
                        video.onplay = function() {
                            wrapper.find('.playpause').removeClass('bi-play-fill').addClass('bi-pause-fill');
                        };
                        video.onpause = function() {
                            wrapper.find('.playpause').removeClass('bi-pause-fill').addClass('bi-play-fill');
                        };
                        video.onended = function() {
                            wrapper.find('.playpause').removeClass('bi-pause-fill').addClass('bi-play-fill');
                        };
                        wrapper.css(position);
                        $videoWrapper.find(`#message`).append(wrapper);
                        recalculatingSize(wrapper);
                        break;
                    case 'file':
                    case 'audio':
                        var wrapperhtml = ``;
                        if (type == 'audio') {
                            wrapperhtml = `<span id="${id}" tabindex="0"
                             class="btn ${prop.style} ${prop.rounded == '1' ? 'btn-rounded' : 'rounded-0'}
                              annotation-content text-nowrap ${prop.shadow == '1' ? 'shadow' : ''} rotatex-360"
                               data-src="${prop.url}"><i class="bi bi-volume-up" style="font-size:0.7em;margin-right:0.25em;"></i>
                               <span class="timeremaining">00:00</span></span>`;
                        } else if (type == 'file') {
                            wrapperhtml = `<a id="${id}"
                             class="btn ${prop.style} ${prop.rounded == '1' ? 'btn-rounded' : 'rounded-0'}
                             annotation-content text-nowrap ${prop.shadow == '1' ? 'shadow' : ''} rotatey-180" href="${prop.url}"
                              target="_blank"><i class="bi bi-paperclip"
                               style="font-size:0.7em;"></i>${prop.formattedlabel != "" ?
                                    `<span style="margin-left:0.25em;">${prop.formattedlabel}` : ''}</a>`;
                        }
                        wrapper.append(`<div class="d-flex h-100">${wrapperhtml}</div>`);

                        if (type == 'audio' && !self.isEditMode()) {
                            let playButton = wrapper.find('.annotation-content');
                            let audioSrc = prop.url;
                            let media = new Audio(audioSrc);
                            playButton.on('click', function(e) {
                                e.stopImmediatePropagation();
                                if (media.paused || media.ended || media.currentTime === 0) {
                                    media.play();
                                    $(this).find('i').removeClass('bi-volume-up').addClass('bi-pause-fill');
                                } else {
                                    media.pause();
                                    $(this).find('i').removeClass('bi-pause-fill').addClass('bi-volume-up');
                                }
                            });

                            let totaltime = 0;
                            media.onloadedmetadata = function() {
                                totaltime = media.duration;
                                playButton.find('span.timeremaining').text(convertSecondsToMMSS(totaltime));
                            };

                            media.onended = function() {
                                playButton.find('i').removeClass('bi-pause-fill').addClass('bi-volume-up');
                                playButton.find('span.timeremaining').text(convertSecondsToMMSS(totaltime));
                            };

                            media.ontimeupdate = function() {
                                playButton.find('span.timeremaining')
                                    .text(convertSecondsToMMSS(media.duration - media.currentTime));
                            };

                            if (prop.autoplay == '1') {
                                setTimeout(() => {
                                    playButton.trigger('click');
                                }, 100);
                            }

                            $(document).on('iv:playerSeek iv:playerPlaying', function() {
                                if (media) {
                                    media.pause();
                                }
                            });
                        }

                        position.width = 0;

                        wrapper.css(position);
                        $videoWrapper.find(`#message`).append(wrapper);
                        recalculatingTextSize(wrapper, true);

                        break;

                    case 'navigation':
                        var parts = prop.timestamp.split(':');
                        var timestamp = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);

                        wrapper.append(`<div class="d-flex h-100"><span id="${id}" tabindex="0"
                             class="btn ${prop.style} ${prop.rounded == '1' ? 'btn-rounded' : 'rounded-0'}
                              annotation-content text-nowrap ${prop.shadow == '1' ? 'shadow' : ''}"
                               data-timestamp="${timestamp}">${prop.formattedlabel}</span></div>`);

                        position.width = 0;

                        wrapper.css(position);
                        $videoWrapper.find(`#message`).append(wrapper);
                        recalculatingTextSize(wrapper, true);
                        break;

                    case 'stopwatch':
                        var duration = Number(prop.duration) * 60;
                        wrapper.append(`<div class="d-flex h-100"><span id="${id}" tabindex="0"
                             class="btn ${prop.style} ${prop.rounded == '1' ? 'btn-rounded' : 'rounded-0'}
                              annotation-content text-nowrap ${prop.shadow == '1' ? 'shadow' : ''} rotatey-180"
                               data-duration="${duration}">
                               <i class="bi bi bi-stopwatch" style="font-size:0.7em;margin-right:0.25em;"></i>
                               <span>${convertSecondsToMMSS(duration)}</span></span></div>`);

                        var timer, alarm;
                        if (timer) {
                            clearInterval(timer);
                        }
                        var intervalfunction = function() {
                            timer = setInterval(() => {
                                $(`.annotation-content#${id}`).addClass('running');
                                let time = $(`.annotation-content#${id}`).data('duration');
                                time--;
                                $(`.annotation-content#${id} span`).text(convertSecondsToMMSS(time));
                                $(`.annotation-content#${id}`).data('duration', time);
                                if (prop.playalarmsound.playsoundatinterval == '1'
                                    && time % (prop.playalarmsound.intervaltime * 60) == 0) {
                                    if (prop.playalarmsound.playsoundatend == 1) {
                                        alarm = new Audio(M.cfg.wwwroot + '/mod/interactivevideo/sounds/short-alarm.mp3');
                                        alarm.play();
                                    }
                                }
                                if (time < 0) {
                                    clearInterval(timer);
                                    if (prop.playalarmsound.playsoundatend == 1) {
                                        alarm = new Audio(M.cfg.wwwroot + '/mod/interactivevideo/sounds/alarm.mp3');
                                        alarm.play();
                                        alarm.onplay = function() {
                                            $(`.annotation-content#${id}`).addClass('pulse');
                                        };
                                        alarm.onended = function() {
                                            $(`.annotation-content#${id}`).removeClass('pulse');
                                        };
                                    }
                                    $(`.annotation-content#${id}`).removeClass('running');
                                    $(`.annotation-content#${id} span`).text(convertSecondsToMMSS(duration));
                                    $(`.annotation-content#${id}`).data('duration', duration);
                                }
                            }, 1000);
                        };

                        if (!self.isEditMode()) {
                            intervalfunction();
                            $videoWrapper.on('click', `.annotation-content#${id}`, function(e) {
                                e.stopImmediatePropagation();
                                if (prop.allowpause == 1) {
                                    if ($(this).hasClass('running')) {
                                        clearInterval(timer);
                                        if (alarm) {
                                            alarm.pause();
                                        }
                                        $(this).removeClass('running');
                                    } else {
                                        intervalfunction();
                                    }
                                } else if ($(this).data('duration') == duration) {
                                    intervalfunction();
                                }
                            });
                        }

                        $(document).on('iv:playerSeek', function() {
                            clearInterval(timer);
                        });

                        position.width = 0;

                        wrapper.css(position);
                        $videoWrapper.find(`#message`).append(wrapper);
                        recalculatingTextSize(wrapper, true);

                        break;
                    case 'text':
                        if (prop.url != undefined && prop.url != '') {
                            wrapper.append(`<a id="${id}"
                                 class="annotation-content text-nowrap ${prop.shadow == '1' ? 'text-shadow' : ''} d-block"
                                  href="${prop.url}" target="_blank">${prop.formattedlabel}</a>`);
                        } else {
                            wrapper.append(`<div id="${id}"
                                 class="annotation-content text-nowrap ${prop.shadow == '1' ? 'text-shadow' : ''}
                                 ">${prop.formattedlabel}</div>`);
                        }
                        wrapper.position.width = 0;
                        wrapper.css(position);
                        var style = {
                            'font-weight': prop.bold == '1' ? 'bold' : 'normal',
                            'font-style': prop.italic == '1' ? 'italic' : 'normal',
                            'text-decoration': prop.underline == '1' ? 'underline' : 'none',
                            'color': prop.textcolor,
                            'background': prop.bgcolor,
                            'border-width': prop.borderwidth,
                            'border-color': prop.bordercolor,
                            'border-style': 'solid',
                            'font-family': prop.textfont != '' ? prop.textfont : 'inherit',
                        };
                        wrapper.find('.annotation-content').css(style);
                        $videoWrapper.find(`#message`).append(wrapper);
                        recalculatingTextSize(wrapper);
                        break;

                    case 'shape':
                        var parts = prop.timestamp.split(':');
                        var timestamp = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
                        if (prop.gotourl != '') {
                            wrapper.append(`<a href="${prop.gotourl}" target="_blank"><div id="${id}"
                             class="annotation-content ${prop.shadow == '1' ? 'shadow' : ''}"
                              style="width: 100%; height: 100%;"></div></a>`);
                        } else {
                            wrapper.append(`<div id="${id}" class="annotation-content ${prop.shadow == '1' ? 'shadow' : ''}
                                 ${timestamp > 0 ? 'cursor-pointer' : ''}"
                             ${timestamp > 0 ? 'data-timestamp="' + timestamp + '"' : ''}
                             style="width: 100%; height: 100%;"></div>`);
                        }
                        wrapper.css(position);
                        var style = {
                            'background': prop.bgcolor,
                            'border-width': prop.borderwidth,
                            'border-color': prop.bordercolor,
                            'border-style': 'solid',
                            'opacity': prop.opacity / 100,
                        };
                        if (prop.shape == 'circle') {
                            style['border-radius'] = '50%';
                        } else if (prop.shape == 'rectangle') {
                            style['border-radius'] = prop.rounded == '1' ? '10px' : '0';
                        }
                        wrapper.find('.annotation-content').css(style);
                        $videoWrapper.find(`#message`).append(wrapper);
                        break;

                    case 'hotspot':
                        wrapper.append(`<div id="${id}" class="annotation-content shadow-sm pulse" role="button"></div>`);
                        position['aspect-ratio'] = '1';
                        wrapper.css(position);
                        var style = {
                            'background-color': prop.color,
                            'opacity': prop.opacity / 100,
                            'border-radius': '50%',
                            'aspect-ratio': '1',
                        };
                        wrapper.find('.annotation-content').css(style);
                        $videoWrapper.find(`#message`).append(wrapper);

                        if (!self.isEditMode()) {
                            if (prop.usemodal == '1') {
                                wrapper.attr({
                                    'data-toggle': 'modal',
                                    'data-content': prop.content.text,
                                    'data-title': prop.formattedtitle,
                                    'data-link': prop.url,
                                });
                            } else {
                                wrapper.attr({
                                    'tabindex': -1,
                                    'data-trigger': 'manual',
                                    'data-boundary': 'viewport',
                                    'data-placement': 'auto',
                                    'data-html': 'true',
                                    'data-content': '<div class="loader"></div>',
                                    'data-title': prop.formattedtitle
                                        + `<i class="bi bi-x-circle-fill ml-auto popover-dismiss cursor-pointer"
                                         style="font-size:1.5em;"></i>`,
                                });

                                wrapper.popover({
                                    container: '#wrapper',
                                    html: true,
                                    template: `<div class="popover inlineannotation-popover id-${id}"
                                     role="tooltip"><div class="arrow"></div>
                                     <h3 class="popover-header d-flex justify-content-between"></h3>
                                     <div class="popover-body rounded"></div>${prop.url != '' ?
                                            `<div class="popup-footer bg-gray p-2 rounded-bottom"><a href="${prop.url}"
                                          class="d-block w-100 text-right rotatex-360" target="_blank">
                                          <i class="bi bi-arrow-right"><i></i></i></a></div>` : ''}</div>`,
                                });

                                wrapper.on('shown.bs.popover', function() {
                                    let $body = $(`.popover.id-${id} .popover-body`);
                                    self.formatContent(prop.content.text, M.cfg.contextid).then((html) => {
                                        $body.html(html);
                                        notifyFilter($body);
                                        wrapper.popover('update');
                                    });
                                });
                                if (prop.openbydefault == '1') {
                                    wrapper.popover('show');
                                }
                            }
                        }
                        break;
                }

                if (self.isEditMode() || prop.resizable == '1') {
                    wrapper.draggable({
                        containment: "#message",
                        cursor: "move",
                        handle: '.annotation-content',
                        stop: function() {
                            recalculatingSize($(this));
                            $(this).trigger('click');
                        },
                        drag: function() {
                            updatePositionInfo($(this));
                        }
                    });

                    wrapper.resizable({
                        containment: "#message",
                        handles: "all",
                        start: function(event) {
                            // If shape and ctrl key is pressed, keep the aspect ratio 1:1
                            if (type == 'shape' && event.ctrlKey) {
                                $(this).resizable('option', 'aspectRatio', 1);
                            }
                        },
                        stop: function() {
                            if (type == 'text'
                                || type == 'audio' || type == 'stopwatch' || type == 'file' || type == 'navigation') {
                                recalculatingTextSize($(this), type != 'text');
                            } else if (type == 'shape') {
                                $(this).resizable('option', 'aspectRatio', false);
                            }

                            recalculatingSize($(this));
                            $(this).trigger('click');
                        },
                        resize: function(event) {
                            if (type == 'text'
                                || type == 'audio' || type == 'stopwatch' || type == 'file' || type == 'navigation') {
                                recalculatingTextSize($(this), type != 'text');
                            } else if (type == 'shape' && event.ctrlKey) {
                                $(this).resizable('option', 'aspectRatio', 1);
                            }
                            updatePositionInfo($(this));
                        }
                    });
                }

                if (type != 'shape') {
                    wrapper.on('mouseover', function() {
                        if (!$(this).hasClass('resizable')) {
                            return;
                        }

                        let aspectRatio =
                            $(this).find('.annotation-content').width() / $(this).find('.annotation-content').height();
                        if (wrapper.width() / wrapper.height() != aspectRatio && (type == 'image' || type == 'video')) {
                            $(this).height((wrapper.width() / aspectRatio));
                        }
                        $(this).resizable('option', 'aspectRatio', $(this).find('.annotation-content').outerWidth() /
                            $(this).find('.annotation-content').outerHeight());
                    });
                }

                if (id == active) {
                    wrapper.trigger('click');
                }

            });

            // Handle behavior for each item
            if (!self.isEditMode()) {
                $videoWrapper.on('click', `.annotation-wrapper`, function(e) {
                    e.stopImmediatePropagation();
                    let wrapper = $(this);
                    let type = wrapper.data('type');
                    switch (type) {
                        case 'video':
                            var video = wrapper.find('video')[0];
                            if (video.paused || video.ended || video.currentTime === 0) {
                                video.play();
                            } else {
                                video.pause();
                            }
                            break;
                        case 'navigation':
                        case 'image':
                        case 'shape':
                            var navigation = wrapper.find('.annotation-content');
                            if (navigation.data('timestamp') && self.isBetweenStartAndEnd(navigation.data('timestamp'))) {
                                self.player.seek(navigation.data('timestamp'));
                                self.player.play();
                            }
                            break;
                        case 'hotspot':
                            var viewertype = wrapper.data('toggle');
                            if (viewertype == 'modal') {
                                let title = wrapper.data('title');
                                let content = wrapper.data('content');
                                let url = wrapper.data('link');
                                let modal = `<div class="modal fade" id="annotation-modal" role="dialog"
                                aria-labelledby="annotation-modal"
                             aria-hidden="true" data-backdrop="static" data-keyboard="false">
                             <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
                                <div class="modal-content rounded-lg">
                                    <div class="modal-header d-flex align-items-center shadow-sm pr-0" id="title">
                                        <h5 class="modal-title text-truncate mb-0">${title}</h5>
                                        <button class="btn mx-2 p-0 close" aria-label="Close" data-dismiss="modal">
                                            <i class="bi bi-x-lg fa-fw" style="font-size: x-large;"></i>
                                        </button>
                                    </div>
                                    <div class="modal-body" id="content">
                                    <div class="loader"></div>
                                    </div>
                                    ${url != '' ? `<div class="modal-footer bg-gray p-2 rounded-bottom">
                                        <a href="${url}" class="d-block w-100 text-right rotatex-360" target="_blank">
                                        <i class="bi bi-arrow-right"><i></i></i></a></div>` : ''}
                                    </div>
                                </div>
                                </div>`;
                                $('#wrapper').append(modal);
                                $('#annotation-modal').modal('show');
                                $('#annotation-modal').on('hide.bs.modal', function() {
                                    $('#annotation-modal').remove();
                                });
                                $('#annotation-modal').on('shown.bs.modal', async function() {
                                    $('#annotation-modal .modal-body').fadeIn(300);
                                    let $body = $('#annotation-modal .modal-body');
                                    const html = await self.formatContent(content, M.cfg.contextid);
                                    $body.html(html);
                                    notifyFilter($body);
                                });
                            } else {
                                wrapper.popover('show');
                            }
                            break;
                    }
                });

                $playerWrapper.on('click', `.popover-dismiss`, function(e) {
                    e.stopImmediatePropagation();
                    $(this).closest('.popover').remove();
                });
            }

        };

        // Check resize on video wrapper resize
        let vwrapper = document.querySelector('#video-wrapper');

        let resizeObserver = new ResizeObserver(() => {
            let existingwrapper = $(`#video-wrapper`).find(`.annotation-wrapper`);
            if (existingwrapper.length == 0) {
                return;
            }
            existingwrapper.each(function() {
                let type = $(this).data('type');
                if (type == 'text' || type == 'audio' || type == 'stopwatch' || type == 'file' || type == 'navigation') {
                    recalculatingTextSize($(this), type != 'text');
                } else if (type == 'video') {
                    recalculatingSize($(this));
                }
            });
        });

        resizeObserver.observe(vwrapper);
        let items = [];
        if (data.items != '' && data.items !== null) {
            items = JSON.parse(data.items);
        }
        let draftitemid = data.draftitemid;

        renderItems(items, null, false);

        // Render the inline annotation toolbar
        if (this.isEditMode()) {
            $('#inlineannotation-btns').remove();
            let inlineannotationitems = [
                {
                    'icon': 'bi bi-image',
                    'type': 'media',
                    'mediatype': 'image',
                    'label': M.util.get_string('image', 'ivplugin_inlineannotation'),
                },
                {
                    'icon': 'bi bi-film',
                    'type': 'media',
                    'mediatype': 'video',
                    'label': M.util.get_string('video', 'ivplugin_inlineannotation'),
                },
                {
                    'icon': 'bi bi-volume-up',
                    'type': 'media',
                    'mediatype': 'audio',
                    'label': M.util.get_string('audio', 'ivplugin_inlineannotation'),
                },
                {
                    'icon': 'bi bi-alphabet-uppercase',
                    'type': 'text',
                    'mediatype': 'text',
                    'label': M.util.get_string('text', 'ivplugin_inlineannotation'),
                },
                {
                    'icon': 'bi bi-circle-square',
                    'type': 'shape',
                    'mediatype': 'shape',
                    'label': M.util.get_string('shape', 'ivplugin_inlineannotation'),
                },
                {
                    'icon': 'bi bi-stopwatch',
                    'type': 'stopwatch',
                    'mediatype': 'stopwatch',
                    'label': M.util.get_string('stopwatch', 'ivplugin_inlineannotation'),
                },
                {
                    'icon': 'bi bi-file-earmark-arrow-down',
                    'type': 'media',
                    'mediatype': 'file',
                    'label': M.util.get_string('inlinefile', 'ivplugin_inlineannotation'),
                },
                {
                    'icon': 'bi bi-sign-turn-right',
                    'type': 'navigation',
                    'mediatype': 'navigation',
                    'label': M.util.get_string('navigation', 'ivplugin_inlineannotation')
                },
                {
                    'icon': 'bi bi-plus-circle',
                    'type': 'hotspot',
                    'mediatype': 'hotspot',
                    'label': M.util.get_string('hotspot', 'ivplugin_inlineannotation'),
                }
            ];
            const dataForTemplate = {
                id: annotation.id,
                items: inlineannotationitems,
            };

            Templates.render('ivplugin_inlineannotation/inlineannotation_toolbar', dataForTemplate).then((html) => {
               return $videoWrapper.before(html);
            }).catch(() => {
                // Do nothing.
            });

            self.enableColorPicker();
        }

        $(document).on('iv:playerSeek iv:playerPlaying', function(e) {
            let newTime = e.detail.time;
            if (Math.floor(newTime) != annotation.timestamp) {
                $(`#inlineannotation-btns`).remove();
                $('.inlineannotation-popover').remove();
                $videoWrapper.find(`#message`).remove();
            }
        });

        // End of view mode.
        if (!self.isEditMode()) {
            return;
        }

        const getItems = (updateid) => {
            items = [];
            $videoWrapper.find(`.annotation-wrapper`).each(function(index, element) {
                let item = {
                    "id": (updateid ? (new Date().getTime() + index) : $(element).data('item')),
                    "type": $(element).data('type'),
                    "position": recalculatingSize($(element)),
                    "properties": JSON.parse($(element).attr('data-property')),
                };
                items.push(item);
            });
        };

        $playerWrapper.on('click', `#inlineannotation-btns #save`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            getItems(true, true);
            // Encode html tags
            let cleanItems = JSON.stringify(items).replace(/</g, '&lt;').replace(/>/g, '&gt;');
            let updateId = $videoWrapper.find('#message').data('id');
            $.ajax({
                url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                method: "POST",
                dataType: "text",
                data: {
                    action: 'quickeditfield',
                    sesskey: M.cfg.sesskey,
                    id: updateId,
                    field: 'content',
                    contextid: M.cfg.contextid,
                    draftitemid: draftitemid,
                    value: cleanItems,
                    cmid: self.cmid,
                    token: self.token,
                },
                success: function(data) {
                    let updated = JSON.parse(data);
                    dispatchEvent('annotationupdated', {
                        annotation: updated,
                        action: 'edit',
                    });
                }
            });
        });

        $playerWrapper.on('click', `#inlineannotation-btns  #close`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $(`#inlineannotation-btns`).remove();
            $videoWrapper.find(`#message`).remove();
        });

        const handleFormData = (newItem, type, add) => {
            switch (type) {
                case 'audio':
                case 'file':
                    if (add) {
                        newItem.position.height = '40px';
                        newItem.position.width = '130px';
                    }
                    break;
                case 'navigation':
                case 'stopwatch':
                    if (add) {
                        newItem.position.height = '40px';
                        newItem.position.width = '130px';
                    }
                    break;
                case 'text':
                    newItem.width = '0';
                    break;
                case 'shape':
                    if (add) {
                        newItem.position.height = '100px';
                        newItem.position.width = '100px';
                    }
                    break;
                case 'video':
                case 'image':
                    newItem.position.height = 'auto';
                    break;
                case 'hotspot':
                    if (add) {
                        newItem.position.width = '5%';
                    }
                    break;
            }

            items.push(newItem);
            renderItems([newItem], newItem.id, true);
        };

        $playerWrapper.on('click', `#inlineannotation-btns  .add-ia`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let annoid = $videoWrapper.find(`#message`).data('id');
            let type = $(this).attr('data-mediatype');
            if (type == 'stopwatch' && items.find(x => x.type == 'stopwatch')) {
                self.addNotification(M.util.get_string('onlyonestopwatch', 'ivplugin_inlineannotation'), 'danger');
                return;
            }
            let iaform = new ModalForm({
                formClass: "ivplugin_inlineannotation\\items\\" + $(this).attr('data-type'),
                args: {
                    contextid: M.cfg.contextid,
                    id: 0,
                    type: type,
                    annotationid: annoid,
                },
                modalConfig: {
                    title: M.util.get_string('addinlineannotation', 'ivplugin_inlineannotation',
                        M.util.get_string(type, 'ivplugin_inlineannotation')),
                }
            });

            iaform.show();


            iaform.addEventListener(iaform.events.LOADED, () => {
                iaform.modal.modal.draggable({
                    handle: ".modal-header",
                });
                if (type == 'navigation' || type == 'image' || type == 'shape') {
                    $(document).on('change', '[name="timestamp"]', function(e) {
                        e.preventDefault();
                        let parts = $(this).val().split(':');
                        let timestamp = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
                        if (!self.isBetweenStartAndEnd(timestamp)) {
                            let message = M.util.get_string('timemustbebetweenstartandendtime', 'ivplugin_inlineannotation', {
                                "start": self.convertSecondsToHMS(self.start),
                                "end": self.convertSecondsToHMS(self.end),
                            });
                            self.addNotification(message);
                            $(this).val($(this).attr('data-initial-value'));
                            return;
                        }

                        // Make sure the timestamp is not in the skip segment.
                        if (self.isInSkipSegment(timestamp)) {
                            self.addNotification(M.util.get_string('interactionisbetweentheskipsegment',
                                'ivplugin_inlineannotation'));
                            $(this).val($(this).attr('data-initial-value'));
                            return;
                        }
                    });
                }
            });

            iaform.addEventListener(iaform.events.FORM_SUBMITTED, (e) => {
                getItems(false);
                let left = Math.random() * 100;
                let top = Math.random() * 100;
                let newItem = {
                    "id": new Date().getTime(),
                    "type": type,
                    "position": {
                        "width": "30%",
                        "left": left + "px",
                        "top": top + "px",
                        "z-index": items.length + 6,
                    },
                    'properties': e.detail,
                };
                handleFormData(newItem, type, true);
            });
        });

        $playerWrapper.on('click', `#inlineannotation-btns  #edit`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let annnoid = $videoWrapper.find(`#message`).data('id');
            let active = $('#edit-btns').attr('data-active');
            getItems(false);
            let item = items.find(x => x.id == active);
            let type = item.type;
            let formdata = { ...item.properties };
            formdata.contextid = M.cfg.contextid;
            formdata.id = item.id;
            formdata.annotationid = annnoid;
            formdata.type = type;
            let editform = new ModalForm({
                formClass: "ivplugin_inlineannotation\\items\\" +
                    (type == 'image' || type == 'video' || type == 'audio' || type == 'file' ? 'media' : type),
                args: item.properties,
                modalConfig: {
                    title: M.util.get_string('editinlineannotation', 'ivplugin_inlineannotation',
                        M.util.get_string(type, 'ivplugin_inlineannotation')),
                }
            });

            editform.show();

            editform.addEventListener(editform.events.LOADED, () => {
                editform.modal.modal.draggable({
                    handle: ".modal-header",
                });
                if (type == 'navigation' || type == 'image' || type == 'shape') {
                    $(document).on('change', '[name="timestamp"]', function(e) {
                        e.preventDefault();
                        let parts = $(this).val().split(':');
                        let timestamp = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
                        if (!self.isBetweenStartAndEnd(timestamp)) {
                            let message = M.util.get_string('timemustbebetweenstartandendtime', 'mod_interactivevideo', {
                                "start": self.convertSecondsToHMS(self.start),
                                "end": self.convertSecondsToHMS(self.end),
                            });
                            self.addNotification(message);
                            $(this).val($(this).attr('data-initial-value'));
                            return;
                        }

                        // Make sure the timestamp is not in the skip segment.
                        if (self.isInSkipSegment(timestamp)) {
                            self.addNotification(M.util.get_string('interactionisbetweentheskipsegment', 'mod_interactivevideo'));
                            $(this).val($(this).attr('data-initial-value'));
                            return;
                        }
                    });
                }
            });

            editform.addEventListener(editform.events.FORM_SUBMITTED, (e) => {
                getItems(false);
                item = items.find(x => x.id == active);
                item.properties = e.detail;
                // Remove the item from the canvas
                $videoWrapper.find(`.annotation-wrapper[data-item="${active}"]`).remove();
                items = items.filter(x => x.id != active);
                handleFormData(item, type, false);
            });
        });

        $videoWrapper.on('click', `.annotation-wrapper`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!e.ctrlKey) {
                $('#inlineannotation-btns .btn').removeClass('active rotatey-360');
                $videoWrapper.find('.annotation-wrapper').removeClass('active');
                $(this).addClass('active');
                this.focus();
                recalculatingSize($(this));
            } else {
                if ($(this).hasClass('active')) {
                    $(this).removeClass('active');
                } else {
                    $(this).addClass('active');
                    this.focus();
                }
            }

            recalculatingSize($(this));

            var activewrapper = $videoWrapper.find('.annotation-wrapper.active');
            if (activewrapper.length == 0) {
                $('#edit-btns').attr('data-active', '').addClass('d-none').removeClass('d-flex');
                $('#inlineannotation-btns #edit').attr('disabled', 'disabled');
                $('#inlineannotation-btns #edit').removeAttr('disabled');
            } else {
                let dataActive = activewrapper.map(function() {
                    return $(this).data('item');
                }).get();
                $('#edit-btns').attr('data-active', dataActive).addClass('d-flex').removeClass('d-none');
                activewrapper.each(function() {
                    let type = $(this).data('type');
                    $(`#inlineannotation-btns .btn[data-mediatype="${type}"]`).addClass('active rotatey-360');
                });
                if (activewrapper.length > 1) {
                    $('#inlineannotation-btns #edit').attr('disabled', 'disabled');
                } else {
                    $('#inlineannotation-btns #edit').removeAttr('disabled');
                }
            }
        });

        $playerWrapper.on('click', `#inlineannotation-btns  #up`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            // Increase the z-index of the active item
            let active = $('#edit-btns').attr('data-active');
            active = active.split(',');
            active.forEach((item) => {
                let activeItem = $(`.annotation-wrapper[data-item="${item}"]`);
                let zIndex = parseInt(activeItem.css('z-index'));
                activeItem.css('z-index', zIndex + 1);
                recalculatingSize(activeItem);
            });
        });

        $playerWrapper.on('click', `#inlineannotation-btns  #down`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            // Decrease the z-index of the active item
            let active = $('#edit-btns').attr('data-active');
            active = active.split(',');
            active.forEach((item) => {
                let activeItem = $(`.annotation-wrapper[data-item="${item}"]`);
                let zIndex = parseInt(activeItem.css('z-index'));
                activeItem.css('z-index', zIndex - 1);
                recalculatingSize(activeItem);
            });
        });

        $playerWrapper.on('click', `#inlineannotation-btns  #delete`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            // Delete the active item
            let active = $('#edit-btns').attr('data-active');
            active = active.split(',');
            active.forEach((item) => {
                let activeItem = $(`.annotation-wrapper[data-item="${item}"]`);
                activeItem.remove();
                $('#edit-btns').attr('data-active', '').addClass('d-none').removeClass('d-flex');
            });
            getItems(false);
            $('#inlineannotation-btns .btn').removeClass('active rotatey-360');
        });

        $playerWrapper.on('click', `#inlineannotation-btns  #copy`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            getItems(false);
            // Copy the active item
            let active = $('#edit-btns').attr('data-active');
            active = active.split(',');
            let newItems = [];
            for (let i = 0; i < active.length; i++) {
                let a = active[i];
                let activeItem = $(`.annotation-wrapper[data-item="${a}"]`);
                activeItem.removeClass('active');
                let item = items.find(x => x.id == a);
                let newItem = {...item};
                newItem.position = recalculatingSize(activeItem);
                newItem.id = new Date().getTime();
                newItems.push(newItem.id);
                newItem.position.zIndex = items.length + 6;
                newItem.position.left = (parseInt(newItem.position.left) + 5) + '%';
                newItem.position.top = (parseInt(newItem.position.top) + 5) + '%';
                items.push(newItem);
                renderItems([newItem], null, true);
                if (i == active.length - 1) {
                    $('#edit-btns').attr('data-active', newItems.join(',')).addClass('d-flex').removeClass('d-none');
                    newItems.forEach((ni) => {
                        $(`.annotation-wrapper[data-item="${ni}"]`).addClass('active');
                    });
                    // Put focus on the first element
                    document.querySelector('.annotation-wrapper.active').focus();
                }
            }
        });

        // Move items with keyboard arrow keys, ctrl + up to layer up, and ctrl + down to layer down.
        $playerWrapper.on('keydown', '.annotation-wrapper', function(e) {
            let active = $('#edit-btns').attr('data-active');
            active = active.split(',');
            for (let i = 0; i < active.length; i++) {
                let a = active[i];
                let activeItem = $(`.annotation-wrapper[data-item="${a}"]`);
                if (activeItem != undefined) {
                    let position = activeItem.position();
                    position['z-index'] = parseInt(activeItem.css('z-index'));
                    let ctrl = e.ctrlKey || e.metaKey;
                    let step = 1;
                    // Prevent page scroll
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    switch (e.key) {
                        case 'ArrowUp':
                            if (ctrl) {
                                position['z-index'] = position['z-index'] + 1;
                                break;
                            }
                            if (position.top > 0) {
                                position.top = position.top - step;
                            }
                            break;
                        case 'ArrowDown':
                            if (ctrl) {
                                position['z-index'] = position['z-index'] - 1;
                                break;
                            }
                            if (position.top + activeItem.outerHeight() < $videoWrapper.find(`#message`).height()) {
                                position.top = position.top + step;
                            }
                            break;
                        case 'ArrowLeft':
                            if (position.left > 0) {
                                position.left = position.left - step;
                            }
                            break;
                        case 'ArrowRight':
                            if (position.left + activeItem.outerWidth() < $videoWrapper.find(`#message`).width()) {
                                position.left = position.left + step;
                            }
                            break;
                        case 'Delete':
                            $(`#inlineannotation-btns #delete`).trigger('click');
                            return;
                        case 'd': // Ctrl + d to duplicate
                            if (ctrl) {
                                $(`#inlineannotation-btns #copy`).trigger('click');
                            }
                            return;
                        default:
                            return;
                    }
                    activeItem.css(position);
                    recalculatingSize(activeItem);
                }
            }
        });

        $playerWrapper.on('click', `#message`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $videoWrapper.find('.annotation-wrapper').removeClass('active');
            $('#inlineannotation-btns .btn').removeClass('active rotatey-360');
            $('#edit-btns').attr('data-active', '').addClass('d-none').removeClass('d-flex');
        });

        $(document).on('annotationdeleted', function(e) {
            let deleted = e.originalEvent.detail.annotation;
            let annoid = $videoWrapper.find(`#message`).data('id');
            if (annoid == deleted.id) {
                $videoWrapper.find(`#message[data-id='${annoid}']`).remove();
                $(`#inlineannotation-btns`).remove();
            }
        });
    }
    /**
     * What happens when an item runs
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    runInteraction(annotation) {
        this.player.pause();
        this.renderContainer(annotation);
        if (this.isEditMode()) {
            annotation.editmode = true; // Use editmode to render the draft content (i.e draft.php vs plugin.php).
        }
        this.render(annotation, 'json').then((content) => {
            return this.postContentRender(annotation, content);
        }).catch(() => {
            // Do nothing.
        });
    }
}