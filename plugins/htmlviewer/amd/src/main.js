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
import $ from 'jquery';
import Iframe from 'ivplugin_iframe/main';

export default class HtmlViewer extends Iframe {
    postContentRenderEditor(modal) {
        var modalbody = modal.getRoot();
        modalbody.addClass('modalhasiframe');
        var interval = setInterval(() => {
            if ($('.modalhasiframe iframe').length > 0) {
                // Remove the loading background because some iframe have transparent content.
                setTimeout(() => {
                    $('.modalhasiframe .modal-body iframe').css('background', 'none');
                }, 1000);
                clearInterval(interval);
            }
        }, 1000);
    }
}