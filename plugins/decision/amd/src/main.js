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
 * Main module for the decision plugin.
 *
 * @module     ivplugin_decision/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Base from 'mod_interactivevideo/type/base';

export default class Decision extends Base {
    /**
     * Initialize the interaction type
     * @returns {void}
     */
    init() {
        if (!this.isEditMode()) {
            $(document).on('timeupdate', (e) => {
                const decisions = this.annotations.filter((d) => d.type == 'decision');
                const cantSkip = decisions.filter((d) => d.char1 != 1 && !d.viewed);
                cantSkip.sort((a, b) => a.timestamp - b.timestamp);

                if (cantSkip.length == 0) {
                    return;
                }
                const t = Number(e.originalEvent.detail.time);
                const firstCantSkip = cantSkip[0];
                if (t >= Number(firstCantSkip.timestamp)) {
                    this.player.seek(Number(firstCantSkip.timestamp));
                }
            });
        }

        // We want to hide the interactions on the navigation if decision elements do not allow skipping.
    }

    onEditFormLoaded(form, event) {
        let self = this;
        let body = super.onEditFormLoaded(form, event);

        var int = setInterval(() => {
            if ($('[name=content').length > 0) {
                clearInterval(int);
                var dest = $('[name=content').val();
                if (dest == '') {
                    $('#destination-list').append(`<div class="input-group mb-1">
                        <div class="input-group-prepend">
                            <label class="input-group-text">
                            <i class="bi bi-grip-vertical fs-unset cursor-move"></i></label>
                        </div>
                        <input type="text" class="form-control">
                        <input type="text" value="${this.convertSecondsToHMS(this.start)}"
                        placeholder="00:00:00" style="max-width: 120px;" class="form-control timestamp-input">
                        <div class="input-group-append">
                        <button class="btn add-dest btn-secondary" type="button"><i class="bi bi-plus-lg fs-unset"></i></button>
                        <button class="btn btn-danger disabled" disabled type="button">
                            <i class="bi bi-trash3-fill fs-unset"></i></button></div></div>`);
                } else {
                    dest = JSON.parse(dest);
                    dest.forEach((d, i) => {
                        $('#destination-list').append(`<div class="input-group mb-1">
                            <div class="input-group-prepend">
                            <label class="input-group-text">
                            <i class="bi bi-grip-vertical cursor-move fs-unset"></i></label>
                        </div>
                            <input type="text" class="form-control" value="${d.title}">
                            <input type="text" value="${this.convertSecondsToHMS(d.timestamp)}"
                            placeholder="00:00:00" style="max-width: 120px;" class="form-control timestamp-input">
                            <div class="input-group-append">
                            <button class="btn add-dest btn-secondary" type="button"><i class="bi bi-plus-lg fs-unset"></i></button>
                            <button class="btn btn-danger delete-dest ${i == 0 ? 'disabled' : ''}" ${i == 0 ? 'disabled' : ''}
                            type="button"><i class="bi bi-trash3-fill fs-unset"></i></button></div></div>`);
                    });
                    $('.input-group [type="text"]').trigger('input');
                }

                $('#destination-list').sortable({
                    items: '.input-group',
                    cursor: 'move',
                    update: function() {
                        $('.input-group [type="text"]').trigger('input');
                    },
                    stop: function() {
                        $('.input-group .delete-dest').removeAttr('disabled');
                        $('.input-group .delete-dest').removeClass('disabled');
                        $('.input-group .delete-dest').first().attr('disabled', true);
                        $('.input-group .delete-dest').first().addClass('disabled');
                    }
                });
            }
        }, 100);

        body.on('click', '.input-group .add-dest', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            var target = $(this).closest('.input-group');
            target.after(`<div class="input-group mb-1">
                            <input type="text" class="form-control">
                            <input value="${self.convertSecondsToHMS(self.start)}"
                             placeholder="00:00:00" type="text" style="max-width: 120px;"
                             class="form-control timestamp-input">
                            <div class="input-group-append">
                            <button class="btn add-dest btn-secondary" type="button"><i class="bi bi-plus-lg"></i></button>
                            <button class="btn btn-danger delete-dest" type="button">
                            <i class="bi bi-trash3-fill"></i></button>
                            </div>
                        </div>`);
            $('[type="text"]').trigger('input');
        });

