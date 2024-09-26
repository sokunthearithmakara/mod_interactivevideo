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
 * Main module for the decision plugin.
 *
 * @module     ivplugin_decision/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Base from 'mod_interactivevideo/type/base';
import DynamicForm from 'core_form/dynamicform';
import {dispatchEvent} from 'core/event_dispatcher';
export default class Decision extends Base {
    /**
     * Initializes the decision plugin for interactive videos.
     *
     * This method sets up event listeners and handles the logic for decision points
     * within the video. If the video is not in edit mode, it filters out decision
     * annotations and prevents skipping certain decision points based on their
     * properties.
     *
     * @method init
     * @memberof DecisionPlugin
     * @instance
     *
     * @example
     * // Initialize the decision plugin
     * decisionPlugin.init();
     */
    init() {
        if (!this.isEditMode()) {
            const decisions = this.annotations.filter((d) => d.type == 'decision');
            const notSkip = decisions.filter((d) => d.char1 != 1);
            if (notSkip.length == 0) {
                return;
            }
            let self = this;
            $(document).on('timeupdate', function(e) {
                const cantSkip = decisions.filter((d) => d.char1 != 1 && !d.viewed);
                cantSkip.sort((a, b) => a.timestamp - b.timestamp);
                if (cantSkip.length == 0) {
                    return;
                }
                const t = Number(e.originalEvent.detail.time);
                const firstCantSkip = cantSkip[0];
                if (t > Number(firstCantSkip.timestamp)) {
                    self.runInteraction(firstCantSkip);
                }
            });
        }
    }

    /**
     * Add an annotation
     * @param {Array} annotations The annotations array
     * @param {number} timestamp The timestamp
     * @param {number} coursemodule The course module id
     * @returns {void}
     */
    addAnnotation(annotations, timestamp, coursemodule) {
        $('#addcontent, #interaction-timeline').addClass('no-pointer-events');
        let self = this;
        this.annotations = annotations;
        if (!this.isBetweenStartAndEnd(timestamp)) {
            const message = M.util.get_string('interactioncanonlybeaddedbetweenstartandendtime', 'mod_interactivevideo', {
                "start": self.convertSecondsToHMS(self.start),
                "end": self.convertSecondsToHMS(self.end),
            });
            self.addNotification(message);
            return;
        }

        if (self.isAlreadyAdded(timestamp)) {
            self.addNotification(M.util.get_string('interactionalreadyexists', 'mod_interactivevideo'));
            return;
        }

        if (self.isInSkipSegment(timestamp)) {
            self.addNotification(M.util.get_string('interactionisbetweentheskipsegment', 'mod_interactivevideo'));
            return;
        }

        const startHMS = self.convertSecondsToHMS(self.start);
        const endHMS = self.convertSecondsToHMS(self.end);
        const timestampHMS = timestamp > 0 ? self.convertSecondsToHMS(timestamp) : startHMS;

        const data = {
            id: 0,
            timestamp: timestamp > 0 ? timestamp : self.start,
            timestampassist: timestampHMS,
            title: self.prop.title,
            start: startHMS,
            end: endHMS,
            contextid: M.cfg.contextid,
            type: self.prop.name,
            courseid: self.course,
            cmid: coursemodule,
            annotationid: self.interaction,
            hascompletion: self.prop.hascompletion ? 1 : 0,
        };

        $('#annotationwrapper table').hide();
        $('#annotationwrapper').append('<div id="form" class="w-100 p-3"></div>');
        $("#contentmodal").modal('hide');
        $('#addcontentdropdown a').removeClass('active');

        const selector = document.querySelector(`#annotationwrapper #form`);
        const decisionform = new DynamicForm(selector, self.prop.form);
        decisionform.load(data);

        self.onEditFormLoaded(decisionform);
        self.validateTimestampFieldValue('timestampassist', 'timestamp');

        $(document).off('click', '#cancel-submit').on('click', '#cancel-submit', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $('#annotationwrapper #form').remove();
            $('#annotationwrapper table').show();
        });

