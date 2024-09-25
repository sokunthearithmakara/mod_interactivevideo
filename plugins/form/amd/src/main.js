/* eslint-disable complexity */
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
 * Main class for the form plugin.
 *
 * @module     ivplugin_form/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Base from 'mod_interactivevideo/type/base';
import Ajax from 'core/ajax';
import {dispatchEvent} from 'core/event_dispatcher';
import 'mod_interactivevideo/libraries/jquery-ui';
import Templates from 'core/templates';
import DynamicForm from 'core_form/dynamicform';
import {renderAnnotationLogs} from 'mod_interactivevideo/report';
import {notifyFilterContentUpdated as notifyFilter} from 'core_filters/events';
import Notification from 'core/notification';
export default class Form extends Base {
    /**
     * Do nothing on the interactions page.
     */
    postEditCallback() {
        // Do nothing
    }

    /**
     * Render the main container for the form plugin.
     * @param {Object} annotation annotation object
     */
    async renderViewer(annotation) {
        let self = this;
        if (this.isEditMode()) {
            let formfields = [
                {
                    'icon': 'bi bi-alphabet-uppercase',
                    'type': 'header',
                    'label': M.util.get_string('headerfield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-text-paragraph',
                    'type': 'html',
                    'label': M.util.get_string('htmlfield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-hr',
                    'type': 'linebreak',
                    'label': M.util.get_string('linebreakfield', 'ivplugin_form'),
                },
                {
                },
                {
                    'icon': 'bi bi-input-cursor-text',
                    'type': 'text',
                    'label': M.util.get_string('textfield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-textarea-resize',
                    'type': 'textarea',
                    'label': M.util.get_string('textareafield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-card-text',
                    'type': 'editor',
                    'label': M.util.get_string('editorfield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-menu-button-wide',
                    'type': 'select',
                    'label': M.util.get_string('selectfield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-check2-square',
                    'type': 'advcheckbox',
                    'label': M.util.get_string('advcheckboxfield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-record-circle',
                    'type': 'radio',
                    'label': M.util.get_string('radiofield', 'ivplugin_form'),
                },
                {
                },
                {
                    'icon': 'bi bi-calendar3-event',
                    'type': 'date',
                    'label': M.util.get_string('dateselectorfield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-calendar3-week',
                    'type': 'week',
                    'label': M.util.get_string('weekfield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-calendar3',
                    'type': 'month',
                    'label': M.util.get_string('monthfield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-clock',
                    'type': 'time',
                    'label': M.util.get_string('timefield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-stopwatch',
                    'type': 'duration',
                    'label': M.util.get_string('durationfield', 'ivplugin_form'),
                },
                {
                },
                {
                    'icon': 'bi bi-sliders2',
                    'type': 'range',
                    'label': M.util.get_string('rangefield', 'ivplugin_form'),
                },
                {
                },
                {
                    'icon': 'bi bi-file-earmark-arrow-up',
                    'type': 'filemanager',
                    'label': M.util.get_string('filemanagerfield', 'ivplugin_form'),
                }
            ];
            const dataForTemplate = {
                id: annotation.id,
                items: formfields,
            };
            const template = await Templates.render('ivplugin_form/formedit_modal', dataForTemplate);
            let $modal = $(template);
            $modal.appendTo('body');
            $('#form-modal').modal('show');

            $('#form-modal').on('hidden.bs.modal', function() {
                $(this).remove();
            });

            $('#form-modal').on('shown.bs.modal', async function() {
                let content = await self.render(annotation, 'json');
                self.postContentRender(annotation, formfields, content);
            });

            $(`#message[data-id='${annotation.id}']`).find('#content')
                .append(`<div id="formjson" class="d-none"></div>`);
        } else {
            await super.renderViewer(annotation);
            let content = await self.render(annotation, 'json');
            $(`#message[data-id='${annotation.id}']`).find('#content')
                .append(`<div id="formmeta" class="mb-3 d-flex"></div><div id="form-preview"></div>
                    <div id="formjson" class="d-none"></div>`);
            this.postContentRender(annotation, '', content);
        }
    }

    /**
     * Apply render changes after the form is rendered.
     */
    postFormRender() {
        $('form .fitem [data-type="time"]').attr('type', 'time');
        $('form .fitem [data-type="week"]').attr('type', 'week');
        $('form .fitem [data-type="month"]').attr('type', 'month');
        $('form .fitem [data-type="date"]').attr('type', 'date');
        $('form .fitem textarea:visible').trigger('input');
        $('form .fitem [data-type="datetime"]').attr('type', 'datetime-local');
        $('form .fitem [data-type="range"]').attr('type', 'range').removeClass('form-control').addClass('form-control-range');
        $(document).off('click', 'form .fitem .filemanager.fm-noitems')
            .on('click', 'form .fitem .filemanager.fm-noitems', function(e) {
                e.stopImmediatePropagation();
                if ($('#wrapper').hasClass('fullscreen')) {
                    setTimeout(() => {
                        const uploadModal = $('.moodle-dialogue-base[aria-hidden="false"]');
                        // Move modal from body to current form.
                        uploadModal.appendTo('#wrapper');
                        $('body > .moodle-dialogue-base[aria-hidden="false"]').remove();
                    }, 300);
                }
            });
    }

    /**
     * Render the input group lists for repeatable options.
     * @param {String} node selector for the form container
     */
    repeatableValues(node) {
        $(`${node} form .fitem [data-type="keyvalue"]`).each(function() {
            let $this = $(this);
            let dataId = $this.attr('data-id');
            // Remove the existing repeatable div
            $(`div#${dataId}-repeatable`).remove();

            let defaultValues = $(`input[type="hidden"][data-type="default"][data-id=${dataId}]`).val().split(",");
            let value = $this.val();
            let isRadio = $(this).attr('data-radio') == 'true';
            let rows = value.split("\n");
            let html = '';
            if (value != '' && rows.length > 0) {
                rows.forEach(function(row, i) {
                    let rowvalues = row.split('=');
                    let key = rowvalues[0].trim();
                    let val = rowvalues[1].trim();
                    if (key != '' && val != '') {
                        html += `<div class="input-group mb-1 w-100 flex-nowrap align-items-center">
                        <div class="input-group-text border-0 rounded-0 pl-0">
                            <i class="bi bi-grip-vertical mr-2 cursor-move"></i>
                            <input type="checkbox" ${defaultValues.includes(key) ? 'checked' : ''}>
                        </div>
                        <input type="text" class="form-control key" value="${key}">
                        <input type="text" value="${val}" class="form-control value">
                        <div class="input-group-append">
                        <button class="btn add-row btn-secondary" type="button"><i class="bi bi-plus-lg"></i></button>
                        <button class="btn btn-danger delete-row rounded-0" ${i == 0 ? 'disabled' : ''} type="button">
                        <i class="bi bi-trash3-fill"></i></button>
                        </div></div>`;
                    }
                });
            } else {
                html = `<div class="input-group mb-1 w-100 flex-nowrap align-items-center">
                        <div class="input-group-text border-0 rounded-0 pl-0">
                            <i class="bi bi-grip-vertical mr-2 cursor-move"></i>
                            <input type="checkbox"/>
                        </div>
                        <input type="text" class="form-control key">
                        <input type="text" class="form-control value">
                        <div class="input-group-append">
                        <button class="btn add-row btn-secondary" type="button"><i class="bi bi-plus-lg"></i></button>
                        <button class="btn btn-danger delete-row rounded-0 disabled" disabled type="button">
                        <i class="bi bi-trash3-fill"></i></button>
                        </div></div>`;
            }
            $this.after(`<div id="${dataId}-repeatable" data-radio="${isRadio}" data-id="${dataId}"
                 class="w-100 repeatable">${html}</div>`);
            $this.addClass('d-none');
            $(`form .fitem #${dataId}-repeatable`).sortable({
                placeholder: "ui-state-highlight",
                handle: '.bi-grip-vertical',
                stop: function() {
                    // Handle delete buttons. The first one should be disabled.
                    $(`${node} form .repeatable .delete-row`).removeClass('disabled').removeAttr('disabled');
                    $(`${node} form .repeatable .delete-row`).first().addClass('disabled').attr('disabled', 'disabled');
                    $(`${node} form .repeatable input[type=text]`).trigger('input');
                }
            });
        });
        $(document).on('click', `${node} .repeatable .add-row`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let $thisrow = $(this);
            let $parent = $thisrow.closest('.input-group');
            let $row = $parent.clone();
            $row.find('input').val('');
            $row.find('input[type="checkbox"]').prop('checked', false);
            $row.find('.delete-row').removeClass('disabled').removeAttr('disabled');
            $parent.after($row);
        });
        $(document).on('click', `${node} .repeatable .delete-row`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let $thisrow = $(this);
            let $parent = $thisrow.closest('.input-group');
            $parent.remove();
            $(`${node} form .repeatable input[type=text]`).trigger('input');
        });
        $(document).on('input change', `${node} form .repeatable input`, function() {
            let $this = $(this);
            let $parent = $this.closest('.repeatable');
            let $inputs = $parent.find('.input-group');
            let values = {};
            let defaultValues = [];
            let isRadio = $parent.attr('data-radio') == 'true';
            if (isRadio && $this.attr('type') == 'checkbox') {
                // Make sure only one checkbox is checked.
                $inputs.find('input[type="checkbox"]').not(this).prop('checked', false);

            }
            $inputs.each(function() {
                let $input = $(this);
                if ($input.find('input.key').val() != '' && $input.find('input.value').val() != '') {
                    let checkbox = $input.find('input[type="checkbox"]');
                    if (checkbox.prop('checked')) {
                        defaultValues.push($input.find('input.key').val().trim());
                    }
                    values[$input.find('input.key').val().trim()] = $input.find('input.value').val().trim();
                }

            });
            let keys = Object.keys(values);
            let rows = keys.map((key) => key + '=' + values[key]);
            $('textarea[data-id="' + $parent.attr('data-id') + '"]').val(rows.join("\n"));
            defaultValues = [...new Set(defaultValues)];
            $('input[type="hidden"][data-type="default"][data-id="' + $parent.attr('data-id') + '"]').val(defaultValues.join(","));
        });
    }

    /**
     * Override the postContentRender method for the form plugin.
     * @param {Object} annotation annotation object
     * @param {Array} formfields form fields data
     * @param {Object} content form content data
     * @param {Boolean} reportpage report page flag
     * @return {void}
     */
    postContentRender(annotation, formfields, content, reportpage = false) {
        let self = this;
        const $message = $(`#message[data-id='${annotation.id}']`);
        if (annotation.text1 != 0) {
            $message.find(`#formmeta`)
                .append(`<div class="duedate">${M.util.get_string('duedate', 'ivplugin_form')}: ${content.duedate}</div>`);
        }

        /**
         * Fetch form submission data of the current user.
         * @returns {Promise} form submission data
         * @throws {Error} if an error occurs
         */
        const fetchData = () => {
            return new Promise((resolve, reject) => {
                Ajax.call([{
                    args: {
                        userid: this.userid,
                        cmid: annotation.annotationid,
                        annotationid: annotation.id,
                        contextid: M.cfg.contextid,
                    },
                    contextid: M.cfg.contextid,
                    methodname: 'ivplugin_form_get_log',
                }])[0].then((response) => {
                    resolve(JSON.parse(response.record));
                }).catch((err) => {
                    // Do nothing.
                    reject(err);
                });
            });
        };

        /**
         * Form fields data.
         * @type {Array}
         */
        let formjson = [];

        /**
         * Render the list of form fields.
         * @param {Array} fields form fields data
         */
        const renderList = (fields) => {
            $(`#form-field-list`).empty();
            if (fields) {
                fields.forEach((item) => {
                    let icon = formfields.find((field) => field.type === item.type).icon;
                    $(`#form-field-list`)
                        .append(`<li class="list-group-item d-flex align-items-start justify-content-between p-0"
                         data-id="${item.id}" data-type="${item.type}">
                                    <div class="d-flex align-items-start pt-1">
                                    <i class="bi bi-grip-vertical px-2 cursor-move"></i>
                                    <i class="${icon} mr-2"></i>
                                    <div class="d-inline-block field-label cursor-pointer">${item.formattedlabel}</div></div>
                                    <div class="ml-auto d-flex">
                                        <button class="btn btn-sm rounded-0 editfield"
                                         title="${M.util.get_string('edit', 'mod_interactivevideo')}">
                                         <i class="bi bi-pencil-square"></i></button>
                                        <button class="btn btn-sm rounded-0 copyfield"
                                         title="${M.util.get_string('clone', 'mod_interactivevideo')}">
                                         <i class="bi bi-copy"></i></button>
                                        <button class="btn btn-sm rounded-0 text-danger deletefield"
                                         title="${M.util.get_string('delete', 'mod_interactivevideo')}">
                                         <i class="bi bi-trash3"></i></button>
                                        </div>
                                </li>`);
                });
            }
            $message.find(`#formjson`).text(JSON.stringify(fields));
        };

        let tracking = [];
        let trackingIndex = 0;
        /**
         * Update tracking data for redo and undo
         * @param {Array} fields array of form fields
         * @param {Array} actives array of active items
         */
        const saveTracking = (fields, actives) => {
            if (trackingIndex < tracking.length - 1) {
                // Remove all the tracking data after the current index.
                tracking = tracking.slice(0, trackingIndex + 1);
            }
            tracking.push({
                items: JSON.stringify(fields),
                actives: actives,
                at: new Date().getTime(),
            });
            tracking.sort((a, b) => a.at - b.at);
            trackingIndex = tracking.length - 1;
            $('#save-close #undo').removeAttr('disabled');
            $('#save-close #redo').attr('disabled', 'disabled');
            if (tracking.length == 1) {
                $('#save-close #undo').attr('disabled', 'disabled');
            }
            $('#save-close #save').removeAttr('disabled');
        };

        let previewform = null; // DynamicForm instance.

        /**
         * Activate the sortable fields.
         */
        const activateFieldsSortable = () => {
            $('#form-preview form').sortable({
                items: ".fitem.row:not(.femptylabel):not([hidden]), fieldset.collapsible",
                connectWith: "#form-preview form .fcontainer",
            });

            $('#form-preview form .fcontainer').sortable({
                items: ".fitem.row:not(.femptylabel):not([hidden])",
                connectWith: "#form-preview form .fcontainer, #form-preview form",
            });
            $('#form-preview form, #form-preview form .fcontainer').sortable("option", {
                placeholder: "ui-state-highlight",
                forcePlaceholderSize: true,
                cursor: 'move',
                forceHelperSize: true,
                tolerance: 'pointer',
            });
        };

        /**
         * Preview the form.
         * @param {Array} data form fields data
         * @param {Number} id field id
         * @param {Boolean} updateDraft update draft status
         */
        const previewForm = (data, id = null, updateDraft = true) => {
            $message.find(`#form-preview`).empty();
            const selector = document.querySelector(`#message[data-id='${annotation.id}'] #form-preview`);
            previewform = new DynamicForm(selector, 'ivplugin_form\\submitform_form');
            if (data === null || data.length == 0) {
                $('#form-preview').removeClass('loader');
                return;
            }
            $('#form-preview').addClass('loader');
            formdata.formjson = JSON.stringify(data);
            previewform.load(formdata);
            let interval = setInterval(() => {
                if ($message.find(`#form-preview form`).length > 0) {
                    clearInterval(interval);
                    self.postFormRender();
                }
            }, 100);
            if (id) {
                // Loop until the form element is found and highlight the current field.
                let interval = setInterval(() => {
                    let element = document.querySelector('#form-preview form');
                    if (element) {
                        clearInterval(interval);
                        $(`#form-preview #fitem_field-${id},
                             #form-preview fieldset[id^=id_field-${id}],
                             #form-preview div#field-${id}, #form-preview [data-groupname=field-${id}],
                             #form-preview [id^=fitem_id_field-${id}]`).addClass('field-highlight');
                        let field = element.querySelector(`#form-preview .field-highlight`);
                        let isHeader = $('.field-highlight').hasClass(`collapsible`);
                        if (field) {
                            field.scrollIntoView({behavior: 'smooth', block: isHeader ? 'start' : 'center'});
                        }
                    }
                }, 100);
            }
            if (updateDraft) {
                saveTracking(data, id);
            }

            if (!self.isEditMode() && $message.attr('data-placement') == 'popup') {
                const interval = setInterval(() => {
                    if ($message.find(`#form-preview form`).length > 0) {
                        clearInterval(interval);
                        // Create the modal footer
                        let $actionbtns = $message.find(`#form-preview #form-action-btns`);
                        let $clone = $actionbtns.clone();
                        $actionbtns.remove();
                        let footer = `<div class="modal-footer">
                            ${$clone.html()}
                            </div>`;
                        $message.find(`.modal-content .modal-footer`).remove();
                        $message.find(`.modal-content`).append(footer);
                    }
                }, 100);
            }

            if (this.isEditMode()) {
                let interval = setInterval(() => {
                    if ($('#form-preview form').length > 0) {
                        clearInterval(interval);
                        activateFieldsSortable();
                    }
                }, 100);
            }
        };

        if (content && content.fields != '' && content.fields !== null) {
            formjson = content.fields;
        }

        let formdata = {};
        if (reportpage) {
            formdata = {
                id: annotation.id,
                contextid: M.cfg.contextid,
                type: 'form',
                courseid: M.cfg.courseId,
                annotationid: 0,
                editing: 0,
                formjson: JSON.stringify(formjson),
            };
            previewForm(formjson);
            return;
        }

        formdata = {
            id: annotation.id,
            contextid: M.cfg.contextid,
            type: self.prop.name,
            courseid: self.course,
            annotationid: self.interaction,
            completionid: self.completionid,
            editing: self.isEditMode() ? 1 : 0,
            formjson: JSON.stringify(formjson),
        };

        $message.on('click', `#submitform-submit`, e => {
            e.preventDefault();
            e.stopImmediatePropagation();
            const event = previewform.trigger(previewform.events.SUBMIT_BUTTON_PRESSED);
            if (!event.defaultPrevented) {
                previewform.submitFormAjax();
            }

            // On validation error we have to rerender the custom fields.
            previewform.addEventListener(previewform.events.SERVER_VALIDATION_ERROR, (e) => {
                e.stopImmediatePropagation();
                self.addNotification(M.util.get_string('formvalidationerror', 'ivplugin_form'), 'danger');
                previewform.notifyResetFormChanges();
                self.postFormRender();
            });

            previewform.addEventListener(previewform.events.CLIENT_VALIDATION_ERROR, (e) => {
                e.stopImmediatePropagation();
                self.addNotification(M.util.get_string('formvalidationerror', 'ivplugin_form'), 'danger');
                previewform.notifyResetFormChanges();
            });

            previewform.addEventListener(previewform.events.FORM_SUBMITTED, e => {
                e.preventDefault();
                e.stopImmediatePropagation(); // Important; otherwise, event will repeat multiple times.
                let details = {};
                const completeTime = new Date();
                details.xp = annotation.xp;
                details.duration = completeTime.getTime() - $('#video-wrapper').data('timestamp');
                details.timecompleted = completeTime.getTime();
                const completiontime = completeTime.toLocaleString();
                let duration = self.formatTime(details.duration / 1000);
                details.reportView = `<span data-toggle="tooltip" data-html="true" class="cursor-pointer"
                 data-title='<span class="d-flex flex-column align-items-start"><span><i class="bi bi-calendar mr-2"></i>
                 ${completiontime}</span><span><i class="bi bi-stopwatch mr-2"></i>${duration}</span></span>'>
                 <i class="bi bi-list-check text-success"></i><br><span>${annotation.xp}</span></span>`;
                self.toggleCompletion(annotation.id, 'mark-done', 'automatic', details);
                formdata.reviewing = 1;
                if (annotation.char2 == 1 && (annotation.text1 == 0 || annotation.text1 > new Date().getTime() / 1000)) {
                    $('#editsubmission').show();
                }
            });
        });

        $message.on('click', `#editsubmission`, (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            formdata.reviewing = 0;
            $('#editsubmission').hide();
            formjson = $message.find(`#formjson`).text();
            formjson = JSON.parse(formjson);
            previewForm(formjson);
        });

        $message.on('click', `#cancel-submit`, (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            $message.find(`.modal-content .modal-footer`).remove();
            formdata.reviewing = 1;
            $('#editsubmission').show();
            previewForm(formjson);
        });

        if (!this.isEditMode()) {
            if (annotation.completed) {
                fetchData()
                    .then((log) => {
                        if (log) {
                            let submission = JSON.parse(log.text1);
                            let newformjson = formjson.map((item) => {
                                item.value = submission['field-' + item.id];
                                item.default = submission['field-' + item.id];
                                if (item.type == 'radio') {
                                    item.othertext = submission['field-' + item.id + '-otheroptiontext'];
                                }
                                return item;
                            });
                            formdata.reviewing = 1;
                            formdata.submissionid = submission.id;
                            $message.find(`#formjson`).text(JSON.stringify(formjson));
                            previewForm(newformjson);
                            // Append the edit button if applicable
                            if (annotation.char2 == 1 && (annotation.text1 == 0
                                || annotation.text1 > new Date().getTime() / 1000)) {
                                $('#formmeta').append(`<button class="btn btn-primary ml-auto btn-sm" id="editsubmission">
                                    <i class="bi bi bi-pencil-square mr-2"></i>${M.util.get_string('edit', 'mod_interactivevideo')}
                                    </button>`);
                            }
                        } else {
                            if (annotation.text1 == 0 || annotation.text1 > new Date().getTime() / 1000) {
                                previewForm(formjson);
                            }
                        }

                        return;
                    })
                    .catch(() => {
                        // Do nothing.
                    });
            } else {
                if (annotation.text1 == 0 || annotation.text1 > new Date().getTime() / 1000) {
                    previewForm(formjson);
                } else {
                    $('#formmeta').replaceWith(`<div class="alert alert-warning">
                        ${M.util.get_string('formnolongeravailable', 'ivplugin_form')}</div>`);
                }
            }
        } else {
            previewForm(formjson, null, true);
            $message.find(`#formjson`).text(JSON.stringify(formjson));
            renderList(formjson);
        }

        if (this.isEditMode()) {

            /**
             * Put form fields in DOM.
             * @param {Array} ff form fields data
             */
            const saveFormJson = (ff) => {
                $message.find(`#formjson`).text(JSON.stringify(ff));
            };

            /**
             * Get the form fields data based on the current order.
             */
            const getFormJson = () => {
                let currentFormFields = JSON.parse($message.find(`#formjson`).text());
                let updatedFormJson = $message.find(`#form-field-list li`).map(function() {
                    const id = $(this).attr('data-id');
                    const field = currentFormFields.find((item) => item.id == id);
                    return field;
                }).get();
                saveFormJson(updatedFormJson);
                formjson = updatedFormJson;
            };

            $('#form-field-list').sortable({
                placeholder: "ui-state-highlight",
                cursor: 'move',
                stop: function(event, ui) {
                    const id = ui.item.attr('data-id');
                    getFormJson();
                    renderList(formjson);
                    previewForm(formjson, id, true);
                }
            });

            // Add the form field.
            $message.on('click', `button.add-field`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let type = $(this).data('type');
                let typeString = M.util.get_string(type + 'field', 'ivplugin_form');
                let newfieldmodal = `<div class="modal fade" id="newfield-modal" aria-labelledby="newfield-modal"
                 aria-hidden="true" style="background: rgba(0,0,0,0.5);">
                    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${M.util.get_string('addformfield', 'ivplugin_form',
                    typeString)}</h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <i class="bi bi-x-lg fs-25px"></i>
                                </button>
                            </div>
                            <div class="modal-body loader">
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">${M.util.get_string('close',
                        'mod_interactivevideo')}</button>
                                <button type="button" class="btn btn-primary" id="newfield-submit">${M.util.get_string('save',
                            'mod_interactivevideo')}</button>
                            </div>
                        </div>
                    </div>
                </div>`;
                $('body').append(newfieldmodal);
                $('#newfield-modal').modal('show');
                $('#newfield-modal').on('hidden.bs.modal', function() {
                    $(this).remove();
                    $('body').addClass('modal-open');
                });
                $('#newfield-modal').on('shown.bs.modal', function() {
                    let formfieldform = new DynamicForm(document.querySelector('#newfield-modal .modal-body'),
                        'ivplugin_form\\form_fields\\' + type);
                    let fields = [];
                    if (formjson !== null) {
                        fields = formjson.map((item) => {
                            return {
                                id: item.id,
                                label: item.label,
                                type: item.type,
                            };
                        });
                    }

                    formfieldform.load({
                        contextid: M.cfg.contextid,
                        type: type,
                        annotationid: annotation.id,
                        fields: JSON.stringify(fields),
                    });

                    document.querySelector('#newfield-submit').addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const event = formfieldform.trigger(formfieldform.events.SUBMIT_BUTTON_PRESSED);
                        if (!event.defaultPrevented) {
                            formfieldform.submitFormAjax();
                        }
                    });

                    formfieldform.addEventListener(formfieldform.events.FORM_SUBMITTED, (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const response = e.detail;
                        formjson = JSON.parse($message.find(`#formjson`).text());
                        const active = $('#form-preview form .fitem.row.field-active');
                        if (active.length > 0) {
                            let id = active.attr('id');
                            id = id.split('field-')[1];
                            id = id.split('_')[0];
                            let index = formjson.findIndex((item) => item.id == id);
                            // Insert the new field after the active field.
                            formjson.splice(index + 1, 0, response);
                        } else {
                            formjson.push(response);
                        }
                        renderList(formjson);
                        previewForm(formjson, response.id, true);
                        $('#newfield-modal').modal('hide');
                    });

                    self.setModalDraggable('#newfield-modal .modal-dialog');
                    let formInterval = setInterval(() => {
                        if ($('#newfield-modal .modal-body').find('form').length > 0) {
                            clearInterval(formInterval);
                            self.postFormRender();
                            if (type == 'advcheckbox' || type == 'radio' || type == 'select') {
                                self.repeatableValues('#newfield-modal');
                            }
                        }
                    }, 100);

                    $(formfieldform).on('core_form_dynamicform_clientvalidationerror core_form_dynamicform_validationerror',
                        function(e) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            self.postFormRender();
                            if (type == 'advcheckbox' || type == 'radio' || type == 'select') {
                                self.repeatableValues('#newfield-modal');
                            }
                            self.addNotification(M.util.get_string('formvalidationerror', 'ivplugin_form'), 'danger');
                        });
                });
            });

            // Edit the form field
            $message.on('click', `#form-field-list button.editfield`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let type = $(this).closest('li').attr('data-type');
                let fieldid = $(this).closest('li').attr('data-id');
                formjson = JSON.parse($message.find(`#formjson`).text());
                let formfielddata = formjson.find((item) => item.id == fieldid);
                let fields = formjson.map((item) => {
                    return {
                        id: item.id,
                        label: item.label,
                        type: item.type,
                    };
                });
                formfielddata.fields = JSON.stringify(fields);
                let typeString = M.util.get_string(type + 'field', 'ivplugin_form');
                let editform = `<div class="modal fade" id="editfield-modal"
                 aria-labelledby="editfield-modal" aria-hidden="true" style="background: rgba(0,0,0,0.5);">
                    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${M.util.get_string('editformfield',
                    'ivplugin_form', typeString)}</h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <i class="bi bi-x-lg fs-25px"></i>
                                </button>
                            </div>
                            <div class="modal-body loader">
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">${M.util.get_string('close',
                        'mod_interactivevideo')}</button>
                                <button type="button" class="btn btn-primary" id="editfield-submit">${M.util.get_string('save',
                            'mod_interactivevideo')}</button>
                            </div>
                        </div>
                    </div>
                </div>`;
                $('body').append(editform);
                $('#editfield-modal').modal('show');
                $('#editfield-modal').on('hidden.bs.modal', function() {
                    $(this).remove();
                    $('body').addClass('modal-open');
                });
                $('#editfield-modal').on('shown.bs.modal', function() {
                    let formfieldform = new DynamicForm(document.querySelector('#editfield-modal .modal-body'),
                        'ivplugin_form\\form_fields\\' + type);
                    formfieldform.load(formfielddata);

                    document.querySelector('#editfield-submit').addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const event = formfieldform.trigger(formfieldform.events.SUBMIT_BUTTON_PRESSED);
                        if (!event.defaultPrevented) {
                            formfieldform.submitFormAjax();
                        }
                    });

                    formfieldform.addEventListener(formfieldform.events.FORM_SUBMITTED, (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        const response = e.detail;
                        const index = formjson.findIndex((item) => item.id == response.id);
                        if (index !== -1) {
                            formjson[index] = response;
                        }
                        renderList(formjson);
                        previewForm(formjson, response.id, true);
                        $('#editfield-modal').modal('hide');
                    });

                    self.setModalDraggable('#editfield-modal .modal-dialog');
                    let formInterval = setInterval(() => {
                        if ($('#editfield-modal .modal-body').find('form').length > 0) {
                            clearInterval(formInterval);
                            if (type == 'advcheckbox' || type == 'radio' || type == 'select') {
                                self.repeatableValues('#editfield-modal');
                            }
                            self.postFormRender();
                        }
                    }, 100);

                    $(formfieldform).on('core_form_dynamicform_clientvalidationerror core_form_dynamicform_validationerror',
                        function(e) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            self.postFormRender();
                            if (type == 'advcheckbox' || type == 'radio' || type == 'select') {
                                self.repeatableValues('#editfield-modal');
                            }
                            self.addNotification(M.util.get_string('formvalidationerror', 'ivplugin_form'), 'danger');
                        });
                });
            });

            // Copy the form field
            $message.on('click', `#form-field-list button.copyfield`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let fieldid = $(this).closest('li').attr('data-id');
                formjson = JSON.parse($message.find(`#formjson`).text());
                let formfielddata = JSON.parse(JSON.stringify(formjson.find((item) => item.id == fieldid)));
                const index = formjson.findIndex((item) => item.id == formfielddata.id);
                if (index !== -1) {
                    formfielddata.id = Math.floor(new Date().getTime() / 1000);
                    formjson.splice(index + 1, 0, formfielddata);
                }
                renderList(formjson);
                previewForm(formjson, formfielddata.id, true);
            });

            // Delete the form field
            $message.on('click', `#form-field-list button.deletefield`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let currentFormFields = JSON.parse($message.find(`#formjson`).text());
                const $this = $(this);
                Notification.saveCancel(
                    M.util.get_string('deletefield', 'ivplugin_form'),
                    M.util.get_string('deletefieldconfirm', 'ivplugin_form'),
                    M.util.get_string('delete', 'mod_interactivevideo'),
                    function() {
                        let li = $this.closest('li');
                        let id = li.attr('data-id');
                        li.remove();
                        $(`#form-preview #fitem_field-${id},
                            #form-preview fieldset[id^=id_field-${id}],
                            #form-preview div#field-${id}, #form-preview [data-groupname=field-${id}],
                            #form-preview [id^=fitem_id_field-${id}]`).addClass('field-highlight');
                        let isHeader = $('.field-highlight').hasClass(`collapsible`);
                        let ff = currentFormFields.filter((item) => item.id != id);
                        renderList(ff);
                        if (isHeader) {
                            previewForm(ff, id, true);
                        } else {
                            $('.field-highlight').fadeOut(300, 'linear', function() {
                                $(this).remove();
                            });
                            saveTracking(ff, id);
                        }
                    },
                    null
                );
            });

            // Save the form fields
            $message.on('click', `button#save`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                getFormJson();
                let formJsonCopy = JSON.parse(JSON.stringify(formjson));
                let json = formJsonCopy.map((item) => {
                    delete item.annotationid;
                    delete item.contextid;
                    delete item.formattedlabel;
                    return item;
                });
                let cleanItems = JSON.stringify(json).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                $.ajax({
                    url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                    method: "POST",
                    dataType: "text",
                    data: {
                        action: 'quickeditfield',
                        sesskey: M.cfg.sesskey,
                        id: annotation.id,
                        field: 'content',
                        contextid: M.cfg.contextid,
                        draftitemid: 0,
                        value: cleanItems,
                        cmid: self.cmid,
                        token: self.token,
                    },
                    success: function(data) {
                        let updated = JSON.parse(data);
                        tracking = [];
                        tracking.push({
                            items: JSON.stringify(formJsonCopy),
                            actives: null,
                            at: new Date().getTime(),
                        });
                        $('#save-close #redo, #save-close #undo').attr('disabled', 'disabled');
                        $('#save-close #save').attr('disabled', 'disabled');
                        dispatchEvent('annotationupdated', {
                            annotation: updated,
                            action: 'edit',
                        });
                    }
                });
            });

