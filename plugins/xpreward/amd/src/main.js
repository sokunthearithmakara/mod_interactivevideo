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
 * Main class for the xpreward plugin
 *
 * @module     ivplugin_xpreward/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import $ from 'jquery';
import Base from 'mod_interactivevideo/type/base';

export default class XpReward extends Base {
    /**
     * Render the container for the annotation
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    renderContainer(annotation) {
        $('#video-wrapper #message[data-id="${annotation.id}"]').remove();
        $('#video-wrapper').append(`<div id="message" data-id="${annotation.id}"
             class="text-white bg-transparent" style="z-index:5;">
            </div>`);
    }

    completionCallback(annotations, thisItem) {
        $(`#message[data-id='${thisItem.id}'] #xpreward`).find('button').removeClass('btn-primary').addClass('btn-success');
        setTimeout(() => {
            this.player.play();
        }, 1000);
    }

    postContentRender(annotation) {
        var self = this;
        $(document).on('click', `#message[data-id='${annotation.id}'] #xpreward`, function (e) {
            e.preventDefault();
            $(this).find('button').prop('disabled', true);
            $(this).find('button').text(M.util.get_string('claimedxp', 'ivplugin_xpreward', annotation.xp));

            self.toggleCompletion(annotation.id, 'mark-done', 'automatic');
        });
    }

    /**
     * What happens when an item runs
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    runInteraction(annotation) {
        this.player.pause();
        this.renderContainer(annotation);
        this.render(annotation).then((content) => {
            let $message = $(`#message[data-id='${annotation.id}']`);
            $message.html('<div class="modal-body d-flex align-items-center justify-content-center">' + content + '</div>');
            return this.postContentRender(annotation);
        }).catch(() => {
            // Do nothing.
        });
    }
}