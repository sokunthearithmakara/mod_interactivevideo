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
 * Main class for the discussion plugin.
 *
 * @module     ivplugin_discussion/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Base from 'mod_interactivevideo/type/base';
import $ from 'jquery';
import { notifyFilterContentUpdated as notifyFilter } from 'core_filters/events';
export default class Discussion extends Base {
    renderContainer(annotation) {
        if (annotation.completiontracking
            && annotation.completiontracking == 'complete') {
            // Disable the mark-done and mark-undone buttons
            $(`#message[data-id='${annotation.id}'] #completiontoggle`).prop('disabled', true);
            if (annotation.completed == true) {
                $(`#message[data-id='${annotation.id}'] #completiontoggle span`)
                    .text(`${M.util.get_string('completioncompleted', 'mod_interactivevideo')}`);
            } else {
                $(`#message[data-id='${annotation.id}'] #completiontoggle span`)
                    .text(`${M.util.get_string('completionincomplete', 'mod_interactivevideo')}`);
            }
        }

        if (!this.isEditMode()) {
            // Create three tabs for the discussion topic, responses, my reponses
            let $message = $(`#message[data-id='${annotation.id}']`);
            $message.find('.modal-body').addClass('p-0').css('height', '100vh').html(`
                <ul class="nav justify-content-center bg-light p-2 sticky-top" id="discussion-main">
                    <li class="nav-item">
                        <a class="nav-link active rounded-sm py-1" data-toggle="tab" href="#discussion-topic-${annotation.id}">
                            ${M.util.get_string('discussiontopic', 'ivplugin_discussion')}
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link rounded-sm py-1" data-toggle="tab" href="#responses-${annotation.id}">
                            ${M.util.get_string('responses', 'ivplugin_discussion')}
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link rounded-sm py-1" data-toggle="tab" href="#myresponses-${annotation.id}">
                            ${M.util.get_string('myresponses', 'ivplugin_discussion')}
                        </a>
                    </li>
                </ul>
                <div class="tab-content">
                    <div id="discussion-topic-${annotation.id}" class="tab-pane active">
                        <div class="discussion">
                        </div>
                    </div>
                    <div id="responses-${annotation.id}" class="tab-pane">
                        <div class="responses p-3">
                        <div class="table-responsive">
                        <table class="table table-sm table-striped table-bordered table-hover">
                        <thead>
                        <tr>
                        <th>${M.util.get_string('id', 'mod_interactivevideo')}</th>
                        <th>${M.util.get_string('participant', 'mod_interactivevideo')}</th>
                        <th>${M.util.get_string('timesubmitted', 'mod_interactivevideo')}</th>
                        <th>${M.util.get_string('timemodified', 'mod_interactivevideo')}</th>
                        <th>${M.util.get_string('replycount', 'ivplugin_discussion')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        </tbody>
                        </table>
                        </div>
                        </div>
                    </div>
                    <div id="myresponses-${annotation.id}" class="tab-pane">
                        <div class="myresponses">
                        </div>
                    </div>
                </div>

                `);
        }
    }

    postContentRender(annotation) {
        // if (annotation.displayoptions == 'popup' && !this.isEditMode()) {
        //     $(`#annotation-modal`).addClass('modal-fullscreen');
        // }
        $(`#message[data-id='${annotation.id}'] .modal-body`).addClass('p-0');
        $(document).on('click', `#message[data-id='${annotation.id}'] #collapsetoggle`, function () {
            $(this).closest('.discussion-topic').toggleClass('collapsed expanded');
            $(this).find('i').toggleClass('bi-chevron-down bi-chevron-up');
        });
    }

    runInteraction(annotation) {
        this.player.pause();
        // Apply content.
        const applyContent = (annotation) => {
            this.render(annotation, 'json').then((data) => {
                let $message = $(`#message[data-id='${annotation.id}']`);
                $message.find(`.modal-body`).attr('id', 'content');
                $message.find(`.modal-body #discussion-topic-${annotation.id}`).html(data.content);
                let $body = $message.find(`.modal-body`);
                notifyFilter($body);
                this.postContentRender(annotation);
                this.interactionRunEvent(annotation, data);
            }).catch(() => {
                // Do nothing.
            });
        };

        this.renderViewer(annotation).then(() => {
            this.renderContainer(annotation);
            applyContent(annotation);
        });

        this.enableManualCompletion();

        if (annotation.displayoptions == 'popup') {
            let self = this;
            $('#annotation-modal').on('shown.bs.modal', function () {
                self.setModalDraggable('#annotation-modal .modal-dialog');
            });
        }
    }

}