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
 * @module     ivplugin_skipsegment/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Base from 'mod_interactivevideo/type/base';

export default class SkipSegment extends Base {
    init() {
        this.typeItems = this.annotations.filter((annotation) => annotation.type == this.type);
        var self = this;
        var skipsegment = this.annotations.filter((annotation) => annotation.type == 'skipsegment');
        $(document).on('timeupdate', function (e) {
            var t = e.originalEvent.detail.time;
            skipsegment.forEach((annotation) => {
                if (annotation.timestamp <= t && annotation.title >= t) {
                    self.runInteraction(annotation);
                }
            });
        });
    }
    renderEditItem(annotations, listItem, item) {
        listItem = super.renderEditItem(annotations, listItem, item);
        listItem.find('[data-editable]').removeAttr('data-editable');
        listItem.find('.btn.copy').remove();
        listItem.find('.title').replaceWith(`<span class="skipend timestamp
                            bg-gray px-2 py-1 rounded-sm text-truncate"
                            data-timestamp="${item.title}">${this.convertSecondsToHMS(item.title)}</span>`);
        if (this.isSkipped(item.timestamp)) {
            listItem.find('.skipend').after(`<span class="badge badge-warning ml-2">
                            ${M.util.get_string('skipped', 'ivplugin_skipsegment')}</span>`);
        }
        return listItem;
    }

    onEditFormLoaded(form, event) {
        var self = this;
        var body = super.onEditFormLoaded(form, event);
        body.on('change', '[name=titleassist]', function (e) {
            e.preventDefault();
            // Make sure the timestamp format is hh:mm:ss
            if (!self.validateTimestampFormat($(this).val())) {
                self.addNotification(M.util.get_string('invalidtimestampformat', 'ivplugin_skipsegment'));
                $(this).val($('[name=timestampassist]').val());
                return;
            }

            // Convert the timestamp to seconds
            var parts = $(this).val().split(':');
            var timestamp = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            if (!self.isBetweenStartAndEnd(timestamp)) {
                var message = M.util.get_string('interactioncanonlybeaddedbetweenstartandendtime', 'mod_interactivevideo', {
                    "start": self.convertSecondsToHMS(self.start),
                    "end": self.convertSecondsToHMS(self.end),
                });
                self.addNotification(message);
                $(this).val($('[name=timestampassist]').val());
                return;
            }

            // Make sure the title assist is not the same as the timestamp assist or less than the timestamp assist
            if (timestamp <= parseInt($('[name=timestamp]').val())) {
                self.addNotification(M.util.get_string('segmentendmustbegreaterthantimestamp', 'mod_interactivevideo'));
                $(this).val($('[name=timestampassist]').val());
                return;
            }

            $('[name=title]').val(timestamp);
        });
        return { form, event };
    }

    renderItemOnVideoNavigation(annotation) {
        if (annotation.timestamp < this.start || annotation.timestamp > this.end) {
            return;
        }
        var percentage = ((Number(annotation.timestamp) - this.start) / this.totaltime) * 100;
        if (this.isVisible(annotation)) {
            var length = (Number(annotation.title) - Number(annotation.timestamp)) / this.totaltime * 100;
            $("#video-nav ul").append(`<li class="annotation ${annotation.type}
             ${this.isClickable(annotation) ? '' : 'no-pointer-events'} position-absolute bg-dark progress-bar-striped progress-bar"
              data-timestamp="${annotation.timestamp}" data-id="${annotation.id}"
               style="left: calc(${percentage}%); width: ${length}%;" data-toggle="tooltip"
               data-container="#wrapper" data-trigger="hover"
         data-html="true" data-original-title='<i class="${this.prop.icon}"></i>'></li>`);
        }
    }
    runInteraction(annotation) {
        $('.video-block').append(`<div id="skipsegment" class="text-white position-absolute p-3 hide"
         style="bottom: 0;right: 0;text-shadow: 1px 2px 3px gray;line-height: 1rem;">
         <i class="${this.prop.icon}" style="font-size: xxx-large;"></i></div>`);
        $('#skipsegment').fadeIn(300);
        this.player.seek(Number(annotation.title));
        var percentage = (Number(annotation.title) - this.start) / this.totaltime * 100;
        $('#video-nav #progress').replaceWith(`<div id="progress"
         style="width: ${percentage > 100 ? 100 : percentage}%;"></div>`);
        this.player.play();
        setTimeout(() => {
            $('#skipsegment').fadeOut(300);
            setTimeout(() => {
                $('#skipsegment').remove();
            }, 300);
        }, 1000);
    }
}