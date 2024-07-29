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
 * TODO describe module base
 *
 * @module     mod_interactivevideo/type/base
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import {renderContent, defaultDisplayContent, formatText} from 'mod_interactivevideo/displaycontent';
import {renderAnnotationItems} from 'mod_interactivevideo/viewannotation';
import {dispatchEvent} from 'core/event_dispatcher';
import {add as addToast} from 'core/toast';
import ModalForm from 'core_form/modalform';
import 'mod_interactivevideo/libraries/jquery-ui';

class Base {
    constructor(player, annotations, interaction, course, userid, completionpercentage,
        gradeiteminstance, grademax, vtype, preventskip, totaltime, start, end, properties, cm, token) {
        /**
         * Access token
         * @type {string}
         * @private
         */
        this.token = token;

        /**
         * The course module id
         * @type {number}
         * @private
         */
        this.cm = cm;

        /**
         * The player object
         * @type {Object}
         * @private
         */

        this.player = player;
        /**
         * The annotations object
         * @type {Array}
         * @private
         */
        this.annotations = annotations;
        /**
         * The interaction id
         * @type {number}
         * @private
         */
        this.interaction = interaction;
        /**
         * The course id
         * @type {number}
         * @private
         */
        this.course = course;
        /**
         * The user id
         * @type {number}
         * @private
         */
        this.userid = userid;
        /**
         * The required completion percentage set in the activity settings
         * @type {number}
         * @private
         */
        this.completionpercentage = completionpercentage;
        /**
         * The grade item instance id
         * @type {number}
         * @private
         */
        this.gradeiteminstance = gradeiteminstance;
        /**
         * The maximum grade set in the activity settings
         * @type {number}
         * @private
         */
        this.grademax = grademax;
        /**
         * The video type
         * @type {string} (yt, vimeo, dailymotion, html4video)
         * @private
         */
        this.vtype = vtype;
        /**
         * Prevent skipping of the video
         * @type {boolean}
         * @private
         * @default false
         */
        this.preventskip = preventskip;
        /**
         * The total time of the video in seconds including the skipped segments.
         * @type {number}
         * @private
         */
        this.totaltime = totaltime;
        /**
         * The start time of the video
         * @type {number}
         * @private
         */
        this.start = start;
        /**
         * The end time of the video
         * @type {number}
         * @private
         */
        this.end = end;
        /**
         * Properties of the interaction type defined in the php class
         * @type {Object}
         * @private
         */
        this.prop = properties;
    }

    /**
     * Enable the HTML5 color picker in form elements
     * @returns {void}
     */
    enableColorPicker() {
        $(document).on('change', 'input[type="color"]', function() {
            const color = $(this).val();
            $(this).closest('.color-picker').css('background-color', color);
            $(this).closest('.fitem').find('input[type="text"]').val(color);
        });
    }

    formatContent(text, shorttext = false) {
        return formatText(text, shorttext);
    }

    render(annotation, format = 'html') {
        return new Promise((resolve) => {
            resolve(renderContent(annotation, format));
        });
    }

    addNotification(msg, type = "danger") {
        addToast(msg, {type});
    }
    /**
     * Initialize the interaction type
     * @returns {void}
     */
    init() {
        // Do nothing.
    }
    /**
     * Check if the interaction is skipped
     * @param {number} timestamp The timestamp of the interaction
     * @returns {boolean}
     */
    isSkipped(timestamp) {
        return this.isInSkipSegment(timestamp) || !this.isBetweenStartAndEnd(timestamp);
    }

    convertSecondsToHMS(s) {
        const hours = Math.floor(s / 3600);
        const minutes = Math.floor(s % 3600 / 60);
        const seconds = Math.floor(s % 3600 % 60);
        return (hours < 10 ? '0' + hours : hours) + ':' +
            (minutes < 10 ? '0' + minutes : minutes) + ':' +
            (seconds < 10 ? '0' + seconds : seconds);
    }

