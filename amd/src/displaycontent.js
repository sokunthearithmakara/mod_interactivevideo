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
 * Display content module
 *
 * @module     mod_interactivevideo/displaycontent
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Fragment from 'core/fragment';
import { dispatchEvent } from 'core/event_dispatcher';

const renderContent = async (annotation, format = 'html') => {
    const args = {
        ...annotation,
        contextid: M.cfg.contextid
    };
    const fragment = await Fragment.loadFragment('mod_interactivevideo', 'getcontent', M.cfg.contextid, args);
    if (format === 'html') {
        return fragment;
    } else {
        return JSON.parse(fragment);
    }
};

const formatText = async (text, shorttext = false) => {
    try {
        const response = await $.ajax({
            url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
            type: 'POST',
            dataType: "text",
            data: {
                text: text,
                contextid: M.cfg.contextid,
                action: 'format_text',
                sesskey: M.cfg.sesskey,
                shorttext: shorttext,
            }
        });
        return response;
    } catch (error) {
        throw new Error('Failed to format text');
    }
};

const defaultDisplayContent = async (annotation, player) => {
    // Play pop sound
    var audio = new Audio(M.cfg.wwwroot + '/mod/interactivevideo/sounds/pop.mp3');
    audio.play();
    var displayoptions = annotation.displayoptions;
    if ($('body').hasClass('mobiletheme')) {
        displayoptions = 'popup';
    }
    // If the wrapper is in fullscreen mode, display the message inline (on top of the video).
    if ($('#wrapper').hasClass('fullscreen')) {
        displayoptions = 'inline';
    }

    var completionbutton = "";
    if (JSON.parse(annotation.prop).hascompletion) {
        if (annotation.completiontracking == 'complete') {
            completionbutton = `<i class="bi bi-info-circle-fill mr-2" data-toggle="tooltip" data-container="#wrapper"
            data-trigger="hover"
             data-title="${M.util.get_string("completiononcomplete", "mod_interactivevideo")}"></i>`;
        } else if (annotation.completiontracking == 'completepass') {
            completionbutton = `<i class="bi bi-info-circle-fill mr-2" data-toggle="tooltip" data-container="#wrapper"
            data-trigger="hover"
             data-title="${M.util.get_string("completiononcompletepass", "mod_interactivevideo")}"></i>`;
        } else if (annotation.completiontracking == 'completefull') {
            completionbutton = `<i class="bi bi-info-circle-fill mr-2" data-toggle="tooltip" data-container="#wrapper"
            data-trigger="hover"
             data-title="${M.util.get_string("completiononcompletefull", "mod_interactivevideo")}"></i>`;
        }

        if (annotation.completed) {
            completionbutton += `<button id="completiontoggle" class="btn mark-undone btn-success btn-sm"
             data-id="${annotation.id}"><i class="bi bi-check2"></i>
             <span class="ml-2 d-none d-sm-block">
             ${M.util.get_string('completionmarkincomplete', 'mod_interactivevideo')}</span></button>`;
        } else {
            completionbutton += `<button  id="completiontoggle" class="btn mark-done btn-secondary btn-sm"
             data-id="${annotation.id}"><i class="bi bi-circle"></i>
             <span class="ml-2 d-none d-sm-block">
             ${M.util.get_string('completionmarkcomplete', 'mod_interactivevideo')}</span></button>`;
        }
    }

    // Append refresh button after the completion button
    if (!$('body').hasClass('page-interactions')) {
        completionbutton += `<button class="btn btn-secondary btn-sm ml-2 rotatez-360" data-id="${annotation.id}" id="refresh">
        <i class="bi bi-arrow-repeat"></i></button>`;
    } else {
        completionbutton = ``;
    }

    var messageTitle = `<h5 class="modal-title text-truncate mb-0">
    <i class="${JSON.parse(annotation.prop).icon} mr-2 d-none d-md-inline"></i>${annotation.formattedtitle}</h5>
                            <div class="btns d-flex align-items-center">
                            ${completionbutton}
                            <button class="btn mx-2 p-0 close" aria-label="Close" data-dismiss="modal">
                            <i class="bi bi-x-lg fa-fw fs-25px"></i>
                            </button>
                            </div>`;

    $('#annotation-modal').modal('hide');

    // Handle annotation close event:: when user click on the close button of the annotation
    $(document).on('click', `#message[data-id='${annotation.id}'] #title .close`, async function (e) {
        e.preventDefault();
        $(this).closest("#annotation-modal").modal('hide');
        var targetMessage = $(this).closest("#message");
        targetMessage.addClass('bottom-0');
        setTimeout(function () {
            targetMessage.remove();
            dispatchEvent('interactionclose', {
                annotation: annotation,
            });
        }, 100);
        if (!$('body').hasClass('page-interactions')) {
            player.play();
        }
    });

    switch (displayoptions) {
        case 'popup':
            var modal = `<div class="modal fade" id="annotation-modal" role="dialog"
            aria-labelledby="annotation-modal"
         aria-hidden="true" data-backdrop="static" data-keyboard="false">
         <div id="message" data-id="${annotation.id}" data-placement="popup"
          class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
                                    <div class="modal-content rounded-lg">
                                        <div class="modal-header d-flex align-items-center shadow-sm pr-0" id="title">
                                            ${messageTitle}
                                        </div>
                                        <div class="modal-body" id="content"></div>
                                        </div>
                                    </div>
                                    </div>`;
            $('#wrapper').append(modal);
            $('#annotation-modal').modal('show');
            $('#annotation-modal').on('hide.bs.modal', function () {
                $('#annotation-modal').remove();
            });

            $('#annotation-modal').on('shown.bs.modal', function () {
                $('#annotation-modal .modal-body').fadeIn(300);
                return Promise.resolve();
            });
            break;

        case 'inline':
            // Cover the video with a message on a white background div
            $('#video-wrapper').append(`<div id="message" style="z-index:5;top:100%" data-placement="inline"
         data-id="${annotation.id}">
        <div id="title" class="modal-header shadow-sm pr-0">${messageTitle}</div><div class="modal-body" id="content">
        </div></div>`);
            $(`#message[data-id='${annotation.id}']`).animate({
                top: '0',
            }, 300, 'linear', function () {
                return Promise.resolve();
            });
            break;
        case 'bottom':
            $('#annotation-content').empty();
            // Display the content below the video
            $('#annotation-content').append(`<div id="message" class="fade show" data-placement="bottom" data-id="${annotation.id}">
        <div id="title" class="modal-header shadow-sm pr-0">${messageTitle}</div>
        <div class="modal-body" id="content"></div></div>`);
            // Scroll to annotation-content
            $('html, body, #page.drawers, .modal-body').animate({
                scrollTop: $("#annotation-content").offset().top
            }, 1000, 'swing', function () {
                return Promise.resolve();
            });
            break;
    }

};

export { renderContent, defaultDisplayContent, formatText };
