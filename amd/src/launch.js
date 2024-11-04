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
 * Launch the interactive video in modal on course page
 *
 * @module     mod_interactivevideo/launch
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(['jquery'], function($) {
    return {
        init: function() {
            // Launch the interactive video in modal
            $(document).on('click', '.launch-interactivevideo', function(e) {
                // Get showcontrols from cache.
                let showcontrols = localStorage.getItem('showcontrols') ? true : false;
                e.preventDefault();
                const id = $(this).data('id');
                const instance = $(this).data('instance');
                const course = $(this).data('course');
                const contextid = $(this).data('contextid');
                const $card = $(this).closest('#interactivevideo-' + instance);
                $card.find('.image-container').addClass('hovered');
                const modal = `<div class="modal fade p-0 modal-fullscreen rounded-0" id="playermodal"
                data-backdrop="static" data-keyboard="false" tabindex="-1" aria-labelledby="playermodalLabel"
                aria-hidden="true">
                   <div class="rounded-0 modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl position-relative">
                    <div class="position-fixed w-100 h-100 no-pointer bg-transparent z-index-1" id="background-loading">
                        <div class="d-flex h-100 align-items-center justify-content-center">
                            <div class="spinner-border text-danger" style="width: 3rem; height: 3rem;" role="status">
                                <span class="sr-only">Loading...</span>
                            </div>
                        </div>
                    </div>
                       <div class="modal-content ${showcontrols ? 'show-control' : ''}">
                       <div class="modal-header border-0 text-white align-items-center py-0 h-0
                        position-absolute w-100 z-index-1 rounded-0">
                         <div class="modal-background w-100 position-absolute"></div>
                               <span class="modal-title position-relative z-index-1 d-flex align-items-center overflow-hidden"
                                id="playermodalLabel">
                                <span class="h5 mb-0">
                                    <button type="button" class="btn border-0 m-1 p-1 h5" data-dismiss="modal" aria-label="Close">
                                        <i class="fa fa-arrow-left text-white m-0 fa-2x" aria-hidden="true"></i>
                                    </button>
                                </span>

                                <div class="d-sm-none d-block small ml-2" data-region="activity-completion">
                                </div>
                               </span>

                               <div class="modal-action d-flex align-items-center position-relative z-index-1">
                               <div class="d-none d-sm-block small" data-region="activity-completion">
                               </div>
                               <a type="button" class="btn ml-2 border-0 h5 mb-0"
                                href="${M.cfg.wwwroot}/mod/interactivevideo/view.php?id=${id}">
                               <i class="fa fa-external-link text-white m-0 fa-xl" aria-hidden="true"></i></a>
                               </div>
                           </div>
                           <div class="modal-body p-0 position-relative">
                           <iframe id="ivplayer" src="${M.cfg.wwwroot}/mod/interactivevideo/view.php?id=${id}&embed=1" frameborder=0
                           class="w-100 position-absolute h-100"></iframe>
                           <button type="button" class="btn border-0 m-1 p-1 h5 toggle-controls d-none">
                                   <i class="fa fa-chevron-up text-white m-0 fa-2x" aria-hidden="true"></i>
                               </button></span>
                           </div>
                       </div>
                   </div>
               </div>`;
                $('#playermodal').remove(); // Important:: Remove the previous modal ONLY after the new one is created.
                $('body').append(modal);
                $('#playermodal').modal('show');

                const headerFunction = function() {
                    let $header = $('#playermodal .modal-header');
                    if ($header.hasClass('show')) {
                        return;
                    }

                    $header.addClass('show');
                    $header.fadeIn();

                    setTimeout(function() {
                        $header.removeClass('show');
                        $header.fadeOut();
                    }, 5000);
                };

                let iframeDoc, iframeAnnos, details, player;
                $('#playermodal').on('shown.bs.modal', function() {
                    $(this).find('.modal-header').addClass('show');
                    let $completion = $card.find('[data-region=activity-information]');
                    $completion = $completion.clone();
                    $(this).find('[data-region="activity-completion"]').html($completion);
                    // Listen the player timeupdate event in the iframe.
                    let checkIframeDoc = function() {
                        iframeDoc = document.getElementById('ivplayer').contentDocument;
                        iframeAnnos = document.getElementById('ivplayer').contentWindow.IVANNO;
                        if (!iframeDoc.getElementById('player')) {
                            requestAnimationFrame(checkIframeDoc);
                            return;
                        }
                        // Hide the background-loading.
                        $('#background-loading').hide(0);
                        if (!iframeAnnos) {
                            requestAnimationFrame(checkIframeDoc);
                            return;
                        }

                        player = document.getElementById('ivplayer').contentWindow.IVPLAYER;

                        if (iframeDoc.getElementById('player')) {
                            $('#playermodal .modal-header').removeClass('show');
                            $('#playermodal .toggle-controls').removeClass('d-none');

                            if (!showcontrols) {
                                setTimeout(function() {
                                    $('#playermodal .modal-content').removeClass('show-control');
                                }, 1000);
                            }

                            $('#playermodal .toggle-controls').on('click', function() {
                                $('#playermodal .modal-content').toggleClass('show-control');
                                showcontrols = $('#playermodal .modal-content').hasClass('show-control');
                                if (showcontrols) {
                                    localStorage.setItem('showcontrols', '1');
                                } else {
                                    localStorage.removeItem('showcontrols');
                                }
                            });

                            iframeDoc.addEventListener('annotationitemsrendered', function(e) {
                                details = e.detail;
                            });

                            $(iframeDoc).on('mousemove', '#video-wrapper', function() {
                                let $message = iframeDoc.querySelector('#message');
                                let $activestart = iframeDoc.querySelector('#start-screen:not(.d-none) .hasintro');
                                if ($message || $activestart) {
                                    $('#playermodal .modal-header').removeClass('show');
                                } else {
                                    headerFunction();
                                }
                            });

                            // Analytics progress bar.
                            let $progressbar = $card.find('.analytics.progress .progress-bar');
                            if ($progressbar.length == 0) {
                                return;
                            }
                            let current = $progressbar.data('current');
                            iframeDoc.addEventListener('analyticsupdated', function(e) {
                                let percentage = e.detail.percentage;
                                if (percentage > current) {
                                    $progressbar.css('width', percentage + '%')
                                        .data('current', percentage);

                                    $card.find('.analytics-percentage').text(Math.round(percentage));
                                }
                            });

                        } else {
                            requestAnimationFrame(checkIframeDoc);
                        }
                    };
                    requestAnimationFrame(checkIframeDoc);

                    $(document).off('click', '#playermodal [data-action="toggle-manual-completion"]')
                        .on('click', '#playermodal [data-action="toggle-manual-completion"]', function() {
                            $(this).parent().addClass('updated');
                            if ($(this).data('withavailability') == 1) {
                                history.pushState(null, null, M.cfg.wwwroot + '/course/view.php?id=' + course + '#module-' + id);
                            }
                        });

                    // Update the browser url to the current activity.
                    history.pushState(null, null, M.cfg.wwwroot + '/mod/interactivevideo/view.php?id=' + id);
                });

                $('#playermodal').on('hide.bs.modal', async function() {
                    // Trigger hover on .image-container for 2 seconds.
                    setTimeout(function() {
                        $card.find('.image-container').removeClass('hovered');
                    }, 1000);

                    if (player) { // Must check this in case user close modal before the player is ready.
                        await player.pause();
                    } else {
                        $(this).remove();
                        return;
                    }
                    // If there is automatic completion conditions, we have to update it.
                    let $autocompletion = $card.find('.automatic-completion-conditions');
                    if ($autocompletion.length > 0) {
                        const completion = await $.ajax({
                            url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                            method: 'POST',
                            dataType: 'text',
                            data: {
                                action: 'get_cm_completion',
                                cmid: id,
                                sesskey: M.cfg.sesskey,
                                contextid: contextid,
                                courseid: course,
                                userid: M.cfg.userId || 0,
                            }
                        });

                        if (completion) {
                            $card.find('[data-region=activity-information]')
                                .html($(completion).html());
                        }
                    }

                    // If there is manual completion, we have to copy the button to the course page.
                    let $manualcompletion = $(this).find('.completion-info.updated');
                    if ($manualcompletion.length > 0) {
                        $card.find('.completion-info').html($manualcompletion.html());
                    }

                    if (details) {
                        let progressbar = $card.find('.tasks .progress-bar');
                        if (progressbar.length > 0) {
                            progressbar.css('width', Math.round(details.completed / details.total * 100) + '%');
                            if (details.completed == details.total) {
                                progressbar.addClass('bg-success').removeClass('bg-primary');
                            } else {
                                progressbar.removeClass('bg-success').addClass('bg-primary');
                            }
                            $card.find('.percentage')
                                .text(Math.round(details.completed / details.total * 100));
                            $card.find('.items').text(`(${details.completed}/${details.total})`);
                            $card.find('.xp').text(details.xp);
                        }
                    }

                    // Update the browser url to the current course.
                    history.pushState(null, null, M.cfg.wwwroot + '/course/view.php?id=' + course);

                    if (iframeAnnos) {
                        // Remove the new-bagde from the poster.
                        $card.find('.new-badge').remove();
                    }

                    $card.closest('.modtype_interactivevideo')[0]
                        .scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
                });

                // Close modal when the browser back button is clicked.
                window.onpopstate = function() {
                    $('#playermodal').modal('hide');
                };
            });

            $(document).on('click', '.interactivevideo-card .description-show',
                function() {
                    const $description = $(this).closest('.top-section').find('.description');
                    $description.slideToggle('fast', 'swing');
                    $(this).toggleClass('rotate');
                });

            // Get the #hash from the url and scroll to the element and hover it.
            $(document).ready(function() {
                let hash = window.location.hash;
                if (hash) {
                    let $element = $(hash);
                    if ($element.length > 0 && $element.hasClass('modtype_interactivevideo')) {
                        $element.addClass('highlighted');
                        setTimeout(() => {
                            $element[0].scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
                            setTimeout(function() {
                                $element.removeClass('highlighted');
                            }, 3000);
                        }, 1000);
                    }
                }
            });
        },
    };
});