            // Scroll to the form field on label click
            $message.on('click', `#form-field-list li .field-label`, function() {
                let id = $(this).closest('li').attr('data-id');
                let type = $(this).closest('li').attr('data-type');
                $(`#form-preview #fitem_field-${id}, #form-preview fieldset[id^=id_field-${id}],
                     #form-preview div#field-${id}, #form-preview [data-groupname=field-${id}],
                      #form-preview [id^=fitem_id_field-${id}]`).addClass('field-highlight');
                let $collapsible = $('.field-highlight').closest('fieldset.collapsible');
                if ($collapsible && $collapsible.find('[data-toggle="collapse"]').hasClass('collapsed')) {
                    $collapsible.find('[data-toggle="collapse"]').trigger('click');
                }
                let field = document.querySelector(`#form-preview .field-highlight`);
                if (field) {
                    field.scrollIntoView({behavior: 'smooth', block: type == 'header' ? 'start' : 'center'});
                }
            });

            $message.on('mouseover', `#form-field-list li`, function() {
                $(`#form-preview .field-highlight`).removeClass('field-highlight');
                const id = $(this).attr('data-id');
                $(`#form-preview #fitem_field-${id}, #form-preview fieldset[id^=id_field-${id}],
                     #form-preview div#field-${id}, #form-preview [data-groupname=field-${id}],
                      #form-preview [id^=fitem_id_field-${id}]`).addClass('field-highlight');
            });

