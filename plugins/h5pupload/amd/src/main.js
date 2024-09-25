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
    /**
     * Render the container for the annotation
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    renderContainer(annotation) {
        let $message = $(`#message[data-id='${annotation.id}']`);
        super.renderContainer(annotation);
        let $completiontoggle = $message.find('#completiontoggle');
        $message.find('#title .info').remove();
        switch (annotation.completiontracking) {
            case 'complete':
                $completiontoggle.before(`<i class="bi bi-info-circle-fill mr-2 info" data-toggle="tooltip"
                     data-container="#wrapper" data-trigger="hover"
                     data-title="${M.util.get_string("completiononcomplete", "mod_interactivevideo")}"></i>`);
                break;
            case 'completepass':
                $completiontoggle.before(`<i class="bi bi-info-circle-fill mr-2 info" data-toggle="tooltip"
                     data-container="#wrapper" data-trigger="hover"
                     data-title="${M.util.get_string("completiononcompletepass", "mod_interactivevideo")}"></i>`);
                break;
            case 'completefull':
                $completiontoggle.before(`<i class="bi bi-info-circle-fill mr-2 info" data-toggle="tooltip"
                     data-container="#wrapper" data-trigger="hover"
                     data-title="${M.util.get_string("completiononcompletefull", "mod_interactivevideo")}"></i>`);
                break;
        }
        $message.find('[data-toggle="tooltip"]').tooltip();
        return $message;
    }

    /**
     * Handles the rendering of content after an annotation is posted.
     *
     * This function adds a class to the message element, sets an interval to check for an iframe,
     * and modifies the iframe's background and height properties. It also handles completion tracking.
     *
     * @param {Object} annotation - The annotation object containing details about the annotation.
     * @param {Function} callback - The callback function to be executed if certain conditions are met.
     * @returns {boolean|Function} - Returns true if the annotation does not require manual completion tracking,
     *                               otherwise returns the callback function.
     */
    postContentRender(annotation, callback) {
        $(`#message[data-id='${annotation.id}']`).addClass('hasiframe');
        let checkIframe = () => {
            const iframe = document.querySelector(`#message[data-id='${annotation.id}'] iframe`);
            if (iframe) {
                iframe.style.background = 'none';
                let contentDocument = iframe.contentDocument;
                let html = contentDocument.querySelector('html');
                html.style.height = 'unset';
            } else {
                requestAnimationFrame(checkIframe);
            }
        };
        requestAnimationFrame(checkIframe);
        if (annotation.hascompletion == 1 && annotation.completiontracking == 'manual'
            && !annotation.completed && annotation.completiontracking != 'view') {
            return callback;
        }
        return true;
    }
    /**
     * Executes the interaction for a given annotation.
     *
     * @param {Object} annotation - The annotation object containing interaction details.
     * @param {number} annotation.id - The unique identifier for the annotation.
     * @param {string} annotation.completiontracking - The method of completion tracking for the annotation.
     * @param {boolean} annotation.hascompletion - Indicates if the annotation has completion tracking.
     * @param {boolean} annotation.completed - Indicates if the annotation is already completed.
     * @param {string} annotation.displayoptions - The display options for the annotation (e.g., 'popup').
     *
     * @returns {Promise<void>} - A promise that resolves when the interaction is fully executed.
     */
    async runInteraction(annotation) {
        this.player.pause();

        var annoid = annotation.id;
        var self = this;

        /**
         * Monitors an annotation for xAPI events and updates the UI accordingly.
         *
         * @param {Object} annotation - The annotation object to monitor.
         * @param {string} annotation.id - The ID of the annotation.
         * @param {string} annotation.completiontracking - The completion tracking type for the annotation.
         * @param {boolean} annotation.completed - Indicates if the annotation is completed.
         *
         * @returns {void}
         */
        const xAPICheck = (annotation) => {
            var H5P;

            const detectAPI = () => {
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
                    let statements = [];
                    try {
                        H5P.externalDispatcher.on('xAPI', function(event) {
                            if (event.data.statement.verb.id == 'http://adlnet.gov/expapi/verbs/completed'
                                || event.data.statement.verb.id == 'http://adlnet.gov/expapi/verbs/answered') {
                                statements.push(event.data.statement);
                            }
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
                                let textclass = '';
                                if (annotation.completiontracking == 'completepass'
                                    && event.data.statement.result && event.data.statement.result.score.scaled >= 0.5) {
                                    complete = true;
                                } else if (annotation.completiontracking == 'completefull'
                                    && event.data.statement.result && event.data.statement.result.score.scaled == 1) {
                                    complete = true;
                                } else if (annotation.completiontracking == 'complete') {
                                    complete = true;
                                }
                                if (event.data.statement.result.score.scaled < 0.5) {
                                    textclass = 'fa fa-check text-danger';
                                } else if (event.data.statement.result.score.scaled < 1) {
                                    textclass = 'fa fa-check text-success';
                                } else {
                                    textclass = 'bi bi-check2-all text-success';
                                }
                                if (complete && !annotation.completed) {
                                    let details = {};
                                    const completeTime = new Date();
                                    details.xp = annotation.xp;
                                    if (annotation.char1 == '1') { // Partial points.
                                        details.xp = (event.data.statement.result.score.scaled * annotation.xp).toFixed(2);
                                    }
                                    details.duration = completeTime.getTime() - $('#video-wrapper').data('timestamp');
                                    details.timecompleted = completeTime.getTime();
                                    const completiontime = completeTime.toLocaleString();
                                    let duration = self.formatTime(details.duration / 1000);
                                    details.reportView = `<span data-toggle="tooltip" data-html="true"
                     data-title='<span class="d-flex flex-column align-items-start"><span><i class="bi bi-calendar mr-2"></i>
                     ${completiontime}</span><span><i class="bi bi-stopwatch mr-2"></i>${duration}</span>
                     <span><i class="bi bi-list-check mr-2"></i>
                     ${event.data.statement.result.score.raw}/${event.data.statement.result.score.max}</span></span>'>
                     <i class="${textclass}"></i><br><span>${Number(details.xp)}</span></span>`;
                                    details.details = statements;
                                    self.toggleCompletion(annoid, 'mark-done', 'automatic', details);
                                }
                            }
                        });
                    } catch (e) {
                        requestAnimationFrame(detectAPI);
                    }
                } else {
                    requestAnimationFrame(detectAPI);
                }
            };

            requestAnimationFrame(detectAPI);
        };

        // Apply content
        const applyContent = async(annotation) => {
            const data = await this.render(annotation, 'html');
            $(`#message[data-id='${annotation.id}'] .modal-body`).attr('id', 'content').html(data).fadeIn(300);
            if (annotation.hascompletion == 0) {
                return;
            }
            if (!annotation.completed && annotation.completiontracking == 'view') {
                this.toggleCompletion(annotation.id, 'mark-done', 'automatic');
                return;
            }
            if (annotation.completed) {
                this.postContentRender(annotation);
            } else {
                this.postContentRender(annotation, xAPICheck(annotation));
            }
        };

        await this.renderViewer(annotation);
        this.renderContainer(annotation);
        applyContent(annotation);

        this.enableManualCompletion(annotation);

        if (annotation.displayoptions == 'popup') {
            $('#annotation-modal').on('shown.bs.modal', function() {
                self.setModalDraggable('#annotation-modal .modal-dialog');
            });
        }
    }
}