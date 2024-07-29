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
import {dispatchEvent} from 'core/event_dispatcher';
import 'mod_interactivevideo/libraries/jquery-ui';
import Templates from 'core/templates';
import DynamicForm from 'core_form/dynamicform';
import {renderAnnotationLogs} from 'mod_interactivevideo/report';
import {notifyFilterContentUpdated as notifyFilter} from 'core_filters/events';
export default class Form extends Base {
    postEditCallback() {
        // Do nothing
    }

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
                    'icon': 'bi bi-calendar',
                    'type': 'date_selector',
                    'label': M.util.get_string('dateselectorfield', 'ivplugin_form'),
                },
                {
                    'icon': 'bi bi-stopwatch',
                    'type': 'duration',
                    'label': M.util.get_string('durationfield', 'ivplugin_form'),
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
                const content = await self.render(annotation, 'json');
                self.postContentRender(annotation, formfields, content);
            });

        } else {
            await super.renderViewer(annotation);
            const content = await self.render(annotation, 'json');
            $(`#message[data-id='${annotation.id}']`).find('#content')
                .append('<div id="formmeta" class="mb-3 d-flex"></div><div id="form-preview"></div>');
            this.postContentRender(annotation, '', content);
        }
    }

    postContentRender(annotation, formfields, content, reportpage = false) {
        let self = this;
        if (annotation.text1 != 0) {
            $(`#message[data-id='${annotation.id}'] #formmeta`)
                .append(`<div class="duedate">${M.util.get_string('duedate', 'ivplugin_form')}: ${content.duedate}</div>`);
        }

        const fetchData = () => {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                    method: "POST",
                    dataType: "text",
                    data: {
                        action: 'get_log',
                        sesskey: M.cfg.sesskey,
                        userid: this.userid,
                        cm: annotation.annotationid,
                        annotationid: annotation.id,
                        contextid: M.cfg.contextid,
                        cmid: self.cmid,
                        token: self.token,
                    },
                    success: function(data) {
                        let log = JSON.parse(data);
                        resolve(log);
                    },
                    error: function(error) {
                        reject(error);
                    }
                });
            });
        };

        let formjson = [];
        const renderList = (data) => {
            $(`#form-field-list`).empty();
            if (data) {
                data.forEach((item) => {
                    let icon = formfields.find((field) => field.type === item.type).icon;
                    $(`#form-field-list`)
                        .append(`<li class="list-group-item d-flex align-items-start justify-content-between p-0"
                         data-id="${item.id}" data-properties='${JSON.stringify(item)}' data-type="${item.type}">
                                    <div class="d-flex align-items-start pt-1">
                                    <i class="bi bi-grip-vertical px-2 cursor-move"></i>
                                    <i class="${icon} mr-2"></i>
                                    <div class="d-inline-block field-label">${item.formattedlabel}</div></div>
                                    <div class="ml-auto d-flex">
                                        <button class="btn btn-sm rounded-0"
                                         id="edit" title="${M.util.get_string('edit', 'mod_interactivevideo')}">
                                         <i class="bi bi-pencil-square"></i></button>
                                        <button class="btn btn-sm rounded-0"
                                         id="copy" title="${M.util.get_string('clone', 'mod_interactivevideo')}">
                                         <i class="bi bi-copy"></i></button>
                                        <button class="btn btn-sm rounded-0 text-danger"
                                         id="delete" title="${M.util.get_string('delete', 'mod_interactivevideo')}">
                                         <i class="bi bi-trash3"></i></button>
                                        </div>
                                </li>`);
                });
            }
        };

        let previewform; // DynamicForm instance.
        const previewForm = (data, id = null) => {
            $(`#message[data-id='${annotation.id}']`).find(`#form-preview`).empty();
            const selector = document.querySelector(`#message[data-id='${annotation.id}'] #form-preview`);
            previewform = new DynamicForm(selector, 'ivplugin_form\\submitform_form');
            if (data === null || data.length == 0) {
                $('#form-preview').removeClass('loader');
                return;
            }
            $('#form-preview').addClass('loader');
            formdata.formjson = JSON.stringify(data);
            previewform.load(formdata);
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
                        field.scrollIntoView({behavior: 'smooth', block: 'center'});
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
            editing: self.isEditMode() ? 1 : 0,
            formjson: JSON.stringify(formjson),
        };

        if (this.isEditMode()) {
            renderList(formjson);
        }

        if (!this.isEditMode()) {
            if (annotation.completed) {
                fetchData()
                    .then((log) => {
                        if (log) {
                            const submission = JSON.parse(log.text1);
                            const newformjson = formjson.map((item) => {
                                item.value = submission['field-' + item.id];
                                item.default = submission['field-' + item.id];
                                return item;
                            });
                            formdata.reviewing = 1;
                            formdata.submissionid = submission.id;
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
            previewForm(formjson);
        }

        if (this.isEditMode()) {
            const getFormJson = () => {
                formjson = $('#form-field-list').find('li').map(function() {
                    return JSON.parse($(this).attr('data-properties'));
                }).get();
            };
            $('#form-field-list').sortable({
                handle: '.bi-grip-vertical',
                placeholder: "ui-state-highlight",
                stop: function() {
                    getFormJson();
                    renderList(formjson);
                    previewForm(formjson);
                }
            });
            // Add the form field.
            $(document).on('click', 'button.add-field', function(e) {
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
                    typeString.toLowerCase())}</h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
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
                        const event = formfieldform.trigger(formfieldform.events.SUBMIT_BUTTON_PRESSED);
                        if (!event.defaultPrevented) {
                            formfieldform.submitFormAjax();
                        }
                    });

                    formfieldform.addEventListener(formfieldform.events.FORM_SUBMITTED, (e) => {
                        e.preventDefault();
                        const response = e.detail;
                        formjson.push(response);
                        renderList(formjson);
                        previewForm(formjson, response.id);
                        $('#newfield-modal').modal('hide');
                    });

                    self.setModalDraggable('#newfield-modal .modal-dialog');

                });
            });

            $(document).on('click', '#form-field-list button#edit', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let type = $(this).closest('li').attr('data-type');
                let formfielddata = JSON.parse($(this).closest('li').attr('data-properties'));
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
                    'ivplugin_form', typeString.toLowerCase())}</h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
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
                        const event = formfieldform.trigger(formfieldform.events.SUBMIT_BUTTON_PRESSED);
                        if (!event.defaultPrevented) {
                            formfieldform.submitFormAjax();
                        }
                    });

                    formfieldform.addEventListener(formfieldform.events.FORM_SUBMITTED, (e) => {
                        e.preventDefault();
                        const response = e.detail;
                        const index = formjson.findIndex((item) => item.id == response.id);
                        if (index !== -1) {
                            formjson[index] = response;
                        }
                        renderList(formjson);
                        previewForm(formjson, response.id);
                        $('#editfield-modal').modal('hide');
                    });

                    self.setModalDraggable('#editfield-modal .modal-dialog');
                });
            });

            $(document).on('click', '#form-field-list button#copy', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let formfielddata = JSON.parse($(this).closest('li').attr('data-properties'));
                const index = formjson.findIndex((item) => item.id == formfielddata.id);
                if (index !== -1) {
                    formfielddata.id = Math.floor(new Date().getTime() / 1000);
                    formjson.splice(index + 1, 0, formfielddata);
                }
                renderList(formjson);
                previewForm(formjson, formfielddata.id);
            });

            $(document).on('click', '#form-field-list button#delete', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(this).closest('li').attr('data-id');
                formjson = formjson.filter((item) => item.id != id);
                renderList(formjson);
                previewForm(formjson);
            });

            $(document).on('click', 'button#save', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                getFormJson();
                let json = formjson.map((item) => {
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
                        dispatchEvent('annotationupdated', {
                            annotation: updated,
                            action: 'edit',
                        });
                    }
                });
            });

            $(document).on('click', '#form-field-list li .field-label', function() {
                let id = $(this).closest('li').attr('data-id');
                $(`#form-preview #fitem_field-${id}, #form-preview fieldset[id^=id_field-${id}],
                     #form-preview div#field-${id}, #form-preview [data-groupname=field-${id}],
                      #form-preview [id^=fitem_id_field-${id}]`).addClass('field-highlight');
                let $collapsible = $('.field-highlight').closest('fieldset.collapsible');
                if ($collapsible && $collapsible.find('[data-toggle="collapse"]').hasClass('collapsed')) {
                    $collapsible.find('[data-toggle="collapse"]').trigger('click');
                }
                let field = document.querySelector(`#form-preview .field-highlight`);
                field.scrollIntoView({behavior: 'smooth', block: 'center'});
            });

            $(document).on('mouseover', '#form-field-list li', function() {
                $(`#form-preview .field-highlight`).removeClass('field-highlight');
                const id = $(this).attr('data-id');
                $(`#form-preview #fitem_field-${id}, #form-preview fieldset[id^=id_field-${id}],
                     #form-preview div#field-${id}, #form-preview [data-groupname=field-${id}],
                      #form-preview [id^=fitem_id_field-${id}]`).addClass('field-highlight');
            });

            $(document).on('mouseout', '#form-field-list li', function() {
                $(`#form-preview .field-highlight`).removeClass('field-highlight');
            });

            $(document).on('mouseover', '#form-preview .fitem', function() {
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

            $(document).on('mouseout', '#form-preview .fitem', function() {
                $(`#form-field-list li`).removeClass('field-highlight');
            });

            $(document).on('click', '#form-preview i#edit', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(this).data('id');
                $(`#form-field-list li[data-id=${id}] button#edit`).trigger('click');
            });

            $(document).on('click', '#form-preview i#delete', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(this).data('id');
                $(`#form-field-list li[data-id=${id}] button#delete`).trigger('click');
            });

            $(document).on('click', '#form-preview i#copy', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                let id = $(this).data('id');
                $(`#form-field-list li[data-id=${id}] button#copy`).trigger('click');
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

            $(document).on('click', `#message[data-id='${annotation.id}'] #submitform-submit`, async (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                const event = previewform.trigger(previewform.events.SUBMIT_BUTTON_PRESSED);
                if (!event.defaultPrevented) {
                    previewform.submitFormAjax();
                }
                previewform.addEventListener(previewform.events.FORM_SUBMITTED, () => {
                    self.toggleCompletion(annotation.id, 'mark-done', 'automatic');
                    formdata.reviewing = 1;
                    if (annotation.char2 == 1 && (annotation.text1 == 0 || annotation.text1 > new Date().getTime() / 1000)) {
                        $('#editsubmission').show();
                    }
                    previewForm(formjson);
                });
            });

            $(document).on('click', `#message[data-id='${annotation.id}'] #editsubmission`, (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                formdata.reviewing = 0;
                $('#editsubmission').hide();
                previewForm(formjson);
            });

            $(document).on('click', `#message[data-id='${annotation.id}'] #cancel-submit`, (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                formdata.reviewing = 1;
                $('#editsubmission').show();
                previewForm(formjson);
            });
        }
    }

    completionCallback(annotations, thisItem, action, type) {
        let msg = 'formupdated';
        if (!thisItem.completed) {
            msg = 'formsubmitted';
        }
        super.completionCallback(annotations, thisItem, action, type);
        if (type == 'automatic') {
            this.addNotification(M.util.get_string(msg, 'ivplugin_form'), 'success');
        }
    }

    renderForm(annotation, f, response, node) {
        let self = this;
        const getFormJson = () => {
            self.render(annotation, 'json').then((content) => {
                return new Promise((resolve) => {
                    let formfields = content.fields;
                    resolve(formfields);
                });
            }).catch(() => {
                // Do nothing.
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
                const submission = JSON.parse(response.text1);
                newformjson = ff.map((item) => {
                    item.value = submission['field-' + item.id];
                    item.default = submission['field-' + item.id];
                    return item;
                });
                formdata.reviewing = 1;
                formdata.submissionid = submission.id;
            }

            formdata.formjson = JSON.stringify(newformjson);

            const previewform = new DynamicForm(document.
                querySelector(`#message[data-id='${annotation.id}'] ${node} #form-preview`),
                'ivplugin_form\\submitform_form');
            previewform.load(formdata);
        };

        if (!f) {
            getFormJson().then((fields) => {
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

        this.enableManualCompletion();
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
            <div class="tab-pane fade show active" id="responsetab" role="tabpanel"></div>
            </div><div class="shadow z-index-1 h-100 bg-white overflow-auto" id="responseview">
            <div class="modal-header d-flex bg-white align-items-center pr-0 sticky-top" id="title">
                                            <h5 class="modal-title text-truncate mb-0"><div class="d-flex align-items-center p-1">
                                                <select id="submission-list"
                                                class="custom-select rounded-sm mr-1"></select>
                                                <button class="btn p-0 previous">
                                                <i class="bi bi-chevron-left fa-fw fs-25px"></i>
                                                </button>
                                                <button class="btn p-0 next">
                                                <i class="bi bi-chevron-right fa-fw fs-25px"></i>
                                                </button>
                                            </div></h5>
                                            <div class="d-flex align-items-center">
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
                            <i class="ml-2 bi bi-info-circle-fill text-secondary helptext" data-fieldid="${f.id}"
                             data-toggle="popover">
                            </i></span>`;
                    }
                    heading.push({
                        title: head,
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
                        case 'textarea':
                            row.push(response);
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
                            var options = f.options.split('\n');
                            options.forEach((option) => {
                                option = option.trim();
                                let choices = option.split('=');
                                let value = choices[0];
                                if (response == value) {
                                    row.push(choices[1]);
                                    return;
                                }
                            });
                            break;
                        case 'advcheckbox':
                            var res = [];
                            var options = f.options.split('\n');
                            var selected = Object.values(response);
                            selected = selected.filter((item) => item != '');
                            options.forEach((option) => {
                                option = option.trim();
                                let choices = option.split('=');
                                let value = choices[0];
                                if (selected.indexOf(value) > -1) {
                                    res.push(choices[1]);
                                }
                            });
                            row.push(res.join(', '));
                            break;
                        case 'date_selector':
                            var date;
                            if (response.day < 9) {
                                date += '0' + response.day;
                            } else {
                                date += response.day;
                            }
                            date += '/';
                            if (response.month < 9) {
                                date += '0' + response.month;
                            } else {
                                date += response.month;
                            }
                            date += '/';
                            date += response.year;
                            if (response.hour && response.minute) {
                                date += ' ';
                                if (response.hour < 9) {
                                    date += '0' + response.hour;
                                } else {
                                    date += response.hour;
                                }
                                date += ':';
                                if (response.minute < 9) {
                                    date += '0' + response.minute;
                                } else {
                                    date += response.minute;
                                }
                            }
                            row.push(date);
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
                                    return `<a href="${file}" target="_blank" class="text-truncate">
                                    ${decodeURIComponent(filename.replace('field-' + f.id + '_', ''))}<span class="d-none">
                                    [${file}]</span></a>`;
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
            }, '#formresponsetable');

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
}