    /**
     * Render edit items
     * @param {Array} annotations The annotations array
     * @param {Object} listItem The list item
     * @param {Object} item The annotation object
     * @returns {void}
     */
    renderEditItem(annotations, listItem, item) {
        this.annotations = annotations;
        listItem.removeAttr('id').removeClass('d-none');
        listItem.attr('data-type', item.type);
        listItem.addClass(item.type + (this.isSkipped(item.timestamp) ? ' skipped' : ''));
        listItem.attr('data-timestamp', item.timestamp)
            .attr('data-id', item.id);

        listItem.find('.timestamp').text(this.convertSecondsToHMS(item.timestamp))
            .attr('data-timestamp', item.timestamp);

        listItem.find('.title').text(item.formattedtitle);
        if (this.prop.hascompletion) {
            listItem.find('.btn.xp span').text(item.xp);
            listItem.attr('data-xp', item.xp);
        } else {
            listItem.find('.btn.xp').remove();
        }

        listItem.find('.type-icon i').addClass(this.prop.icon);
        listItem.find('.type-icon').attr('title', this.prop.title);
        // If out of range, make the title text grey
        if (Number(item.timestamp) > this.end || Number(item.timestamp) < this.start || this.isSkipped(item.timestamp)) {
            listItem.find('.title').addClass('text-secondary');
            listItem.attr('data-xp', 0);
            // Append a badge to the title
            listItem.find('.title')
                .append(`<span class="badge badge-warning ml-2">
                            ${M.util.get_string('skipped', 'mod_interactivevideo')}</span>`);
        }

        listItem.find('[data-field]').attr('data-id', item.id);
        listItem.find('[data-field="xp"]').val(item.xp);
        listItem.find('[data-field="title"]').val(item.title);
        listItem.find('[data-field="timestamp"]').val(this.convertSecondsToHMS(item.timestamp));
        if (!this.prop.allowmultiple) {
            listItem.find('.btn.copy').remove();
        }
        listItem.appendTo('#annotation-list');
        return listItem;
    }

    /**
     * Check if the timestamp is between the start and end
     * @param {number} timestamp The timestamp
     * @returns {boolean}
     */
    isBetweenStartAndEnd(timestamp) {
        return timestamp <= this.end && timestamp >= this.start;
    }

    /**
     * Check if the annotation is already added at the timestamp
     * @param {number} timestamp The timestamp
     * @returns {boolean}
     */
    isAlreadyAdded(timestamp) {
        return this.annotations.some(x => x.timestamp == timestamp);
    }

    /**
     * Check if the annotation is in the skip segment
     * @param {number} timestamp The timestamp
     * @returns {boolean}
     */
    isInSkipSegment(timestamp) {
        return this.annotations.some(x => x.type == 'skipsegment'
            && Number(x.timestamp) < Number(timestamp) && Number(x.title) > Number(timestamp));
    }

    /**
     * Validate the timestamp format
     * @param {string} timestamp The timestamp
     * @returns {boolean}
     */
    validateTimestampFormat(timestamp) {
        const regex = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/;
        return regex.test(timestamp);
    }

    /**
     * Validate the timestamp
     * @param {string} fld The field
     * @param {string} hiddenfield The hidden field
     * @returns {void}
     */
    validateTimestampFieldValue(fld, hiddenfield) {
        var self = this;
        $(document).on('change', `form [name=${fld}]`, function(e) {
            e.preventDefault();
            // Make sure the timestamp format is hh:mm:ss.
            if (!self.validateTimestampFormat($(this).val())) {
                self.addNotification(M.util.get_string('invalidtimestampformat', 'mod_interactivevideo'));
                $(this).val($(this).attr('data-initial-value'));
                return;
            }

            // Make sure the timestamp is between the start and end time.
            var parts = $(this).val().split(':');
            var timestamp = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
            if (!self.isBetweenStartAndEnd(timestamp)) {
                var message = M.util.get_string('timemustbebetweenstartandendtime', 'mod_interactivevideo', {
                    "start": self.convertSecondsToHMS(self.start),
                    "end": self.convertSecondsToHMS(self.end),
                });
                self.addNotification(message);
                $(this).val($(this).attr('data-initial-value'));
                return;
            }

            // Make sure the timestamp does not already exist.
            if (self.isAlreadyAdded(timestamp)) {
                self.addNotification(M.util.get_string('interactionalreadyexists', 'mod_interactivevideo'));
                $(this).val($(this).attr('data-initial-value'));
                return;
            }

            // Make sure the timestamp is not in the skip segment.
            if (self.isInSkipSegment(timestamp)) {
                self.addNotification(M.util.get_string('interactionisbetweentheskipsegment', 'mod_interactivevideo'));
                $(this).val($(this).attr('data-initial-value'));
                return;
            }

            $(`form [name=${hiddenfield}]`).val(timestamp);

            self.player.seek(timestamp, true);
            // Make sure the video is paused.
            self.player.pause();
        });
    }

