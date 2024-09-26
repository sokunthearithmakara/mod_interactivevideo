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
 * Main class for the HTML Viewer plugin.
 *
 * @module     ivplugin_htmlviewer/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Base from 'mod_interactivevideo/type/base';
import $ from 'jquery';

export default class HtmlViewer extends Base {

    /**
     * Override the renderContainer method
     * @param {Object} annotation The annotation object
     * @return {void}
     */
    renderContainer(annotation) {
        $(`#message[data-id='${annotation.id}']`).addClass('hasiframe');
        super.renderContainer(annotation);
    }

    /**
     * Override the postContentRender method
     * @param {Object} annotation The annotation object
     * @return {void}
     */
    postContentRender(annotation) {
        const checkIframe = () => {
            if ($(`#message[data-id='${annotation.id}'] iframe`).length > 0) {
            // Remove the loading background because some iframe has transparent content
            setTimeout(() => {
                $(`#message[data-id='${annotation.id}'] iframe`).css('background', 'none');
            }, 1000);
            } else {
            requestAnimationFrame(checkIframe);
            }
        };
        requestAnimationFrame(checkIframe);
    }

    /**
     * Override the displayReportView method
     * @param {Object} annotation The annotation object
     * @return {void}
     */
    async displayReportView(annotation) {
        const data = await this.render(annotation, 'html');
        let $message = $(`#message[data-id='${annotation.id}']`);
        $message.addClass('hasiframe');
        $message.find(`.modal-body`).html(data);
        $message.find(`.modal-body`).attr('id', 'content');
        this.postContentRender(annotation);
    }
}