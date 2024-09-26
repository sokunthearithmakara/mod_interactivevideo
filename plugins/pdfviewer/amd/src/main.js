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
 * PDF viewer
 *
 * @module     ivplugin_pdfviewer/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Iframe from 'ivplugin_iframe/main';
export default class PdfViewer extends Iframe {
    /**
     * Renders the container for the given annotation.
     *
     * @param {Object} annotation - The annotation object.
     * @param {string} annotation.id - The ID of the annotation.
     */
    renderContainer(annotation) {
        let $message = $(`#message[data-id='${annotation.id}']`);
        $message.addClass("hasiframe");
        super.renderContainer(annotation);
    }
    /**
     * Runs the interaction for the given annotation.
     *
     * @param {Object} annotation - The annotation object containing interaction details.
     * @param {number} annotation.id - The unique identifier for the annotation.
     * @param {boolean} annotation.completed - Indicates if the annotation has been completed.
     * @param {number} annotation.hascompletion - Indicates if the annotation has completion tracking.
     * @param {string} annotation.completiontracking - The type of completion tracking for the annotation.
     * @param {string} annotation.displayoptions - The display options for the annotation.
     *
     * @returns {Promise<void>} - A promise that resolves when the interaction is complete.
     */
    async runInteraction(annotation) {
        this.player.pause();

        let self = this;
        /**
         * Monitors a PDF viewer within an iframe and toggles completion status based on the number of pages viewed.
         *
         * @param {Object} annotation - The annotation object containing the ID and completion status.
         * @param {string} annotation.id - The unique identifier for the annotation.
         * @param {boolean} annotation.completed - The completion status of the annotation.
         */
        const pdfCheck = (annotation) => {
            const checkIframe = () => {
                const iframe = document.querySelector(`#message[data-id='${annotation.id}'] iframe`);
                let pdf;
                try {
                    pdf = iframe.contentWindow.PDFViewerApplication.pdfViewer;
                } catch (e) {
                    pdf = null;
                }
                if (pdf) {
                    if (pdf.pagesCount == 1) { // Only one page.
                        self.toggleCompletion(annotation.id, "mark-done", "automatic");
                    } else {
                        pdf.eventBus.on("pagechanging", function(e) {
                            if (e.pageNumber == pdf.pagesCount && !annotation.completed) {
                                self.toggleCompletion(annotation.id, "mark-done", "automatic");
                                annotation.completed = true;
                            }
                        });
                    }
                } else {
                    requestAnimationFrame(checkIframe);
                }
            };
            requestAnimationFrame(checkIframe);
        };

        // Apply content.
        const applyContent = async(annotation) => {
            const data = await this.render(annotation, 'html');
            $(`#message[data-id='${annotation.id}'] .modal-body`).attr('id', 'content').html(data).fadeIn(300);
            if (annotation.hascompletion == 0 || annotation.completed) {
                this.postContentRender(annotation);
                return;
            }
            if (annotation.completiontracking == 'view') {
                this.postContentRender(annotation);
                this.toggleCompletion(annotation.id, "mark-done", "automatic");
                return;
            }
            if (annotation.completiontracking == 'scrolltolastpage') {
                this.postContentRender(annotation, pdfCheck(annotation));
            }
        };

        await this.renderViewer(annotation);
        this.renderContainer(annotation);
        applyContent(annotation);

        if (annotation.displayoptions == 'popup') {
            $('#annotation-modal').on('shown.bs.modal', function() {
                self.setModalDraggable('#annotation-modal .modal-dialog');
            });
        }

        if (annotation.completiontracking == 'manual') {
            this.enableManualCompletion(annotation);
        }
    }
}