    /**
     * Add an annotation
     * @param {Array} annotations The annotations array
     * @param {number} timestamp The timestamp
     * @param {number} coursemodule The course module id
     * @returns {void}
     */
    addAnnotation(annotations, timestamp, coursemodule) {
        var self = this;
        this.annotations = annotations;
        if (!this.isBetweenStartAndEnd(timestamp)) {
            var message = M.util.get_string('interactioncanonlybeaddedbetweenstartandendtime', 'mod_interactivevideo', {
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
            start: startHMS,
            end: endHMS,
            contextid: M.cfg.contextid,
            type: self.prop.name,
            courseid: self.course,
            cmid: coursemodule,
            annotationid: self.interaction,
            hascompletion: self.prop.hascompletion ? 1 : 0,
        };

        var form = new ModalForm({
            formClass: self.prop.form,
            args: data,
            modalConfig: {
                title: M.util.get_string('addinteractiontitle', 'mod_interactivevideo', {
                    "name": self.prop.title.toLowerCase(),
                    "time": timestampHMS
                }),
            }
        });
        $("#contentmodal").modal('hide');
        $('#addcontentdropdown a').removeClass('active');
        form.show();

        form.addEventListener(form.events.LOADED, (e) => {
            setTimeout(() => {
                $('body').addClass('modal-open');
            }, 500);
            try {
                self.onEditFormLoaded(form, e);
            } catch (error) {
                // Do nothing.
            }
            self.validateTimestampFieldValue('timestampassist', 'timestamp');

            // Make form draggable.
            form.modal.modal.draggable({
                handle: ".modal-header"
            });
        });

        form.addEventListener(form.events.FORM_SUBMITTED, (e) => {
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
                    var newAnnotation = JSON.parse(data);
                    dispatchEvent('annotationupdated', {
                        annotation: newAnnotation,
                        action: 'add'
                    });
                }
            });
        });
    }

    /**
     * Copy an annotation
     * @param {number} id The annotation id
     * @returns {void}
     */
    cloneAnnotation(id) {
        $.ajax({
            url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
            method: "POST",
            dataType: "text",
            data: {
                action: 'copy_item',
                id: id,
                sesskey: M.cfg.sesskey,
                contextid: M.cfg.contextid,
                token: this.token,
                cmid: this.cm,
            },
            success: function(data) {
                var newAnnotation = JSON.parse(data);
                dispatchEvent('annotationupdated', {
                    annotation: newAnnotation,
                    action: 'clone'
                });
            }
        });
    }

    /**
     * Edit an annotation
     * @param {Array} annotations The annotations array
     * @param {number} id The annotation id
     * @returns {void}
     */
    editAnnotation(annotations, id) {
        this.annotations = annotations;
        let self = this;
        const annotation = annotations.find(x => x.id == id);
        const timestamp = annotation.timestamp;
        const timestampassist = this.convertSecondsToHMS(timestamp);

        annotation.timestampassist = timestampassist;
        annotation.start = this.convertSecondsToHMS(this.start);
        annotation.end = this.convertSecondsToHMS(this.end);
        annotation.hascompletion = this.prop.hascompletion ? 1 : 0;
        annotation.contextid = M.cfg.contextid;

        const title = annotation.type === 'skipsegment'
            ? M.util.get_string('skipsegmentcontent', 'ivplugin_skipsegment').toLowerCase()
            : annotation.formattedtitle;

        const form = new ModalForm({
            formClass: this.prop.form,
            args: annotation,
            modalConfig: {
                title: M.util.get_string("editinteractiontitle", "mod_interactivevideo", {
                    name: title,
                    time: timestampassist
                }),
            }
        });

        form.show();

        form.addEventListener(form.events.LOADED, (e) => {
            try {
                this.onEditFormLoaded(form, e);
            } catch (error) {
                // Do nothing.
            }
            this.validateTimestampFieldValue('timestampassist', 'timestamp');

            // Make form draggable.
            form.modal.modal.draggable({
                handle: ".modal-header"
            });
        });

        form.addEventListener(form.events.FORM_SUBMITTED, (e) => {
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
                var updated = JSON.parse(data);
                dispatchEvent('annotationupdated', {
                    annotation: updated,
                    action: 'edit'
                });
            });
        });
    }

    /**
     * Delete an annotation
     * @param {Array} annotations The annotations array
     * @param {number} id The annotation id
     * @returns {void}
     */
    deleteAnnotation(annotations, id) {
        this.annotations = annotations;
        const annotation = this.annotations.find(x => x.id == id);
        $.ajax({
            url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
            method: "POST",
            dataType: "text",
            data: {
                action: 'delete_item',
                sesskey: M.cfg.sesskey,
                id: id,
                contextid: M.cfg.contextid,
                token: this.token,
                cmid: this.cm,
            },
            success: function() {
                dispatchEvent('annotationdeleted', {
                    annotation: annotation,
                });
            },
        });
    }

    /**
     * Dispatch an event when an interaction is run
     * @param {Object} annotation The annotation object
     * @param {Object} data The data to be passed
     */
    interactionRunEvent(annotation, data) {
        dispatchEvent('interactionrun', {
            annotation: annotation,
            data: data,
        });
    }

    /**
     * Called when the edit form is loaded.
     * @param {Object} form The form
     * @return {void}
     */
    onEditFormLoaded(form) {
        return form.modal.modal.find('.modal-body');
    }

    /**
     * Called after the annotation is edited/added/quick edited (after everything is rendered).
     * @param {Object} annotation The annotation object
     * @return {void}
     */
    postEditCallback(annotation) {
        return this.runInteraction(annotation);
    }

    /**
     * Check if the page is in edit mode
     * @returns {boolean}
     */
    isEditMode() {
        return $('body').hasClass('page-interactions');
    }

    /**
     * Check if the annotation is clickable from video navigation
     * @param {Object} annotation
     * @returns boolean
     */
    isClickable(annotation) {
        if (this.isEditMode()) {
            return true;
        }
        const advanced = JSON.parse(annotation.advanced);
        return (advanced.clickablebeforecompleted == "1" && !annotation.completed)
            || (advanced.clickableaftercompleted == "1" && annotation.completed);
    }

    /**
     * Visibility on the video navigation
     * @param {Object} annotation
     * @returns boolean
     */
    isVisible(annotation) {
        if (this.isEditMode()) {
            return true;
        }
        const advanced = JSON.parse(annotation.advanced);
        return (advanced.visiblebeforecompleted == "1" && !annotation.completed)
            || (advanced.visibleaftercompleted == "1" && annotation.completed);
    }

    /**
     * Render the item on the video navigation
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    renderItemOnVideoNavigation(annotation) {
        if (annotation.timestamp < this.start || annotation.timestamp > this.end) {
            return;
        }
        const percentage = ((Number(annotation.timestamp) - this.start) / this.totaltime) * 100;
        if (this.isVisible(annotation)) {
            $("#video-nav ul").append(`<li class="annotation ${annotation.completed ? "completed" : ""}
        ${annotation.type} ${this.isClickable(annotation) ? '' : 'no-pointer-events'} li-draggable
         ${this.isSkipped(annotation.timestamp) ? 'skipped' : ''}"  data-timestamp="${annotation.timestamp}"
        data-id="${annotation.id}" style="left: calc(${percentage}% - 5px)">
        <div class="item" data-toggle="tooltip" data-container="#wrapper"
        data-trigger="hover" data-placement="top" data-html="true" data-original-title='<i class="${this.prop.icon} mr-1"></i>
        ${annotation.formattedtitle}'></div></li>`);
        }
    }

    /**
     * Render the viewer for the annotation
     * @param {Object} annotation The annotation object
     * @returns {Promise}
     */
    renderViewer(annotation) {
        return new Promise((resolve) => {
            resolve(defaultDisplayContent(annotation, this.player, this.start, this.end));
        });
    }

    /**
     * Render the container for the annotation
     */
    renderContainer() {
        // Do nothing.
    }

    /**
     * Callback to excute after the content is rendered.
     * @returns {void}
     */
    postContentRender() {
        // Do nothing.
    }

    /**
     * Callback to excute after the content is rendered in the editor.
     */
    postContentRenderEditor() {
        // Do nothing.
    }

    /**
     * Set draggable
     * @param {string} elem The element to make draggable
     */
    setModalDraggable(elem) {
        $(elem).draggable({
            handle: ".modal-header"
        });
    }

    /**
     * Callback to excute after item is successfully marked complete or incomplete.
     * @param {Array} annotations Updated annotations
     * @param {Object} thisItem The current annotation
     * @param {string} action The action performed (e.g. mark-done, mark-undone)
     * @param {string} type The type of completion (e.g. manual, automatic)
     */
    completionCallback(annotations, thisItem, action, type) {
        const $message = $(`#message[data-id='${thisItem.id}']`);
        const $toggleButton = $message.find(`#completiontoggle`);
        if (type == 'manual') {
            $toggleButton.prop('disabled', false);
            $toggleButton.find(`i`)
                .removeClass('fa-spin bi-arrow-repeat')
                .addClass(action == 'mark-done' ? 'bi-check2' : 'bi-circle');
            $toggleButton.find(`span`).show();
        } else if (type == 'automatic') {
            $toggleButton.find(`i`).toggleClass('bi-check2 bi-circle');
        }

        let audio;
        if (action == 'mark-done') {
            $toggleButton
                .removeClass('btn-secondary mark-done')
                .addClass('btn-success mark-undone');
            // Play a popup sound.
            audio = new Audio(M.cfg.wwwroot + '/mod/interactivevideo/sounds/point-awarded.mp3');
            audio.play();
        } else if (action == 'mark-undone') {
            $toggleButton
                .removeClass('btn-success mark-undone').addClass('btn-secondary mark-done');
            // Play a popup sound.
            audio = new Audio(M.cfg.wwwroot + '/mod/interactivevideo/sounds/pop.mp3');
            audio.play();
        }

        // Update the completion button.
        $toggleButton.find(`span`).text('');
        if (thisItem.xp > 0) {
            if (action == 'mark-undone') {
                this.addNotification(M.util.get_string('xplost', 'mod_interactivevideo', thisItem.xp), 'info');
            } else if (action == 'mark-done') {
                this.addNotification(M.util.get_string('xpearned', 'mod_interactivevideo', thisItem.xp), 'success');
            }
        }

        if (type == 'manual') {
            if (action == 'mark-done') {
                $toggleButton.find(`span`)
                    .text(`${M.util.get_string('completionmarkincomplete', 'mod_interactivevideo')}`);
            } else if (action == 'mark-undone') {
                $toggleButton.find(`span`)
                    .text(`${M.util.get_string('completionmarkcomplete', 'mod_interactivevideo')}`);
            }
        } else if (type == 'automatic') {
            if (action == 'mark-done') {
                $toggleButton.find(`span`)
                    .text(`${M.util.get_string('completioncompleted', 'mod_interactivevideo')}`);
            } else if (action == 'mark-undone') {
                $toggleButton.find(`span`)
                    .text(`${M.util.get_string('completionincomplete', 'mod_interactivevideo')}`);
            }
        }
        return 'done';
    }

    /**
     * Toggle completion of an item
     * @param {number} id The annotation id
     * @param {string} action The action to perform (mark-done, mark-undone)
     * @param {string} type The type of completion (manual, automatic)
     * @returns {Promise}
     */
    toggleCompletion(id, action, type = 'manual') {
        let self = this;
        // Skip if the page is the interactions page.
        if (this.isEditMode()) {
            return Promise.resolve(); // Return a resolved promise for consistency
        }
        // Gradable items (hascompletion and not in the skipsegment)
        const gradableitems = this.annotations.filter(x => x.hascompletion == '1');

        const totalXp = gradableitems.map(x => Number(x.xp)).reduce((a, b) => a + b, 0);
        let completedItems = gradableitems.filter(x => x.completed);
        let earnedXp = completedItems.map(x => Number(x.xp)).reduce((a, b) => a + b, 0);
        completedItems = completedItems.map(x => x.id);
        let thisItem = gradableitems.find(x => x.id == id);
        if (action == 'mark-done') {
            completedItems.push(id.toString());
            earnedXp += Number(thisItem.xp);
        } else if (action == 'mark-undone') {
            completedItems = completedItems.filter(x => x != id);
            earnedXp -= Number(thisItem.xp);
        }

        let completed = 0;
        if ((completedItems.length / gradableitems.length) * 100 >= Number(this.completionpercentage)) {
            completed = 1;
        }

        return new Promise((resolve) => {
            $.ajax({
                url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                method: "POST",
                dataType: "text",
                data: {
                    action: 'save_progress',
                    sesskey: M.cfg.sesskey,
                    id: this.interaction,
                    uid: this.userid,
                    percentage: (completedItems.length / gradableitems.length) * 100,
                    g: parseFloat((earnedXp / totalXp) * this.grademax).toFixed(2),
                    gradeiteminstance: this.gradeiteminstance,
                    c: completed,
                    xp: earnedXp,
                    completeditems: JSON.stringify(completedItems),
                    token: self.token,
                    cmid: self.cm,
                },
                success: () => {
                    // Update the annotations array.
                    var annotations = this.annotations.map(x => {
                        if (x.id == id) {
                            x.completed = action == 'mark-done' ? true : false;
                        }
                        return x;
                    });

                    renderAnnotationItems(annotations, this.start, this.totaltime);

                    this.completionCallback(annotations, thisItem, action, type);
                    dispatchEvent('interactionCompletionUpdated', {
                        annotations: annotations,
                        completionpercentage: (completedItems.length / gradableitems.length) * 100,
                        grade: parseFloat((earnedXp / totalXp) * this.grademax).toFixed(2),
                        completed: completed,
                        xp: earnedXp,
                        completeditems: completedItems,
                        target: thisItem,
                        action: action,
                        type: type
                    });
                    resolve();
                }
            });
        });
    }

    /**
     * Enable manual completion of item
     * @returns {void}
     */
    enableManualCompletion() {
        var self = this;
        $(document).on('click', '#message button#completiontoggle', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $(this).attr('disabled', true);
            $(this).find('i').removeClass('bi-check2 bi-circle').addClass('fa-spin bi-arrow-repeat');
            $(this).find('span').hide();
            // Get the completed items
            var annoid = $(this).data('id');
            self.toggleCompletion(annoid, $(this).hasClass('mark-done') ? 'mark-done' : 'mark-undone', 'manual');
        });
    }

    /**
     * What happens when an item runs
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    runInteraction(annotation) {
        this.player.pause();
        // Apply content.
        const applyContent = (annotation) => {
            this.render(annotation, 'html').then((data) => {
                let $message = $(`#message[data-id='${annotation.id}']`);
                $message.find(`.modal-body`).html(data);
                $message.find(`.modal-body`).attr('id', 'content');
                this.postContentRender(annotation);
                this.interactionRunEvent(annotation, data);
            });
        };

        this.renderViewer(annotation).then(() => {
            this.renderContainer(annotation);
            applyContent(annotation);
        });

        this.enableManualCompletion();

        if (annotation.displayoptions == 'popup') {
            let self = this;
            $('#annotation-modal').on('shown.bs.modal', function() {
                self.setModalDraggable('#annotation-modal .modal-dialog');
            });
        }

    }

    /**
     * Data to show when the report viewer clicks on the completion checkmark
     * @param {Object} annotation the current annotation
     * @param {Number} userid the user id
     * @returns {Promise}
     */
    getCompletionData(annotation, userid) {
        return Promise.resolve({
            annotation: annotation,
            userid: userid
        });
    }

    /**
     * View when the report viewer clicks on the title of the interaction item on the report page
     * @param {Object} annotation the annotation
     * @returns {void}
     */
    displayReportView(annotation) {
        this.render(annotation, 'html').then((data) => {
            let $message = $(`#message[data-id='${annotation.id}']`);
            $message.find(`.modal-body`).html(data);
            $message.find(`.modal-body`).attr('id', 'content');
            this.postContentRender(annotation);
        });
    }

    /**
     * Get the log data for multiple users from annotation_log table
    * @param {Object} annotation the annotation
     * @param {Array} userids array of user ids
     * @returns {Promise}
     */
    getLogs(annotation, userids) {
        let self = this;
        return new Promise((resolve) => {
            $.ajax({
                url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                method: "POST",
                dataType: "text",
                data: {
                    action: 'get_logs_by_userids',
                    annotationid: annotation.id,
                    contextid: M.cfg.contextid,
                    userids: userids,
                    sesskey: M.cfg.sesskey,
                    token: self.token,
                    cmid: self.cm,
                },
                success: (data) => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        resolve([]);
                    }
                }
            });
        });
    }


}

export default Base;