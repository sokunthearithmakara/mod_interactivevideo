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
 * TODO describe module main
 *
 * @module     ivplugin_annotation/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Base from 'mod_interactivevideo/type/base';
import Ajax from 'core/ajax';
import Templates from 'core/templates';
import {dispatchEvent} from 'core/event_dispatcher';
import ModalForm from 'core_form/modalform';
import {notifyFilterContentUpdated as notifyFilter} from 'core_filters/events';

export default class Annotation extends Base {
    async init() {
        const videoWrapper = $('#video-wrapper');
        let item = this.annotations.find((annotation) => annotation.type == 'annotation');
        if (!this.isEditMode()) {
            if (!item || item.content == '') {
                return;
            }
            const updateAspectRatio = async (video, reset) => {
                let elem = video ? $('#player') : $(`#annotation-canvas[data-id='${item.id}']`);
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

            $(document).on('timeupdate', function(e) {
                updateAspectRatio(true, true);
                const t = e.originalEvent.detail.time;
                let annos = $('#annotation-canvas .annotation-wrapper');
                annos.each(function() {
                    let start = $(this).data('start');
                    let end = $(this).data('end');
                    if (t >= start && t <= end) {
                        $(this).css('visibility', 'visible');
                    } else {
                        $(this).css('visibility', 'hidden');
                    }
                });
            });

            $('#annotation-canvas').attr('data-id', item.id);
            let content = await this.render(item, 'json');
            this.postContentRender(item, content);
        } else {
            $(document).on('timeupdate', function(e) {
                const t = e.originalEvent.detail.time;
                let annos = $('#annotation-canvas .annotation-wrapper');
                annos.each(function() {
                    let start = $(this).data('start');
                    let end = $(this).data('end');
                    if (t >= start && t <= end) {
                        $(this).css('visibility', 'visible');
                    } else {
                        $(this).css('visibility', 'hidden');
                    }
                });
            });
            if (item) {
                $('#annotation-canvas').attr('data-id', item.id);
                item.editmode = true;
                window.console.log(item);
                let content = await this.render(item, 'json');
                window.console.log(content);
                this.postContentRender(item, content);
            }
        }
    }
    async renderAnnotationToolbar(annotation) {
        $('#annotation-btns').remove();
        let annotationitems = [
            {
                'icon': 'bi bi-image',
                'type': 'media',
                'mediatype': 'image',
                'label': M.util.get_string('image', 'ivplugin_inlineannotation'),
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
            items: annotationitems,
        };

        let html = await Templates.render('ivplugin_annotation/toolbar', dataForTemplate);
        $("#wrapper").append(html);

        this.enableColorPicker();
    }

    postContentRender(annotation, data) {
        let self = this;
        var $videoWrapper = $('#annotation-canvas');
        var $playerWrapper = $('#wrapper');
        const convertSecondsToMMSS = (seconds) => {
            let hours = Math.floor(seconds / 3600);
            let minutes = Math.floor((seconds - hours * 3600) / 60);
            let sec = seconds - hours * 3600 - minutes * 60;
            let formattedTime = '';
            if (hours > 0) {
                formattedTime += hours + ':';
            }
            if (minutes < 10) {
                formattedTime += '0';
            }
            formattedTime += minutes + ':';
            if (sec < 10) {
                formattedTime += '0';
            }
            formattedTime += sec;
            return formattedTime;
        };

        const appendTimestamp = (seconds) => {
            var formattedTime = convertSecondsToMMSS(seconds, true);
            $('#scrollbar').append(`<div id="position" class="position-absolute bg-black text-white small rounded-sm p-1"
                 style="top: -30px;">${formattedTime}</div>`);
        };

        const updatePositionInfo = (elem) => {
            let w = parseFloat(elem.outerWidth());
            let hw = parseFloat(elem.outerHeight());
            let t = parseFloat(elem.position().top) < 0 ? 0 : parseFloat(elem.position().top);
            let l = parseFloat(elem.position().left) < 0 ? 0 : parseFloat(elem.position().left);
            let z = elem.css('z-index');
            let s = elem.data('start');
            let e = elem.data('end');
            $(`#annotation-btns #position`)
                .html(`<i class="bi-bounding-box-circles bi mr-1"></i>
                    x: <span id="x-position" class="mr-2">${Math.round(l)}</span>
                    y: <span id="y-position" class="mr-2">${Math.round(t)}</span>
                    z: <span id="z-position" class="mr-2">${z - 5}</span>
                    w: <span id="w-position" class="mr-2">${Math.round(w)}</span>
                    h: <span id="h-position" class="mr-2">${Math.round(hw)}</span>
                <i class="bi-stopwatch bi ml-2 mr-1"></i>
                <span id="s-position" class="mr-1">${convertSecondsToMMSS(s)}</span>
                -<span id="e-position" class="mx-1">${convertSecondsToMMSS(e)}</span>`);
        };

        const recalculatingSize = (elem) => {
            let message = $('#annotation-canvas');
            $(`#annotation-btns #down, #annotation-btns #up`).removeAttr('disabled');
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
                $(`#annotation-btns #down`).attr('disabled', 'disabled');
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

        const renderTimelineItems = async (elements, activeid) => {
            let timeline = $('#timeline #annotation-timeline');
            timeline.empty();
            elements.sort((a, b) => b.position['z-index'] - a.position['z-index']);
            elements.forEach((item, i) => {
                let prop = item.properties;
                let type = item.type;
                let id = item.id;
                let left = (prop.start - self.start) / (self.end - self.start) * 100;
                let width = (prop.end - prop.start) / (self.end - self.start) * 100;
                timeline.append(`<div class="annotation-timeline-item position-absolute ${activeid == id ? 'active' : ''}"
                     data-item="${id}" data-type="${type}" data-end="${prop.end}" data-start="${prop.start}"
                         style="left: ${left}%; top: ${(i + 1) * 7}px; width: ${width}%"></div>`);
            });
            dispatchEvent('timeupdate', {time: await self.player.getCurrentTime()});
        };

        const renderItems = async (elements, active, update) => {
            if (!update) { // Clear the annotation-canvas if it is a new start.
                $videoWrapper.find(`.annotation-wrapper`).remove();
                $('#timeline #annotation-timeline').empty();
            }
            // Sort element by z-index
            elements.sort((a, b) => b.position['z-index'] - a.position['z-index']);
            let count = 0;
            elements.forEach((item) => {
                let prop = item.properties;
                let type = item.type;
                let id = item.id;
                let position = item.position;
                let wrapper = $(`<div class="annotation-wrapper" data-start="${prop.start}" data-end="${prop.end}"
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
                        $videoWrapper.append(wrapper);
                        break;
                    case 'file':
                        var wrapperhtml = ``;
                        wrapperhtml = `<a id="${id}"
                        class="btn ${prop.style} ${prop.rounded == '1' ? 'btn-rounded' : 'rounded-0'}
                        annotation-content text-nowrap ${prop.shadow == '1' ? 'shadow' : ''} rotatey-180" href="${prop.url}"
                         target="_blank"><i class="bi bi-paperclip"
                          style="font-size:0.7em;"></i>${prop.formattedlabel != "" ?
                                `<span style="margin-left:0.25em;">${prop.formattedlabel}` : ''}</a>`;
                        wrapper.append(`<div class="d-flex h-100">${wrapperhtml}</div>`);

                        position.width = 0;

                        wrapper.css(position);
                        $videoWrapper.append(wrapper);
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
                        $videoWrapper.append(wrapper);
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
                        $videoWrapper.append(wrapper);
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
                        $videoWrapper.append(wrapper);
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
                        $videoWrapper.append(wrapper);

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

                count++;

                if (count == elements.length) {
                    const currentTime = self.player.getCurrentTime();
                    dispatchEvent('timeupdate', {time: currentTime});

                    if (self.isEditMode()) {
                        renderTimelineItems(elements, active);
                        if ($('#annotation-btns').is(":visible") == false) {
                            $videoWrapper.find('.annotation-wrapper').addClass('no-pointer-events');
                        }
                        // Initialize the draggable and resizable for each item.
                        $videoWrapper.find('.annotation-wrapper').draggable({
                            containment: "#annotation-canvas",
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

                        $videoWrapper.find('.annotation-wrapper').resizable({
                            containment: "#annotation-canvas",
                            handles: "all",
                            start: function(event) {
                                let type = $(this).data('type');
                                // If shape and ctrl key is pressed, keep the aspect ratio 1:1.
                                if (type == 'shape' && event.ctrlKey) {
                                    $(this).resizable('option', 'aspectRatio', 1);
                                }
                            },
                            stop: function() {
                                let type = $(this).data('type');
                                if (type == 'text' || type == 'file' || type == 'navigation') {
                                    recalculatingTextSize($(this), type != 'text');
                                } else if (type == 'shape') {
                                    $(this).resizable('option', 'aspectRatio', false);
                                }
                                recalculatingSize($(this));
                                $(this).trigger('click');
                            },
                            resize: function(event) {
                                let type = $(this).data('type');
                                if (type == 'text' || type == 'file' || type == 'navigation') {
                                    recalculatingTextSize($(this), type != 'text');
                                } else if (type == 'shape' && event.ctrlKey) {
                                    $(this).resizable('option', 'aspectRatio', 1);
                                }
                                updatePositionInfo($(this));
                            }
                        });

                        // Initialize the draggable and resizable for each item on the timeline.
                        $('#timeline #annotation-timeline .annotation-timeline-item').draggable({
                            'axis': 'x',
                            'containment': 'parent',
                            'cursor': 'move',
                            'start': function() {
                                let elementid = $(this).data('item');
                                let elem = $videoWrapper.find(`.annotation-wrapper[data-item="${elementid}"]`);
                                elem.trigger('click');
                                appendTimestamp($(this).data('timestamp'));
                                $('#timeline-items').addClass('no-pointer-events');
                                $(this).addClass('no-pointer-events');
                            },
                            'drag': async function(e, ui) {
                                let timestamp = (ui.position.left) / $('#annotation-timeline').width() * self.totaltime
                                    + self.start;
                                await self.player.seek(Math.round(timestamp));
                                self.player.pause();
                                $('#scrollbar').css('left', (timestamp - self.start) / self.totaltime * 100 + '%');
                                $('#scrollbar #position').text(convertSecondsToMMSS(Math.round(timestamp), true));
                                let length = $(this).data('end') - $(this).data('start');
                                window.console.log($(this).data('end'), $(this).data('start'));
                                $('#s-position').text(convertSecondsToMMSS(Math.round(timestamp), true));
                                $('#e-position').text(convertSecondsToMMSS(Math.round(timestamp) + length, true));
                            },
                            'stop': function(e, ui) {
                                $('#scrollbar #position').remove();
                                $('#timeline-items').removeClass('no-pointer-events');
                                $(this).removeClass('no-pointer-events');
                                let elementid = $(this).data('item');
                                let elem = $videoWrapper.find(`.annotation-wrapper[data-item="${elementid}"]`);
                                let prop = elem.data('property');
                                let timestamp = (ui.position.left) / $('#annotation-timeline').width() * self.totaltime
                                    + self.start;
                                let duration = prop.end - prop.start;
                                prop.start = Math.round(((ui.position.left) / $('#annotation-timeline').width() * self.totaltime)
                                    + self.start);
                                prop.end = Math.round(prop.start + duration);
                                elem.attr('data-property', JSON.stringify(prop));
                                elem.attr('data-start', prop.start);
                                elem.attr('data-end', prop.end);
                                $('#scrollbar').css('left', (Math.round(timestamp) - self.start) / self.totaltime * 100 + '%');
                                $(this).attr('data-start', prop.start);
                                getItems(false);
                                renderItems(items, elementid, false);
                                dispatchEvent('timeupdate', {time: Math.round(timestamp)});
                                $('#s-position').text(convertSecondsToMMSS(Math.round(timestamp), true));
                                $('#e-position').text(convertSecondsToMMSS(Math.round(timestamp) + duration, true));
                            },
                        });

                        $('#timeline #annotation-timeline .annotation-timeline-item').resizable({
                            'handles': 'e, w',
                            'containment': 'parent',
                            'start': function() {
                                let elementid = $(this).data('item');
                                let elem = $videoWrapper.find(`.annotation-wrapper[data-item="${elementid}"]`);
                                elem.trigger('click');
                                appendTimestamp($(this).data('timestamp'));
                                $('#timeline-items').addClass('no-pointer-events');
                            },
                            'resize': async function(e, ui) {
                                let timestamp;
                                if (ui.originalPosition.left != ui.position.left || ui.originalSize.width == ui.size.width) {
                                    if (ui.position.left < 0) {
                                        ui.position.left = 0;
                                    }
                                    timestamp = ((ui.position.left)
                                        / $('#annotation-timeline').width()) * self.totaltime + self.start;
                                } else {
                                    timestamp = ((ui.position.left + ui.size.width)
                                        / $('#annotation-timeline').width()) * self.totaltime + self.start;
                                }
                                $('#scrollbar').css('left', (timestamp - self.start) / self.totaltime * 100 + '%');
                                await self.player.seek(Math.round(timestamp));
                                self.player.pause();
                                $('#scrollbar #position').text(convertSecondsToMMSS(Math.round(timestamp), true));
                                let start = ((ui.position.left) / $('#annotation-timeline').width()) * self.totaltime + self.start;
                                let end = ((ui.position.left + ui.size.width) / $('#annotation-timeline').width()) * self.totaltime
                                    + self.start;
                                $('#s-position').text(convertSecondsToMMSS(Math.round(start), true));
                                $('#e-position').text(convertSecondsToMMSS(Math.round(end), true));
                            },
                            'stop': async function(e, ui) {
                                $('#scrollbar #position').remove();
                                setTimeout(function() {
                                    $('#timeline-items').removeClass('no-pointer-events');
                                }, 200);
                                let elementid = $(this).data('item');
                                let elem = $videoWrapper.find(`.annotation-wrapper[data-item="${elementid}"]`);
                                let prop = elem.data('property');
                                let timestamp, direction;
                                if (ui.originalPosition.left != ui.position.left) {
                                    if (ui.position.left < 0) {
                                        ui.position.left = 0;
                                    }
                                    timestamp = ((ui.position.left)
                                        / $('#annotation-timeline').width()) * self.totaltime + self.start;
                                    direction = "left";
                                } else {
                                    timestamp = ((ui.position.left + ui.size.width)
                                        / $('#annotation-timeline').width()) * self.totaltime + self.start;
                                    direction = "right";
                                }
                                if (direction == "left") {
                                    prop.start = Math.round(timestamp);
                                } else {
                                    prop.end = Math.round(timestamp);
                                }
                                elem.attr('data-property', JSON.stringify(prop));
                                elem.attr('data-start', prop.start);
                                elem.attr('data-end', prop.end);
                                await self.player.seek(Math.round(timestamp));
                                self.player.pause();
                                $('#scrollbar').css('left', (timestamp - self.start) / self.totaltime * 100 + '%');
                                $(this).attr('data-start', prop.start);
                                getItems(false);
                                renderItems(items, elementid, false);
                                dispatchEvent('timeupdate', {time: Math.round(timestamp)});
                                $('#s-position').text(convertSecondsToMMSS(Math.round(prop.start), true));
                                $('#e-position').text(convertSecondsToMMSS(Math.round(prop.end), true));
                            }
                        });
                    }
                }
            });

            // Handle behavior for each item
            if (!self.isEditMode()) {
                $videoWrapper.on('click', `.annotation-wrapper`, function(e) {
                    e.stopImmediatePropagation();
                    let wrapper = $(this);
                    let type = wrapper.data('type');
                    switch (type) {
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
            let existingwrapper = $(`#annotation-canvas`).find(`.annotation-wrapper`);
            if (existingwrapper.length == 0) {
                return;
            }
            existingwrapper.each(function() {
                let type = $(this).data('type');
                if (type == 'text' || type == 'file' || type == 'navigation') {
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

        $(document).on('click', '.annotation-timeline-item', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let elementid = $(this).data('item');
            let elem = $videoWrapper.find(`.annotation-wrapper[data-item="${elementid}"]`);
            $('.annotation-timeline-item').removeClass('active');
            $(this).addClass('active');
            elem.trigger('click');
            self.player.seek($(this).data('start'));
        });

        $playerWrapper.on('click', `#annotation-btns #save`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            getItems(true);
            // Encode html tags
            let cleanItems = JSON.stringify(items).replace(/</g, '&lt;').replace(/>/g, '&gt;');
            let updateId = $videoWrapper.data('id');
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

        $(document).on('click', `#annotation-btns #closetoolbar`, function(e) {
            e.preventDefault();
            $(`#annotation-btns`).remove();
            $('#interaction-timeline, #video-timeline-wrapper, #timeline-btns').show();
            $('#content-region').removeClass('no-pointer-events');
            $('#annotation-timeline').hide();
            $('#annotation-canvas .annotation-wrapper').addClass('no-pointer-events').removeClass('active');
        });

        const handleFormData = (newItem, type, add) => {
            switch (type) {
                case 'file':
                    if (add) {
                        newItem.position.height = '40px';
                        newItem.position.width = '130px';
                    }
                    break;
                case 'navigation':
                case 'text':
                    newItem.width = '0';
                    break;
                case 'shape':
                    if (add) {
                        newItem.position.height = '100px';
                        newItem.position.width = '100px';
                    }
                    break;
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
            renderItems(items, newItem.id, false);
        };

        $playerWrapper.on('click', `#annotation-btns .add-ia`, async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let annoid = $videoWrapper.data('id');
            let type = $(this).attr('data-mediatype');
            let currenttime = await self.player.getCurrentTime();
            let iaform = new ModalForm({
                formClass: "ivplugin_annotation\\items\\" + $(this).attr('data-type'),
                args: {
                    contextid: M.cfg.contextid,
                    id: 0,
                    type: type,
                    annotationid: annoid,
                    start: currenttime,
                    end: currenttime + 5,
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

        $playerWrapper.on('click', `#annotation-btns #edit`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let annnoid = $videoWrapper.data('id');
            let active = $('#edit-btns').attr('data-active');
            getItems(false);
            let item = items.find(x => x.id == active);
            let type = item.type;
            let formdata = {...item.properties};
            formdata.contextid = M.cfg.contextid;
            formdata.id = item.id;
            formdata.annotationid = annnoid;
            formdata.type = type;
            let editform = new ModalForm({
                formClass: "ivplugin_annotation\\items\\" +
                    (type == 'image' || type == 'file' ? 'media' : type),
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
                // Remove the item from the annotation-canvas
                $videoWrapper.find(`.annotation-wrapper[data-item="${active}"]`).remove();
                items = items.filter(x => x.id != active);
                handleFormData(item, type, false);
            });
        });

        $videoWrapper.on('click', `.annotation-wrapper`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!e.ctrlKey) {
                $('#annotation-btns .btn').removeClass('active rotatey-360');
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

            const id = $(this).data('item');
            $(`#timeline #annotation-timeline .annotation-timeline-item`).removeClass('active');
            $(`#timeline #annotation-timeline .annotation-timeline-item[data-item="${id}"]`).addClass('active');

            var activewrapper = $videoWrapper.find('.annotation-wrapper.active');
            if (activewrapper.length == 0) {
                $('#edit-btns').attr('data-active', '').addClass('d-none').removeClass('d-flex');
                $('#annotation-btns #edit').attr('disabled', 'disabled');
                $('#annotation-btns #edit').removeAttr('disabled');
            } else {
                let dataActive = activewrapper.map(function() {
                    return $(this).data('item');
                }).get();
                $('#edit-btns').attr('data-active', dataActive).addClass('d-flex').removeClass('d-none');
                activewrapper.each(function() {
                    let type = $(this).data('type');
                    $(`#annotation-btns .btn[data-mediatype="${type}"]`).addClass('active rotatey-360');
                });
                if (activewrapper.length > 1) {
                    $('#annotation-btns #edit').attr('disabled', 'disabled');
                } else {
                    $('#annotation-btns #edit').removeAttr('disabled');
                }
            }
        });

        $playerWrapper.on('click', `#annotation-btns #up`, function(e) {
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
            if (active.length == 1) {
                active = active[0];
            }
            getItems(false);
            renderTimelineItems(items, active);
        });

        $playerWrapper.on('click', `#annotation-btns #down`, function(e) {
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
            if (active.length == 1) {
                active = active[0];
            }
            getItems(false);
            renderTimelineItems(items, active);
        });

        $playerWrapper.on('click', `#annotation-btns #delete`, function(e) {
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
            renderTimelineItems(items, null);
            $('#annotation-btns .btn').removeClass('active rotatey-360');
        });

        $playerWrapper.on('click', `#annotation-btns #copy`, function(e) {
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
                renderItems(items, null, false);
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
                            if (position.top + activeItem.outerHeight() < $videoWrapper.height()) {
                                position.top = position.top + step;
                            }
                            break;
                        case 'ArrowLeft':
                            if (position.left > 0) {
                                position.left = position.left - step;
                            }
                            break;
                        case 'ArrowRight':
                            if (position.left + activeItem.outerWidth() < $videoWrapper.width()) {
                                position.left = position.left + step;
                            }
                            break;
                        case 'Delete':
                            $(`#annotation-btns #delete`).trigger('click');
                            return;
                        case 'd': // Ctrl + d to duplicate
                            if (ctrl) {
                                $(`#annotation-btns #copy`).trigger('click');
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

        $(document).on('annotationdeleted', function(e) {
            let deleted = e.originalEvent.detail.annotation;
            let annoid = $videoWrapper.data('id');
            if (annoid == deleted.id) {
                $videoWrapper.find('.annotation-wrapper').remove();
                $(`#annotation-btns`).remove();
                $(`#timeline #annotation-timeline .annotation-timeline-item`).remove();
            }
        });
    }

    async renderEditItem(annotations, listItem, item) {
        this.annotations = annotations;
        listItem.removeAttr('id').removeClass('d-none');
        listItem.attr('data-type', item.type);
        listItem.addClass(item.type);
        listItem.attr('data-id', item.id);
        listItem.removeAttr('data-timestamp');
        listItem.find('.timestamp').remove();
        listItem.find('.title').text(item.formattedtitle).addClass('no-pointer-events');
        listItem.find('.btn.xp').remove();
        listItem.find('.type-icon i').addClass(this.prop.icon);
        listItem.find('.type-icon').attr('title', this.prop.title);
        listItem.find('.btn.copy').remove();
        listItem.appendTo('#annotation-list');
        return listItem;
    }
    async editAnnotation(annotations, id) {
        this.annotations = annotations;
        let item = this.annotations.find((annotation) => annotation.id == id);
        $('#annotation-canvas').attr('data-id', item.id);
        $('#interaction-timeline, #video-timeline-wrapper, #timeline-btns').hide();
        $('#content-region').addClass('no-pointer-events');
        $('#annotation-timeline').show();
        $('#annotation-canvas .annotation-wrapper').removeClass('no-pointer-events');
        this.renderAnnotationToolbar(item);
    }
    async addAnnotation(annotations, timestamp, coursemodule) {
        let self = this;
        // Check if the annotation of this type already exists.
        let annotation = annotations.find((annotation) => annotation.type == self.prop.name);
        if (annotation) {
            self.addNotification('Annotation already exists', 'danger');
            return;
        }
        let data = {
            title: 'Annotation',
            timestamp: -1,
            contextid: M.cfg.contextid,
            type: self.prop.name,
            courseid: self.course,
            cmid: coursemodule,
            annotationid: self.interaction,
            hascompletion: 0,
            advanced: JSON.stringify({
                "visiblebeforecompleted": "1",
                "visibleaftercompleted": null,
                "clickablebeforecompleted": "1",
                "clickableaftercompleted": null,
                "replaybehavior": "1",
            }),
        };
        let ajax = await Ajax.call([{
            methodname: 'ivplugin_annotation_add',
            args: {
                annotationdata: JSON.stringify(data),
            },
            contextid: M.cfg.contextid,
        }])[0];

        let newAnnotation = JSON.parse(ajax.data);
        dispatchEvent('annotationupdated', {
            annotation: newAnnotation,
            action: 'add'
        });

        self.annotations = annotations;
        $('#contentmodal').modal('hide');
        self.editAnnotation(annotations, newAnnotation.id);
    }
    runInteraction(annotation) {
        return annotation;
    }
}