        $(document).off('click', '#submitform-submit').on('click', '#submitform-submit', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const event = decisionform.trigger(decisionform.events.SUBMIT_BUTTON_PRESSED);
            if (!event.defaultPrevented) {
                decisionform.submitFormAjax();
            }
        });

        decisionform.addEventListener(decisionform.events.FORM_SUBMITTED, (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            $.ajax({
                url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                method: "POST",
                dataType: "text",
                data: {
                    action: 'get_item',
                    id: e.detail.id,
                    sesskey: M.cfg.sesskey,
                    contextid: M.cfg.courseContextId,
                    token: self.token,
                    cmid: self.cm,
                },
                success: function(data) {
                    const newAnnotation = JSON.parse(data);
                    dispatchEvent('annotationupdated', {
                        annotation: newAnnotation,
                        action: 'add'
                    });
                }
            });
            $('#annotationwrapper #form').remove();
            $('#annotationwrapper table').show();
            $('#addcontent, #interaction-timeline').removeClass('no-pointer-events');
        });

    }

    /**
     * Edit an annotation
     * @param {Array} annotations The annotations array
     * @param {number} id The annotation id
     * @returns {void}
     */
    editAnnotation(annotations, id) {
        // Disable pointer events on some DOMs.
        $('#addcontent, #interaction-timeline').addClass('no-pointer-events');
        this.annotations = annotations;
        let self = this;
        const annotation = annotations.find(x => x.id == id);
        const timestamp = annotation.timestamp;
        const timestampassist = this.convertSecondsToHMS(timestamp);

        annotation.timestampassist = timestampassist;
        annotation.start = this.convertSecondsToHMS(this.start);
        annotation.end = this.convertSecondsToHMS(this.end);
        annotation.contextid = M.cfg.contextid;

        $('#annotationwrapper table').hide();
        $('#annotationwrapper').append('<div id="form" class="w-100 p-3"></div>');
        const selector = document.querySelector(`#annotationwrapper #form`);
        const decisionform = new DynamicForm(selector, self.prop.form);
        decisionform.load(annotation);

        self.onEditFormLoaded(decisionform);
        self.validateTimestampFieldValue('timestampassist', 'timestamp');

        $(document).off('click', '#cancel-submit').on('click', '#cancel-submit', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $('#annotationwrapper #form').remove();
            $('#annotationwrapper table').show();
        });

        $(document).off('click', '#submitform-submit').on('click', '#submitform-submit', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const event = decisionform.trigger(decisionform.events.SUBMIT_BUTTON_PRESSED);
            if (!event.defaultPrevented) {
                decisionform.submitFormAjax();
            }
        });

        decisionform.addEventListener(decisionform.events.FORM_SUBMITTED, (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.annotations = this.annotations.filter(x => x.id != id);
            $.ajax({
                url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                method: "POST",
                dataType: "text",
                data: {
                    action: 'get_item',
                    id: e.detail.id,
                    sesskey: M.cfg.sesskey,
                    contextid: M.cfg.courseContextId,
                    token: self.token,
                    cmid: self.cm,
                },
            }).done(function(data) {
                const updated = JSON.parse(data);
                dispatchEvent('annotationupdated', {
                    annotation: updated,
                    action: 'edit'
                });
            });
            $('#annotationwrapper #form').remove();
            $('#annotationwrapper table').show();
            $('#addcontent, #interaction-timeline').removeClass('no-pointer-events');
        });
    }

    /**
     * Handles the loading of the edit form and initializes the destination list.
     *
     * @param {HTMLElement} form - The form element that is being edited.
     * @param {Event} event - The event that triggered the form load.
     * @returns {Object} An object containing the form and event.
     */
    onEditFormLoaded(form, event) {
        let self = this;
        let body = $('#annotationwrapper #form');

        const checkContentField = () => {
            if ($('[name=content]').length > 0) {
                let dest = $('[name=content]').val();
                if (dest == '' || JSON.parse(dest).length == 0) {
                    $('#destination-list').append(`<div class="input-group mb-1 d-none">
                <div class="input-group-prepend">
                    <label class="input-group-text">
                    <i class="bi bi-grip-vertical fs-unset cursor-move"></i></label>
                </div>
                <input type="text" class="form-control">
                <input type="text" value="${this.convertSecondsToHMS(this.start)}"
                placeholder="00:00:00" style="max-width: 120px;" class="form-control timestamp-input">
                <div class="input-group-append">
                <button class="btn add-dest btn-secondary" type="button"><i class="bi bi-plus-lg fs-unset"></i></button>
                <button class="btn btn-danger delete-dest disabled" disabled type="button">
                    <i class="bi bi-trash3-fill fs-unset"></i></button></div></div>`);
                } else {
                    dest = JSON.parse(dest);
                    dest.forEach((d, i) => {
                        $('#destination-list').append(`<div class="input-group mb-1">
                    <div class="input-group-prepend">
                    <label class="input-group-text">
                    <i class="bi bi-grip-vertical cursor-move fs-unset"></i></label>
                </div>
                    <input type="text" class="form-control" value="${d.title}">
                    <input type="text" value="${this.convertSecondsToHMS(d.timestamp)}"
                    placeholder="00:00:00" style="max-width: 120px;" class="form-control timestamp-input">
                    <div class="input-group-append">
                    <button class="btn add-dest btn-secondary" type="button"><i class="bi bi-plus-lg fs-unset"></i></button>
                    <button class="btn btn-danger delete-dest ${i == 0 ? 'disabled' : ''}" ${i == 0 ? 'disabled' : ''}
                    type="button"><i class="bi bi-trash3-fill fs-unset"></i></button></div></div>`);
                    });
                    $('.input-group [type="text"]').trigger('input');
                }

                $('#destination-list').sortable({
                    items: '.input-group',
                    cursor: 'move',
                    update: function() {
                        $('.input-group [type="text"]').trigger('input');
                    },
                    stop: function() {
                        $('.input-group .delete-dest').removeAttr('disabled');
                        $('.input-group .delete-dest').removeClass('disabled');
                        $('.input-group .delete-dest').first().attr('disabled', true);
                        $('.input-group .delete-dest').first().addClass('disabled');
                    }
                });
            } else {
                requestAnimationFrame(checkContentField);
            }
        };

        requestAnimationFrame(checkContentField);

        body.off('click', '#add-destination').on('click', '#add-destination', function() {
            const $last = $('#destination-list .input-group').last();
            $last.find('.add-dest').trigger('click');
        });

        body.off('click', '.input-group .add-dest').on('click', '.input-group .add-dest', async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let $thisrow = $(this);
            let $parent = $thisrow.closest('.input-group');
            let $row = $parent.clone();
            $row.removeClass('d-none');
            $row.find('input').val('');
            let currentTime = await self.player.getCurrentTime();
            $row.find('input.timestamp-input').val(self.convertSecondsToHMS(currentTime));
            $row.find('.delete-dest').removeClass('disabled').removeAttr('disabled');
            $parent.after($row);
            $parent.find('[type="text"]').trigger('input');
        });

        body.off('click', '.input-group .delete-dest').on('click', '.input-group .delete-dest', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $(this).closest('.input-group').remove();
            $('.input-group [type="text"]').trigger('input');
        });

        body.on('input', '.input-group [type="text"]', function() {
            let dest = [];
            $('#destination-list .input-group').each(function() {
                const title = $(this).find('input[type="text"]');
                const timestamp = $(this).find('.timestamp-input');
                if (title.val() != '' && timestamp.val() != ''
                    && !title.hasClass('is-invalid') && !timestamp.hasClass('is-invalid')) {
                    const parts = timestamp.val().split(':');
                    const seconds = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
                    dest.push({
                        title: title.val(),
                        timestamp: seconds
                    });
                }
            });
            $('[name=content').val(JSON.stringify(dest));
        });

        return {form, event};
    }

    /**
     * Run the interaction
     * @param {object} annotation The annotation object
     * @returns {void}
     */
    async runInteraction(annotation) {
        // Dismiss all tooltips.
        $('.tooltip').remove();
        this.player.pause();
        let self = this;
        let dest = JSON.parse(annotation.content);
        dest = dest.filter((d) => {
            return !self.isSkipped(d.timestamp);
        });

        if (dest.length == 0) {
            this.player.play();
            return;
        }

        if (!self.isEditMode()) {
            annotation.viewed = true;
            this.annotations = this.annotations.filter((d) => d.id != annotation.id);
            this.annotations.push(annotation);
        }

        let newannotation = JSON.parse(JSON.stringify(annotation));
        newannotation.content = JSON.stringify(dest);
        const data = await this.render(newannotation, 'json');
        let $html = `<div class="position-absolute decision text-center mx-auto w-100">
            <h5 class="pt-5 pb-3 bg-white" id="decision-q">
            <i class="mb-2 bi bi-signpost-split-fill" style="font-size: 2em"></i><br>${newannotation.formattedtitle}</h5>`;

        data.forEach((dest, order) => {
            $html += `<a href="javascript:void(0)" data-timestamp="${dest.timestamp}"
                 data-order="${order}" class="decision-option btn btn-outline-secondary btn-rounded mb-2 d-flex
                  justify-content-between align-items-center mx-auto"><span class="text-truncate">${dest.title}</span>
                  <i class="bi bi-chevron-right"></i></a>`;
        });
        $html += '</div>';
        let $message = $(`<div id="message" style="z-index:1005;display:none;" data-id="${annotation.id}">
            <div class="modal-body p-0 border" id="content">${$html}</div></div>`);
        $('#video-wrapper').find("#message").remove();
        $('#video-wrapper').append($message);
        $message.fadeIn(300, 'swing', function() {
            if (annotation.char1 == 1) {
                $message.append(`<button class="btn btn-secondary btn-rounded position-absolute"
                     id="close-decision" style="right: 1rem; top: 1rem;">
                     ${M.util.get_string('skip', 'ivplugin_decision')}
                     <i class="ml-2 bi bi-chevron-right"></i></button>`);
            }
            $(document).off('click', '#close-decision').on('click', '#close-decision', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                self.player.play();
                $('#taskinfo').fadeIn(300);
                $('[data-region="chapterlists"], #controller').removeClass('no-pointer-events');
            });

            if (!self.isEditMode()) {
                $('#taskinfo').fadeOut(300);
                $('[data-region="chapterlists"], #controller').addClass('no-pointer-events');
            }
        });

        $(document).off('click', `#message[data-id='${annotation.id}'] .decision-option`)
            .on('click', `#message[data-id='${annotation.id}'] .decision-option`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let time = Number($(this).data('timestamp'));
                if (time < this.start) {
                    time = this.start;
                } else if (time > this.end) {
                    time = this.end;
                }
                self.player.seek(time);
                $(`#message[data-id='${annotation.id}']`).fadeOut(300);
                self.player.play();
                $('#taskinfo').fadeIn(300);
                $('[data-region="chapterlists"], #controller').removeClass('no-pointer-events');
            });
    }
}