            $message.on('mouseout', `#form-field-list li`, function() {
                $(`#form-preview .field-highlight`).removeClass('field-highlight');
            });

            $message.on('mouseover', `#form-preview .fitem`, function() {
                $(`#form-field-list li`).removeClass('field-highlight');
                let group = $(this).attr('data-groupname');
                let id;
                if (group) {
                    id = group.replace('field-', '');
                } else {
                    try {
                        id = $(this).attr('id').match(/\d{10}/)[0];
                    } catch (e) {
                        id = $(this).closest('[data-groupname]').attr('data-groupname').replace('field-', '');
                    }

                }
                $(`#form-field-list li[data-id=${id}]`).addClass('field-highlight');
            });

            $message.on('mouseout', `#form-preview .fitem`, function() {
                $(`#form-field-list li`).removeClass('field-highlight');
            });

            // Edit the form field from the preview.
            $message.on('click', `#form-preview i.edit`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(this).data('id');
                $(`#form-field-list li[data-id=${id}] button.editfield`).trigger('click');
            });

            // Delete the form field from the preview.
            $message.on('click', `#form-preview i.delete`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(this).data('id');
                $(`#form-field-list li[data-id=${id}] button.deletefield`).trigger('click');
            });

            // Copy the form field from the preview.
            $message.on('click', `#form-preview i.copy`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(this).data('id');
                $(`#form-field-list li[data-id=${id}] button.copyfield`).trigger('click');
            });

            // Undo the form field changes.
            $message.on('click', `#save-close #undo`, async function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (trackingIndex == 0) {
                    return;
                }
                trackingIndex--;
                const instance = tracking[trackingIndex];
                formjson = JSON.parse(instance.items);
                renderList(formjson);
                previewForm(formjson, instance.actives, false);
                if (trackingIndex == 0) {
                    $('#save-close #undo').attr('disabled', 'disabled');
                    $('#save-close #redo').removeAttr('disabled');
                } else {
                    $('#save-close #undo').removeAttr('disabled');
                    if (trackingIndex == tracking.length - 1) {
                        $('#save-close #redo').attr('disabled', 'disabled');
                    } else {
                        $('#save-close #redo').removeAttr('disabled');
                    }
                }
            });

            // Redo the form field changes.
            $message.on('click', `#save-close #redo`, async function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (trackingIndex == tracking.length - 1) {
                    return;
                }
                trackingIndex++;
                const instance = tracking[trackingIndex];
                formjson = JSON.parse(instance.items);
                renderList(formjson);
                previewForm(formjson, instance.actives, false);
                if (trackingIndex == tracking.length - 1) {
                    $('#save-close #redo').attr('disabled', 'disabled');
                    $('#save-close #undo').removeAttr('disabled');
                } else {
                    $('#save-close #redo').removeAttr('disabled');
                    if (trackingIndex == 0) {
                        $('#save-close #undo').attr('disabled', 'disabled');
                    } else {
                        $('#save-close #undo').removeAttr('disabled');
                    }
                }
            });

            // Close the form field modal.
            $message.on('click', `#save-close #close`, async function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (tracking.length > 1) {
                    Notification.saveCancel(
                        M.util.get_string('savechanges', 'mod_interactivevideo'),
                        M.util.get_string('savechangesconfirm', 'mod_interactivevideo'),
                        M.util.get_string('save', 'mod_interactivevideo'),
                        function() {
                            $('#save-close #save').trigger('click');
                        },
                        function() {
                            tracking = [];
                            $('#save-close #redo, #save-close #undo').attr('disabled', 'disabled');
                            $('#save-close #save').attr('disabled', 'disabled');
                            $('#form-modal').modal('hide');
                        }
                    );
                } else {
                    $('#form-modal').modal('hide');
                }
            });

            // Sort the form fields in the preview.
            $message.on('sortstart', '#form-preview form, #form-preview form .fcontainer', function() {
                $(this).addClass('no-pointer');
                $('#form-preview form .fcontainer').addClass('empty-container');
            });

            // Revert the item if it's a collapsible being dropped into .fcontainer.
            $message.on('sortreceive', '#form-preview form, #form-preview form .fcontainer', function(event, ui) {
                if (ui.item.hasClass('collapsible') && ui.item.parent().hasClass('fcontainer')) {
                    $(ui.sender).sortable('cancel');
                    self.addNotification(M.util.get_string('sectioninsectionisnotsupported', 'ivplugin_form'), 'danger');
                }
            });

            // Update the form fields data on sort stop.
            $message.on('sortstop', '#form-preview form, #form-preview form .fcontainer', function(event, ui) {
                let id = ui.item.attr('id');
                id = id.split('field-')[1];
                id = id.split('_')[0];
                ui.item.trigger('click');
                let currentFormFields = JSON.parse($message.find(`#formjson`).text());
                $(this).removeClass('no-pointer');
                $('#form-preview form .fcontainer').removeClass('empty-container');
                let sortables = $message.find(`#form-preview form`)
                    .find('.fitem:not(.femptylabel):not([hidden]), fieldset.collapsible');
                let fieldsets = $message.find(`#form-preview form`).find('fieldset.collapsible');

                let fields = sortables.map(function() {
                    let $this = $(this);
                    let id = $this.attr('id');
                    return id;
                }).get();
                let fieldsetsIds = fieldsets.map(function() {
                    let $this = $(this);
                    let id = $this.attr('id');
                    return id;
                }).get();

                let newFormJson = [];
                fields.forEach(x => {
                    let y = x.split('field-')[1];
                    y = y.split('_')[0];
                    let row = currentFormFields.find(f => f.id == y);
                    if (fieldsetsIds.includes(x)) {
                        // Get the next sibling after this collapsible section
                        let $next = $(`#${x}`).next();
                        let endId = 0;
                        if ($next && $next.hasClass('fitem') && !$next.hasClass('femptylabel')) {
                            endId = $next.attr('id');
                        }
                        if (endId != 0 && endId) {
                            endId = endId.split('field-')[1];
                            endId = endId.split('_')[0];
                            row.closeat = endId;
                        } else {
                            row.closeat = '';
                        }
                    }
                    newFormJson.push(row);
                });
                formjson = newFormJson;
                renderList(formjson);
                saveTracking(formjson, id);
            });

            // Add field-highlight class when the field is clicked.
            $message.on('click', `#form-preview .fitem.row`, function() {
                $(`#form-preview .field-active`).removeClass('field-active');
                $(this).addClass('field-active');
            });
        } else {
            if (annotation.completiontracking && annotation.completiontracking != 'manual') {
                let $message = $(`#message[data-id='${annotation.id}']`);

                // Disable the mark-done and mark-undone buttons
                $message.find(`#completiontoggle`).prop('disabled', true);
                if (annotation.completed == true) {
                    $message.find(`#completiontoggle span`)
                        .text(`${M.util.get_string('completioncompleted', 'mod_interactivevideo')}`);
                } else {
                    $message.find(`#completiontoggle span`)
                        .text(`${M.util.get_string('completionincomplete', 'mod_interactivevideo')}`);
                }
            }
        }
    }

    /**
     * Override the completionCallback method for the form plugin.
     * @param {Array} annotations annotations data
     * @param {Object} thisItem annotation object
     * @param {String} action action type
     * @param {String} type action type
     */
    completionCallback(annotations, thisItem, action, type) {
        let msg = 'formupdated';
        if (!thisItem.completed) {
            msg = 'formsubmitted';
        }
        super.completionCallback(annotations, thisItem, action, type);
        if (type == 'automatic') {
            this.addNotification(M.util.get_string(msg, 'ivplugin_form'), 'success');
        }
        let annotation = annotations.find((item) => item.id == thisItem.id);
        this.runInteraction(annotation);
    }

    /**
     * Render form used on the report page
     * @param {Object} annotation The annotation object
     * @param {Array} f Form fields data
     * @param {Object} response Form submission data
     * @param {String} node The node to render the form
     * @returns {void}
     */
    renderForm(annotation, f, response, node) {
        let self = this;
        const getFormJson = async () => {
            const content = await self.render(annotation, 'json');
            return new Promise((resolve) => {
                let formfields = content.fields;
                resolve(formfields);
            });
        };

        let formdata = {
            id: annotation.id,
            contextid: M.cfg.contextid,
            type: 'form',
            courseid: M.cfg.courseId,
            annotationid: 0,
            editing: 0,
        };

        const render = (ff) => {
            $(`#message[data-id='${annotation.id}']`).find(`${node} #form-preview`).addClass('loader').empty();
            let newformjson = ff;
            if (response !== null) {
                let submission = JSON.parse(response.text1);
                newformjson = ff.map((item) => {
                    item.value = submission['field-' + item.id];
                    item.default = submission['field-' + item.id];
                    return item;
                });
                formdata.reviewing = 1;
                formdata.submissionid = submission.id;
            }

            formdata.formjson = JSON.stringify(newformjson);

            let previewform = new DynamicForm(document.
                querySelector(`#message[data-id='${annotation.id}'] ${node} #form-preview`),
                'ivplugin_form\\submitform_form');
            previewform.load(formdata);
            let interval = setInterval(() => {
                if ($(`#message[data-id='${annotation.id}'] ${node} #form-preview form`).length > 0) {
                    clearInterval(interval);
                    self.postFormRender();
                }
            }, 100);
        };

        if (!f) {
            getFormJson().then((fields) => {
                window.console.log(fields);
                return render(fields);
            }).catch(() => {
                // Do nothing.
            });
        } else {
            render(f);
        }

    }

    /**
     * What happens when an item runs
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    runInteraction(annotation) {
        this.player.pause();
        let self = this;
        if (this.isEditMode()) {
            annotation.editmode = true; // Use editmode to render the draft content (i.e draft.php vs plugin.php).
        }

        // First render container
        this.renderViewer(annotation);

        this.enableManualCompletion(annotation);
        if (annotation.displayoptions == 'popup') {
            $('#annotation-modal').on('shown.bs.modal', function() {
                self.setModalDraggable('#annotation-modal .modal-dialog');
            });
        }
    }

    /**
     * Render annotation view on the report page
     * @param {Object} annotation The annotation object
     * @param {Array} tabledata Completion data from the report table
     * @returns {void}
     */
    displayReportView(annotation, tabledata) {
        let self = this;
        let $message = $(`#message[data-id='${annotation.id}']`);
        $message.closest('.modal').addClass('modal-fullscreen');
        $message.find('#content').html(`<div class="tab-content" id="myTabContent">
            <div class="tab-pane fade" id="formtab" role="tabpanel">
            <div id="formmeta" class="mb-3 d-flex"></div><div id="form-preview"></div></div>
            <div class="tab-pane fade show active loading" id="responsetab" role="tabpanel"></div>
            </div><div class="shadow z-index-1 h-100 bg-white overflow-auto" id="responseview">
            <div class="modal-header d-flex bg-white align-items-center pr-0 sticky-top" id="title">
                <h5 class="modal-title text-truncate mb-0">
                    <div class="d-flex align-items-center p-1">
                        <select id="submission-list" class="custom-select rounded-sm mr-1"></select>
                        <button class="btn p-0 previous"><i class="bi bi-chevron-left fa-fw fs-25px"></i></button>
                        <button class="btn p-0 next"><i class="bi bi-chevron-right fa-fw fs-25px"></i></button>
                    </div>
                </h5>
                <div class="d-flex align-items-center">
                    <button class="btn mx-2 p-0" id="print">
                        <i class="bi bi-printer fa-fw fs-25px"></i>
                    </button>
                    <button class="btn mx-2 p-0 close">
                        <i class="bi bi-x-lg fa-fw fs-25px"></i>
                    </button>
                </div>
            </div>
            <div id="form-preview"></div>
            </div>`);
        $message.find('.btns')
            .prepend(`<button class="rotatey-180 btn btn-sm mr-2 border-0" data-toggle="tab" data-target="#formtab">
            <i class="bi bi-input-cursor-text fs-25px"  data-toggle="tooltip"
             title="${M.util.get_string('form', 'ivplugin_form')}"></i></button>
            <button class="rotatey-180 btn btn-sm mr-2 border-0" data-toggle="tab" data-target="#responsetab">
            <i class="bi bi-table fs-25px" data-toggle="tooltip"
             title="${M.util.get_string('responses', 'ivplugin_form')}"></i>
            </button>`);

        $(document).on('click', '#print', function() {
            var divContents = document.querySelector('#responseview #form-preview').innerHTML;
            var originalContents = document.body.innerHTML;

            document.body.innerHTML = divContents;
            window.print();
            document.body.innerHTML = originalContents;
        });

        this.render(annotation, 'json').then(async (ct) => {
            let logs = [];
            let users = [];
            const fields = JSON.stringify([...ct.fields]); // Copy the fields object.
            let formfields = ct.fields;
            let userids = tabledata.map((item) => item.id);
            let logdata = await this.getLogs(annotation, userids);
            logs = logdata;
            logs.map(x => {
                const completiondata = tabledata.find(y => y.id == x.userid);
                x.completiondata = completiondata;
                return x;
            });

            // We're going to build the table data.
            let heading = [
                {title: M.util.get_string('id', 'mod_interactivevideo'), "class": 'exportable'},
                {title: M.util.get_string('timesubmitted', 'mod_interactivevideo'), "class": 'exportable time'},
                {title: M.util.get_string('participant', 'mod_interactivevideo'), "class": ''},
                {title: M.util.get_string('firstname', 'mod_interactivevideo'), "class": 'exportable'},
                {title: M.util.get_string('lastname', 'mod_interactivevideo'), "class": 'exportable'},
                {title: M.util.get_string('email', 'mod_interactivevideo'), "class": 'exportable'},
            ];

            let validfields = [];

            formfields.forEach(f => {
                if (f.type != 'header' && f.type != 'html' && f.type != 'linebreak') {
                    let head = f.formattedlabel;
                    if (f.helptext.text && f.helptext.text != '') {
                        head = `<span>${f.formattedlabel}
                            <i class="ml-2 bi bi-info-circle-fill text-secondary helptext cursor-pointer" data-fieldid="${f.id}"
                             data-toggle="popover">
                            </i></span>`;
                    }
                    heading.push({
                        "title": head,
                        "class": 'exportable not-sortable',
                    });
                    validfields.push(f);
                }
            });

            let rows = [];

            logs.forEach(l => {
                let submission = JSON.parse(l.text1);
                let row = [
                    l.id,
                    `<a href="javascript:void(0)" class="viewsubmission" data-id="${l.id}">${l.formattedtimecreated}</a>`,
                    `<span class="text-truncate">${l.completiondata.picture}</span>`,
                    l.completiondata.firstname,
                    l.completiondata.lastname,
                    l.completiondata.email,
                ];

                validfields.forEach(async f => {
                    let response = submission['field-' + f.id];
                    if (response == undefined) {
                        row.push('');
                        return;
                    }
                    switch (f.type) {
                        case 'text':
                        case 'time':
                        case 'textarea':
                            row.push(response);
                            break;
                        case 'range':
                            row.push(response + '/[' + f.minlength + '-' + f.maxlength + ']');
                            break;
                        case 'week':
                            var wvalue = response.split('-');
                            var week = wvalue[1].replace('W', '');
                            row.push(`${M.util.get_string('weekvalue', 'ivplugin_form', week)}, ${wvalue[0]}`);
                            break;
                        case 'month':
                            var mvalue = response.split('-');
                            var month = M.util.get_string('month' + mvalue[1], 'ivplugin_form');
                            row.push(`${month} ${mvalue[0]}`);
                            break;
                        case 'date':
                            var includeTime = response.includes('T');
                            var dvalue = new Date(response).toLocaleDateString();
                            if (includeTime) {
                                dvalue += ' ' + new Date(response).toLocaleTimeString();
                            }
                            row.push(dvalue);
                            break;
                        case 'editor':
                            row.push(response.text);
                            break;
                        case 'select':
                            var res = [];
                            var options = f.options.split('\n');
                            options.forEach((option) => {
                                option = option.trim();
                                let choices = option.split('=');
                                let value = choices[0];
                                if (response.indexOf(value) > -1) {
                                    res.push(choices[1]);
                                }
                            });
                            row.push(res.join(', '));
                            break;
                        case 'radio':
                            var ans = '';
                            var roptions = f.options.split('\n');
                            if (response == 'otheroption') {
                                let othertext = submission['field-' + f.id + '-otheroptiontext'];
                                row.push(M.util.get_string('otheroption', 'ivplugin_form')
                                    + (othertext != '' ? ': ' + othertext : ''));
                                break;
                            }
                            roptions.forEach((option) => {
                                option = option.trim();
                                let choices = option.split('=');
                                let value = choices[0];
                                if (response == value) {
                                    ans = choices[1];
                                    return;
                                }
                            });
                            row.push(ans);
                            break;
                        case 'advcheckbox':
                            var ares = [];
                            var aoptions = f.options.split('\n');
                            if (f.allowother == 1) {
                                aoptions.push(`otheroption=${M.util.get_string('otheroption', 'ivplugin_form')}`);
                            }
                            // Convert to object.
                            var optionObj = {};
                            aoptions.forEach((option) => {
                                let opt = option.split('=');
                                optionObj[opt[0].trim()] = opt[1].trim();
                            });
                            var keys = Object.keys(response);
                            keys = keys.filter((item) => response[item] != '' && response[item] !== undefined);
                            keys.forEach((key) => {
                                if (optionObj[key]) {
                                    let v = response[key];
                                    // Other: Other Text.
                                    if (key == 'otheroption') {
                                        v = M.util.get_string('otheroption', 'ivplugin_form')
                                            + (response['otheroptiontext'] != '' ? ': ' + response['otheroptiontext'] : '');
                                    }
                                    ares.push(v);
                                }
                            });
                            row.push(ares.join(', <br>'));
                            break;
                        case 'date_selector':
                            var dsdate = response.year + '-';
                            if (response.month < 9) {
                                dsdate += '0' + response.month;
                            } else {
                                dsdate += response.month;
                            }
                            dsdate += '-';
                            if (response.day < 9) {
                                dsdate += '0' + response.day;
                            } else {
                                dsdate += response.day;
                            }
                            if (response.hour && response.minute) {
                                dsdate += 'T';
                                if (response.hour < 9) {
                                    dsdate += '0' + response.hour;
                                } else {
                                    dsdate += response.hour;
                                }
                                dsdate += ':';
                                if (response.minute < 9) {
                                    dsdate += '0' + response.minute;
                                } else {
                                    dsdate += response.minute;
                                }
                            }
                            var inclTime = dsdate.includes('T');
                            var dsvalue = new Date(dsdate).toLocaleDateString();
                            if (inclTime) {
                                dsvalue += ' ' + new Date(dsdate).toLocaleTimeString();
                            }
                            row.push(dsvalue);
                            break;
                        case 'duration':
                            if (response) {
                                row.push(response.number + ' ' + M.util.get_string(response.timeunit, 'ivplugin_form'));
                            } else {
                                row.push('');
                            }
                            break;
                        case 'filemanager':
                            if (response.length > 0) {
                                const files = response.map((file) => {
                                    const filename = file.split('/').pop();
                                    return `<a href="${file}" target="_blank" class="text-truncate">${decodeURIComponent(
                                        filename.replace('field-' + f.id + '_', ''))}<span class="d-none"><br>\n[${file}]
                                        </span></a>`;
                                });
                                row.push(files.join(',<br>'));
                            } else {
                                row.push('');
                            }
                            break;
                        default:
                            break;
                    }
                });

                rows.push(row);

            });

            users = logs.map((l) => {
                return {
                    id: l.id,
                    fullname: `${l.completiondata.firstname} ${l.completiondata.lastname}`,
                };
            });

            users.sort((a, b) => {
                return a.fullname.localeCompare(b.fullname);
            });

            users.forEach((user) => {
                $(`#message[data-id='${annotation.id}']`).find('#submission-list')
                    .append(`<option value="${user.id}">${user.fullname}</option>`);
            });

            $(`#message[data-id='${annotation.id}']`).find('#responsetab')
                .html(`<div id="formresponsetable" class="table-responsive">
                    <table class="table table-bordered table-striped w-100">
                    <thead>
                        <tr>
                            ${heading.map(h => `<th class="${h.class} text-truncate">${h.title}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                    </table>
                    </div>`);

            renderAnnotationLogs({
                heading: heading,
                rows: rows,
            }, '#formresponsetable', annotation.formattedtitle);

            $message.find('.btns').on('click', `[data-toggle="tab"]`, function() {
                $(`[data-toggle="tab"]`).removeClass('active');
                // Always remove the rendered form.
                $(`#message[data-id='${annotation.id}']`).find(`#responseview #form-preview, .tab-content #form-preview`).empty();
                if ($(this).data('target') == '#formtab') {
                    self.renderForm(annotation, JSON.parse(fields), null, '#formtab');
                }
            });

            $(document).on('click', `#message[data-id='${annotation.id}'] table .helptext`, async function(e) {
                // Dismiss all other popovers.
                $('.popover').remove();
                e.preventDefault();
                e.stopImmediatePropagation();
                let $this = $(this);
                let contentid = $(this).attr('data-fieldid');
                let field = formfields.find((field) => field.id == contentid);
                let content = field.helptext.text;
                $this.popover({
                    content: '<div class="loader"></div>',
                    title: `<span class="mr-2">${field.formattedlabel}</span>`
                        + `<i class="bi bi-x-circle-fill ml-auto popover-dismiss cursor-pointer" style="font-size:1.5em;"></i>`,
                    placement: 'top',
                    html: true,
                    trigger: 'focus',
                    template: `<div class="popover inlineannotation-popover id-${contentid}"
                     role="tooltip"><div class="arrow"></div><h3 class="popover-header d-flex justify-content-between"></h3>
                     <div class="popover-body rounded"></div></div>`,
                });
                $this.popover('show');
                $this.on('shown.bs.popover', async function() {
                    let $body = $(`.popover.id-${contentid} .popover-body`);
                    const html = await self.formatContent(content, M.cfg.contextid);
                    $body.html(html);
                    notifyFilter($body);
                    $this.popover('update');
                });
            });

            $(document).on('click', `.popover-dismiss`, function(e) {
                e.stopImmediatePropagation();
                $(this).closest('.popover').remove();
            });

            $(document).on('click', `#message[data-id='${annotation.id}'] .viewsubmission`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(this).attr('data-id');
                $(`#message[data-id='${annotation.id}']`).find('#responseview').addClass('show');
                $(`#message[data-id='${annotation.id}']`).find('#submission-list').val(id).trigger('change');
            });

            $(document).on('change', `#message[data-id='${annotation.id}'] #submission-list`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(this).val();
                let log = logs.find((item) => item.id == id);
                self.renderForm(annotation, formfields, log, '#responseview');
                let index = users.findIndex((item) => item.id == id);
                if (index > 0) {
                    $(`#message[data-id='${annotation.id}']`).find('.previous').prop('disabled', false);
                } else {
                    $(`#message[data-id='${annotation.id}']`).find('.previous').prop('disabled', true);
                }
                if (index < users.length - 1) {
                    $(`#message[data-id='${annotation.id}']`).find('.next').prop('disabled', false);
                } else {
                    $(`#message[data-id='${annotation.id}']`).find('.next').prop('disabled', true);
                }
            });

            $(document).on('click', `#message[data-id='${annotation.id}'] #responseview .close`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                $(`#message[data-id='${annotation.id}']`).find('#responseview').removeClass('show');
            });

            $(document).on('click', `#message[data-id='${annotation.id}'] #responseview .previous`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(`#message[data-id='${annotation.id}']`).find('#submission-list').val();
                let index = users.findIndex((item) => item.id == id);
                let prev = users[index - 1];
                $(`#message[data-id='${annotation.id}']`).find('#submission-list').val(prev.id).trigger('change');
            });

            $(document).on('click', `#message[data-id='${annotation.id}'] #responseview .next`, function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(`#message[data-id='${annotation.id}']`).find('#submission-list').val();
                let index = users.findIndex((item) => item.id == id);
                let next = users[index + 1];
                $(`#message[data-id='${annotation.id}']`).find('#submission-list').val(next.id).trigger('change');
            });
            return;
        }).catch(() => {
            // Do nothing.
        });
    }
    /**
     * Data to show when the report viewer clicks on the completion checkmark
     * @param {Object} annotation the current annotation
     * @param {Number} userid the user id
     * @returns {Promise}
     */
    async getCompletionData(annotation, userid) {
        let self = this;
        let response = await Ajax.call([{
            args: {
                userid: userid,
                cmid: annotation.annotationid,
                annotationid: annotation.id,
                contextid: M.cfg.contextid,
            },
            contextid: M.cfg.contextid,
            methodname: 'ivplugin_form_get_log',
        }])[0];
        window.console.log(response);
        response = JSON.parse(response.record);
        window.console.log(response);
        let modal = `<div class="modal fade ${$('body').hasClass('iframe') ? 'modal-fullscreen' : ''}"
        id="annotation-modal" role="dialog" aria-labelledby="annotation-modal"
    aria-hidden="true" data-backdrop="static" data-keyboard="false">
    <div id="message" data-id="${annotation.id}" data-placement="popup"
     class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
                               <div class="modal-content rounded-lg">
                                   <div class="modal-header d-flex align-items-center shadow-sm pr-0" id="title">
                                       <button class="btn mx-2 p-0 ml-auto" data-dismiss="modal" aria-label="Close">
                                        <i class="bi bi-x-lg fa-fw fs-25px"></i>
                                        </button>
                                   </div>
                                   <div class="modal-body" id="form-preview"></div>
                                   </div>
                               </div>
                               </div>`;
        $('body').append(modal);
        $('#annotation-modal').modal('show');
        $('#annotation-modal').on('shown.bs.modal', function() {
            self.renderForm(annotation, null, response, '.modal-content');
        });
        $('#annotation-modal').on('hidden.bs.modal', function() {
            $('#annotation-modal').remove();
        });
    }
}