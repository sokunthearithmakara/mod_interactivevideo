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
 * @module     ivplugin_contentbank/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import contentbankutil from 'ivplugin_contentbank/util';
import ModalForm from 'core_form/modalform';
import Base from 'mod_interactivevideo/type/base';

export default class ContentBank extends Base {
    /**
     * Called when the edit form is loaded.
     * @param {Object} form The form object
     * @param {Event} event The event object
     * @return {void}
     */
    onEditFormLoaded(form, event) {
        let body = form.modal.modal.find('.modal-body');
        contentbankutil.init(M.cfg.courseContextId);
        // Refresh the content from the content bank.
        body.on('click', '#refreshcontentbank', function (e) {
            e.preventDefault();
            $(this).find('i').addClass('fa-spin');
            var currentid = $('[name=contentid]').val();
            $('.contentbank-container').html(`<div class="d-flex justify-content-center align-items-center"
            style="height: 150px;"><div class="spinner-grow text-secondary" role="status">
            <span class="sr-only">Loading...</span></div></div>`);
            contentbankutil.refreshContentBank(currentid, M.cfg.courseContextId, $(this).data('editable'), function () {
                $('#refreshcontentbank i').removeClass('fa-spin');
            });
        });

        // Upload a new content.
        body.on('click', '#uploadcontentbank', function (e) {
            e.preventDefault();
            var uploadForm = new ModalForm({
                formClass: "core_contentbank\\form\\upload_files",
                args: {
                    contextid: M.cfg.courseContextId,
                },
                modalConfig: {
                    title: M.util.get_string('uploadcontent', 'ivplugin_contentbank')
                }
            });

            uploadForm.addEventListener(uploadForm.events.FORM_SUBMITTED, (e) => {
                this.addNotification(M.util.get_string('contentuploaded', 'ivplugin_contentbank'), 'success');
                var returnurl = e.detail.returnurl;
                var contentid = returnurl.match(/id=(\d+)/)[1];
                $('[name=contentid]').val(contentid);
                $('#refreshcontentbank').trigger('click');
            });

            uploadForm.addEventListener(uploadForm.events.ERROR, () => {
                this.addNotification(M.util.get_string('contentuploaderror', 'ivplugin_contentbank'));
            });

            uploadForm.show();
        });
        return { form, event };
    }

    postContentRender(annotation, callback) {
        $(`#message[data-id='${annotation.id}']`).addClass('hascontentbank');
        if (annotation.completiontracking
            && (annotation.completiontracking != 'manual') && !annotation.completed) {
            return callback;
        }
        return true;
    }

    /**
     * Initialize the container to display the annotation
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    renderContainer(annotation) {
        let $message = $(`#message[data-id='${annotation.id}']`);
        if (annotation.completiontracking && annotation.completiontracking != 'manual') {
            // Disable the mark-done and mark-undone buttons
            let $completiontoggle = $message.find('#completiontoggle');
            $completiontoggle.prop('disabled', true);
            if (annotation.completed == true) {
                $completiontoggle.find(`span`)
                    .text(`${M.util.get_string('completioncompleted', 'ivplugin_contentbank')}`);
            } else {
                $completiontoggle.find(`span`)
                    .text(`${M.util.get_string('completionincomplete', 'ivplugin_contentbank')}`);
            }

            switch (annotation.completiontracking) {
                case 'complete':
                    $completiontoggle.before(`<i class="bi bi-info-circle-fill mr-2" data-toggle="tooltip" data-container="#wrapper"
                        data-trigger="hover"
                         data-title="${M.util.get_string("completiononcomplete", "mod_interactivevideo")}"></i>`);
                    break;
                case 'completepass':
                    $completiontoggle.before(`<i class="bi bi-info-circle-fill mr-2" data-toggle="tooltip" data-container="#wrapper"
        data-trigger="hover"
         data-title="${M.util.get_string("completiononcompletepass", "mod_interactivevideo")}"></i>`);
                    break;
                case 'completefull':
                    $completiontoggle.before(`<i class="bi bi-info-circle-fill mr-2" data-toggle="tooltip" data-container="#wrapper"
                data-trigger="hover" data-title="${M.util.get_string("completiononcompletefull", "mod_interactivevideo")}"></i>`);
                    break;
            }
            $message.find('[data-toggle="tooltip"]').tooltip();
        }
        return $message;
    }

    /**
     * Run the interaction
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    runInteraction(annotation) {
        this.player.pause();
        var annoid = annotation.id;
        var self = this;
        let $message;

        const xAPICheck = (annotation) => {
            var H5P;
            var iframeinterval = setInterval(function () {
                try {// Try to get the H5P object.
                    H5P = document.querySelector(`#message[data-id='${annoid}'] iframe`).contentWindow.H5P;
                } catch (e) {
                    H5P = null;
                }

                if (typeof H5P !== 'undefined' && H5P !== null) {
                    if (self.isEditMode()) {
                        $message.find(`#title .btns .xapi`).remove();
                        $message.find(`#title .btns`)
                            .prepend(`<div class="xapi alert-secondary px-2
                         rounded-pill">${M.util.get_string('xapicheck', 'ivplugin_contentbank')}</div>`);
                    }
                    H5P.externalDispatcher.on('xAPI', function (event) {
                        if ((event.data.statement.verb.id == 'http://adlnet.gov/expapi/verbs/completed'
                            || event.data.statement.verb.id == 'http://adlnet.gov/expapi/verbs/answered')
                            && event.data.statement.object.id.indexOf('subContentId') < 0) {
                            if (self.isEditMode()) {
                                $message.find(`#title .btns .xapi`).remove();
                                $message.find(`#title .btns`)
                                    .prepend(`<div class="xapi alert-success px-2
                                 rounded-pill"><i class="fa fa-check mr-2"></i>
                                 ${M.util.get_string('xapieventdetected', 'ivplugin_contentbank')}</div>`);
                                var audio = new Audio(M.cfg.wwwroot + '/mod/interactivevideo/sounds/pop.mp3');
                                audio.play();
                                return;
                            }
                            var complete = false;
                            if (annotation.completiontracking == 'completepass'
                                && event.data.statement.result && event.data.statement.result.score.scaled >= 0.5) {
                                complete = true;
                            } else if (annotation.completiontracking == 'completefull'
                                && event.data.statement.result && event.data.statement.result.score.scaled == 1) {
                                complete = true;
                            } else if (annotation.completiontracking == 'complete') {
                                complete = true;
                            }
                            if (complete && !annotation.completed) {
                                self.toggleCompletion(annoid, 'mark-done', 'automatic');
                            }
                        }
                    });

                    clearInterval(iframeinterval);
                }
            }, 1000);
        };

        // Apply content.
        const applyContent = (annotation) => {
            this.render(annotation).then((data) => {
                $message.find(`.modal-body`).html(data).attr('id', 'content').fadeIn(300);
                if (!annotation.completed && annotation.completiontracking != 'manual') {
                    xAPICheck(annotation);
                }
            });
        };

        this.renderViewer(annotation).then(() => {
            $message = this.renderContainer(annotation);
            applyContent(annotation);
        });

        this.enableManualCompletion();

        if (annotation.displayoptions == 'popup') {
            $('#annotation-modal').on('shown.bs.modal', function () {
                self.setModalDraggable('#annotation-modal .modal-dialog');
            });
        }
    }
}