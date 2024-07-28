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
 * Main class for the H5P Upload plugin.
 *
 * @module     ivplugin_h5pupload/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Base from 'mod_interactivevideo/type/base';
export default class H5pUpload extends Base {
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
    postContentRender(annotation, callback) {
        $(`#message[data-id='${annotation.id}']`).addClass('hasiframe');
        if (annotation.completiontracking
            && (annotation.completiontracking != 'manual') && !annotation.completed) {
            return callback;
        }
        return true;
    }
    runInteraction(annotation) {
        this.player.pause();

        var annoid = annotation.id;
        var self = this;
        const xAPICheck = (annotation) => {
            var H5P;
            var iframeinterval = setInterval(function() {
                try { // Try to get the H5P object.
                    H5P = document.querySelector(`#message[data-id='${annoid}'] iframe`).contentWindow.H5P;
                } catch (e) {
                    H5P = null;
                }

                if (typeof H5P !== 'undefined' && H5P !== null) {
                    if (self.isEditMode()) {
                        $(`#message[data-id='${annotation.id}'] #title .xapi`).remove();
                        $(`#message[data-id='${annotation.id}'] #title .btns`)
                            .prepend(`<div class="xapi alert-secondary d-inline px-2 rounded-pill">
                            ${M.util.get_string('xapicheck', 'ivplugin_h5pupload')}</div>`);
                    }
                    H5P.externalDispatcher.on('xAPI', function(event) {
                        if ((event.data.statement.verb.id == 'http://adlnet.gov/expapi/verbs/completed'
                            || event.data.statement.verb.id == 'http://adlnet.gov/expapi/verbs/answered')
                            && event.data.statement.object.id.indexOf('subContentId') < 0) {
                            if (self.isEditMode()) {
                                $(`#message[data-id='${annotation.id}'] #title .btns .xapi`).remove();
                                $(`#message[data-id='${annotation.id}'] #title .btns`)
                                    .prepend(`<div class="xapi alert-success d-inline px-2 rounded-pill">
                                    <i class="fa fa-check mr-2"></i>
                                    ${M.util.get_string('xapieventdetected', 'ivplugin_h5pupload')}
                                    </div>`);
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

        // Apply content
        const applyContent = (annotation) => {
            this.render(annotation, 'html').then((data) => {
                $(`#message[data-id='${annotation.id}'] .modal-body`).attr('id', 'content').html(data).fadeIn(300);
                if (annotation.completed) {
                    this.postContentRender(annotation);
                } else {
                    this.postContentRender(annotation, xAPICheck(annotation));
                }
                return;
            }).catch(() => {
                // Do nothing.
            });
        };

        this.renderViewer(annotation).then(() => {
            this.renderContainer(annotation);
            applyContent(annotation);
            return;
        }).catch(() => {
            // Do nothing.
        });

        this.enableManualCompletion();

        if (annotation.displayoptions == 'popup') {
            $('#annotation-modal').on('shown.bs.modal', function() {
                self.setModalDraggable('#annotation-modal .modal-dialog');
            });
        }
    }
}