        body.on('click', '.input-group .delete-dest', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $(this).closest('.input-group').remove();
            $('[type="text"]').trigger('input');
        });

        body.on('input', '.input-group [type="text"]', function() {
            var dest = [];
            $('#destination-list .input-group').each(function() {
                var title = $(this).find('input[type="text"]');
                var timestamp = $(this).find('.timestamp-input');
                if (title.val() != '' && timestamp.val() != ''
                    && !title.hasClass('is-invalid') && !timestamp.hasClass('is-invalid')) {
                    var parts = timestamp.val().split(':');
                    var seconds = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
                    dest.push({
                        title: title.val(),
                        timestamp: seconds
                    });
                }
            });
            $('[name=content').val(JSON.stringify(dest));
        });
        return {form, event};
    }
    /**
     * Run the interaction
     * @param {object} annotation The annotation object
     * @returns {void}
     */
    async runInteraction(annotation) {
        // Dismiss all tooltips.
        $('.tooltip').remove();
        this.player.pause();
        let self = this;
        var dest = JSON.parse(annotation.content);
        dest = dest.filter((d) => {
            return !self.isSkipped(d.timestamp);
        });

        if (dest.length == 0) {
            this.player.play();
            return;
        }

        if (!self.isEditMode()) {
            annotation.viewed = true;
            this.annotations = this.annotations.filter((d) => d.id != annotation.id);
            this.annotations.push(annotation);
        }

        let newannotation = JSON.parse(JSON.stringify(annotation));
        newannotation.content = JSON.stringify(dest);
        const data = await this.render(newannotation, 'json');
        let $html = `<div class="position-absolute decision text-center mx-auto w-100">
            <h5 class="pt-5 pb-3 bg-white" id="decision-q">
            <i class="mb-2 bi bi-signpost-split-fill" style="font-size: 2em"></i><br>${newannotation.formattedtitle}</h5>`;

        data.forEach((dest, order) => {
            $html += `<a href="javascript:void(0)" data-timestamp="${dest.timestamp}"
                 data-order="${order}" class="decision-option btn btn-outline-secondary btn-rounded mb-2 d-flex
                  justify-content-between align-items-center mx-auto"><span class="text-truncate">${dest.title}</span>
                  <i class="bi bi-chevron-right"></i></a>`;
        });
        $html += '</div>';
        let $message = $(`<div id="message" style="z-index:1005;display:none;" data-id="${annotation.id}">
            <div class="modal-body p-0" id="content">${$html}</div></div>`);
        $('#video-wrapper').append($message);
        $message.fadeIn(300, 'swing', function() {
            if (annotation.char1 == 1) {
                $message.append(`<button class="btn btn-secondary btn-rounded position-absolute"
                     id="close-decision" style="right: 1rem; top: 1rem;">
                     ${M.util.get_string('skip', 'ivplugin_decision')}
                     <i class="ml-2 bi bi-chevron-right"></i></button>`);
            }
            $(document).on('click', '#close-decision', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                self.player.play();
                $('#taskinfo').fadeIn(300);
                $('[data-region="chapterlists"], #controller').removeClass('no-pointer-events');
            });

            if (!self.isEditMode()) {
                $('#taskinfo').fadeOut(300);
                $('[data-region="chapterlists"], #controller').addClass('no-pointer-events');
            }
        });

        $(document).on('click', `#message[data-id='${annotation.id}'] .decision-option`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            var time = Number($(this).data('timestamp'));
            if (time < this.start) {
                time = this.start;
            } else if (time > this.end) {
                time = this.end;
            }
            self.player.seek(time);
            $(`#message[data-id='${annotation.id}']`).fadeOut(300);
            self.player.play();
            $('#taskinfo').fadeIn(300);
            $('[data-region="chapterlists"], #controller').removeClass('no-pointer-events');
        });
    }
}