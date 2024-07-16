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
 * @module     ivplugin_pdfviewer/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Iframe from 'ivplugin_iframe/main';
export default class PdfViewer extends Iframe {
    renderContainer(annotation) {
        let $message = $(`#message[data-id='${annotation.id}']`);
        $message.addClass("hasiframe");
        if (annotation.completiontracking && annotation.completiontracking == 'scrolltolastpage') {
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
    postContentRenderEditor(modal) {
        var modalbody = modal.getRoot();
        modalbody.addClass('modalhasiframe');
        var interval = setInterval(() => {
            if ($('.modalhasiframe iframe').length > 0) {
                // Remove the loading background because some iframe has transparent content
                $('.modalhasiframe .modal-body iframe').on('load', function () {
                    setTimeout(() => {
                        $('.modalhasiframe .modal-body iframe').css('background', 'none');
                    });
                });
                clearInterval(interval);
            }
        }, 1000);
    }
    runInteraction(annotation) {
        let self = this;
        const pdfCheck = (annotation) => {
            var iframeinterval = setInterval(() => {
                var iframe = document.querySelector(`#message[data-id='${annotation.id}'] iframe`);
                var pdf;
                try {
                    pdf = iframe.contentWindow.PDFViewerApplication.pdfViewer;
                } catch (e) {
                    pdf = null;
                }
                if (pdf) {
                    clearInterval(iframeinterval);
                    if (pdf.pagesCount == 1) { // Only one page.
                        self.toggleCompletion(annotation.id, "mark-done", "automatic");
                    } else {
                        pdf.eventBus.on("pagechanging", function (e) {
                            if (e.pageNumber == pdf.pagesCount && !annotation.completed) {
                                self.toggleCompletion(annotation.id, "mark-done", "automatic");
                                annotation.completed = true;
                            }
                        });
                    }
                }
            }, 1000);
        };

        // Apply content
        const applyContent = (annotation) => {
            this.render(annotation, 'html').then((data) => {
                $(`#message[data-id='${annotation.id}'] .modal-body`).attr('id', 'content').html(data).fadeIn(300);
                if (annotation.completed ) {
                    this.postContentRender(annotation);
                } else if (annotation.completiontracking == 'scrolltolastpage' && annotation.completed == false){
                    this.postContentRender(annotation, pdfCheck(annotation));
                }
            });
        };

        this.renderViewer(annotation).then(() => {
            this.renderContainer(annotation);
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