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
import {dispatchEvent} from 'core/event_dispatcher';

/**
 * Return main formatted content of the annotation
 * @param {Object} annotation - The annotation object
 * @param {String} [format='html'] - The format of the content, either 'html' or 'json'
 * @returns {Promise<String|Object>} - The formatted content as a string or parsed JSON object
 */
const renderContent = async function(annotation, format = 'html') {
    const annotationArgs = {
        ...annotation,
        contextid: annotation.contextid
    };
    let fragment;
    try {
        fragment = await Fragment.loadFragment('mod_interactivevideo', 'getcontent', annotation.contextid, annotationArgs);
    } catch (error) {
        throw new Error(JSON.stringify(error));
    }
    if (format === 'html') {
        return fragment;
    } else {
        return JSON.parse(fragment);
    }
};

/**
 * Format content text
 * @param {String} text unformatted text
 * @param {Boolean} shorttext short string or text
 * @returns formatted text
 */
const formatText = async function(text, shorttext = false) {
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

/**
 * Displays the content of an annotation based on the specified display options.
 *
 * @async
 * @function defaultDisplayContent
 * @param {Object} annotation - The annotation object containing details to be displayed.
 * @param {Object} player - The video player instance.
 * @returns {Promise<void>}
 *
 * @example
 * const annotation = {
 *   id: 1,
 *   displayoptions: 'popup',
 *   hascompletion: 1,
 *   xp: 10,
 *   completed: false,
 *   formattedtitle: 'Sample Annotation',
 *   prop: '{"icon": "bi bi-info-circle"}'
 * };
 * const player = videojs('my-video');
 * defaultDisplayContent(annotation, player);
 */
const defaultDisplayContent = async function(annotation, player) {
    const isDarkMode = $('body').hasClass('darkmode');

    // Play pop sound
    const audio = new Audio(M.cfg.wwwroot + '/mod/interactivevideo/sounds/pop.mp3');
    audio.play();

    let displayoptions = annotation.displayoptions;

    // If the theme is mobile, display the message as a popup.
    if ($('body').hasClass('mobiletheme') && displayoptions == 'inline') {
        displayoptions = 'popup';
    }

    if ($('body').hasClass('embed-mode')) {
        displayoptions = 'inline';
    }

    // If the wrapper is in fullscreen mode, display the message inline (on top of the video).
    if ($('#wrapper').hasClass('fullscreen')) {
        displayoptions = 'inline';
    }

    // Add completion button if the annotation has completion criteria.
    let completionbutton = "";
    // Display the xp badge conditionally.
    if (annotation.hascompletion == 1 && annotation.xp > 0) {
        const earned = annotation.earned == annotation.xp ? annotation.earned : annotation.earned + '/' + annotation.xp;
        completionbutton += `<span class="badge ${annotation.completed ? 'alert-success' : 'badge-secondary'} mr-2">
        ${annotation.completed ? earned : Number(annotation.xp)} XP</span>`;
    }
    // Display the completion button conditionally.
    if (annotation.hascompletion == 1) {
        if (annotation.completed) {
            completionbutton += `<button id="completiontoggle" class="btn mark-undone btn-success btn-sm border-0"
             data-id="${annotation.id}"><i class="bi bi-check2"></i>
             <span class="ml-2 d-none d-sm-block">
             ${M.util.get_string('completionmarkincomplete', 'mod_interactivevideo')}</span></button>`;
        } else {
            completionbutton += `<button  id="completiontoggle" class="btn mark-done btn-secondary btn-sm border-0"
             data-id="${annotation.id}"><i class="bi bi-circle"></i>
             <span class="ml-2 d-none d-sm-block">
             ${M.util.get_string('completionmarkcomplete', 'mod_interactivevideo')}</span></button>`;
        }
    }

    // Append refresh button after the completion button.
    if (!$('body').hasClass('page-interactions')) {
        completionbutton += `<button class="btn btn-secondary btn-sm ml-2 rotatez-360 border-0"
         data-id="${annotation.id}" id="refresh">
        <i class="bi bi-arrow-repeat"></i></button>`;
    } else {
        completionbutton = ``;
    }

    // Message title.
    let messageTitle = `<h5 class="modal-title text-truncate mb-0">
    <i class="${JSON.parse(annotation.prop).icon} mr-2 d-none d-md-inline"></i>${annotation.formattedtitle}</h5>
                            <div class="btns d-flex align-items-center">
                            ${completionbutton}
                            <button class="btn mx-2 p-0 border-0" id="close-${annotation.id}" aria-label="Close">
                            <i class="bi bi-x-lg fa-fw fs-25px"></i>
                            </button>
                            </div>`;

    // Hide existing modal if it shows.
    $('#annotation-modal').modal('hide');

    // Handle annotation close event:: when user click on the close button of the annotation.
    $(document).off('click', `#close-${annotation.id}`).on('click', `#close-${annotation.id}`, async function(e) {
        e.preventDefault();
        $(this).closest("#annotation-modal").modal('hide');
        const targetMessage = $(this).closest("#message");
        targetMessage.addClass('bottom-0');
        setTimeout(function() {
            targetMessage.remove();
            dispatchEvent('interactionclose', {
                annotation: annotation,
            });
        }, 100);

        if (!$('body').hasClass('page-interactions')) { // Do not auto resume if on interactions page.
            if (player.end != await player.getCurrentTime()) {
                player.play();
            }
        }
    });

    const handlePopupDisplay = (annotation, messageTitle) => {
        let modal = `<div class="modal fade ${$('body').hasClass('iframe') ? 'modal-fullscreen' : ''}"
             id="annotation-modal" role="dialog" aria-labelledby="annotation-modal"
         aria-hidden="true" data-backdrop="static" data-keyboard="false">
         <div id="message" data-id="${annotation.id}" data-placement="popup"
          class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable ${annotation.type}" role="document">
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

        $('#annotation-modal').on('hide.bs.modal', function() {
            $('#annotation-modal').remove();
        });

        $('#annotation-modal').on('shown.bs.modal', function() {
            $('#annotation-modal .modal-body').fadeIn(300);
            return Promise.resolve();
        });
    };

    const handleInlineDisplay = (annotation, messageTitle) => {
        $('#video-wrapper').append(`<div id="message" style="z-index:105;top:100%" data-placement="inline"
         data-id="${annotation.id}" class="${annotation.type}">
        <div id="title" class="modal-header shadow-sm pr-0">${messageTitle}</div><div class="modal-body" id="content">
        </div></div>`);
        $(`#message[data-id='${annotation.id}']`).animate({
            top: '0',
        }, 300, 'linear', function() {
            return Promise.resolve();
        });
    };

    const handleBottomDisplay = (annotation, messageTitle, isDarkMode) => {
        $('#annotation-content').empty();
        $('#annotation-content').append(`<div id="message" class="fade show mt-3 ${!isDarkMode ? 'border' : ''}
                 rounded-lg bg-white ${annotation.type}" data-placement="bottom" data-id="${annotation.id}">
                 <div id='title' class='modal-header shadow-sm pr-0'>${messageTitle}</div>
                <div class="modal-body" id="content"></div></div>`);
        $('html, body, #page.drawers, .modal-body').animate({
            scrollTop: $("#annotation-content").offset().top
        }, 1000, 'swing', function() {
            return Promise.resolve();
        });
    };

    switch (displayoptions) {
        case 'popup':
            handlePopupDisplay(annotation, messageTitle);
            break;
        case 'inline':
            handleInlineDisplay(annotation, messageTitle);
            break;
        case 'bottom':
            handleBottomDisplay(annotation, messageTitle, isDarkMode);
            break;
    }
};

export {renderContent, defaultDisplayContent, formatText};
