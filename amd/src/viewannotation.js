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
 * View page module
 *
 * @module     mod_interactivevideo/viewannotation
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(['jquery', 'core/event_dispatcher', 'core/toast'], function($, {dispatchEvent}, Toast) {
    let ctRenderer = new Object();
    let annotations, // Array of annotations.
        totaltime, // Video total time.
        activityType, // Current activityType.
        lastanno, // Last run annotation.
        contentTypes, // Array of available content types.
        displayoptions, // Display options.
        releventAnnotations, // Array of annotations that are not skipped and have completion.
        player;

    const $videoNav = $('#video-nav');

    const convertSecondsToMinutes = (seconds) => {
        if (seconds < 60) {
            return seconds + 's';
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return minutes + 'm ' + remainingSeconds + 's';
        }
    };

    const renderAnnotationItems = async(annos, start, totaltime) => {
        releventAnnotations = annos;

        let actualduration = totaltime;

        const skipsegments = annos.filter(x => x.type == 'skipsegment');

        if (skipsegments.length > 0) {
            skipsegments.forEach(x => {
                const length = (Number(x.title) - Number(x.timestamp));
                actualduration -= length;
            });
        }

        const completableAnno = releventAnnotations.filter(x => JSON.parse(x.prop).hascompletion);
        const actualAnnotationCounts = completableAnno.length;

        const xp = completableAnno.map(x => Number(x.xp)).reduce((a, b) => a + b, 0);

        const completedAnnos = completableAnno
            .filter(x => x.completed);

        const xpEarned = completedAnnos.map(x => Number(x.xp)).reduce((a, b) => a + b, 0);

        $(".metadata").empty();
        $(".metadata").append(`<span class="d-inline-block mr-3">
            <i class="bi bi-stopwatch mr-2"></i>${convertSecondsToMinutes(Math.ceil(actualduration))}</span>
            <span class="d-inline-block mr-3">
        <i class="bi bi-bullseye mr-2"></i>${completedAnnos.length} / ${actualAnnotationCounts}</span>
        <span class="d-inline-block"><i class="bi bi-star mr-2"></i>${xpEarned} / ${xp}</span>`);

        $("#video-nav ul").empty();

        if (annos.length == 0) {
            return;
        }

        if (displayoptions.preventseeking == 1) {
            $videoNav.addClass('no-pointer-events');
        }

        if (displayoptions.hidemainvideocontrols == 1 || displayoptions.hideinteractions == 1) {
            if (displayoptions.hidemainvideocontrols == 1) {
                $('#wrapper').addClass('no-videonav');
            }
            return;
        }
        const render = new Promise((resolve) => {
            annos.forEach(async(x) => {
                const renderer = ctRenderer[x.type];
                renderer.renderItemOnVideoNavigation(x);
            });
            resolve();
        });

        render.then(() => {
            dispatchEvent('annotationitemsrendered', {'annotations': annos});
            $('.annolistinchapter').empty();
            const chapteritems = releventAnnotations.filter(x => x.type != 'skipsegment' && JSON.parse(x.prop).hascompletion);
            chapteritems.sort((a, b) => a.timestamp - b.timestamp);
            chapteritems.forEach((x) => {
                $('[data-region="chapterlists"] li').each(function() {
                    const cstart = $(this).data('start');
                    const cend = $(this).data('end');
                    if (x.timestamp >= cstart && x.timestamp < cend) {
                        $(this).find('.annolistinchapter')
                            .append(`<li class="border-bottom anno d-flex align-items-center justify-content-between
                         px-3 py-2 ${x.completed ? "completed" : ""}" data-id="${x.id}" data-timestamp="${x.timestamp}">
                         <span class="text-nowrap">
                         <i class="small bi ${x.completed ? "bi-check-circle-fill text-success" : 'bi-circle'} mr-2"></i>
                         <i class="${JSON.parse(x.prop).icon} mr-2"></i></span>
                         <span class="flex-grow-1 text-truncate">${x.formattedtitle}</span>
                         <span class="text-nowrap">${x.xp}<i class="bi bi-star ml-1"></i></span></li>`);
                    }
                });
            });
        }).then(() => {
            dispatchEvent('chapterrendered', {'annotations': releventAnnotations});
        });

        $(document).on('annotationitemsrendered', function() {
            $('#controler [data-toggle="tooltip"]').tooltip({
                container: '#controler',
                boundary: 'window',
            });
            if (displayoptions.disableinteractionclickuntilcompleted == 1) {
                $videoNav.find('ul li:not(.completed):not(.chapter)').addClass('no-click');
            }
            if (displayoptions.disableinteractionclick == 1) {
                $videoNav.find('ul li:not(.chapter)').addClass('no-click');
            }
            if (displayoptions.preventseeking == 1) {
                $videoNav.find('ul li').addClass('no-click');
                $videoNav.addClass('no-click');
            }
        });
    };

    return {
        renderAnnotationItems: renderAnnotationItems,
        init: function(url, coursemodule, interaction, course, userid, start = 0, end,
            completionpercentage, gradeiteminstance, grademax, vtype, preventskip = true, moment = null, doptions = {}) {
            // Convert start to number if string
            start = Number(start);
            if (isNaN(start)) {
                start = 0;
            }

            // Convert end to number if string
            end = Number(end);
            if (isNaN(end)) {
                end = null;
            }

            displayoptions = doptions;

            let playerReady = false;

            const convertSecondsToHMS = (seconds) => {
                const h = Math.floor(seconds / 3600);
                const m = Math.floor(seconds % 3600 / 60);
                const s = Math.floor(seconds % 3600 % 60);
                return (h > 0 ? h + ':' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
            };

            const replaceProgressBars = (percentage) => {
                percentage = percentage > 100 ? 100 : percentage;
                $videoNav.find('#progress').replaceWith(`<div id="progress" style="width: ${percentage}%;"></div>`);
            };

            const getAnnotations = (callback) => {
                // Get all interaction items.
                const annnoitems = $.ajax({
                    url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                    method: "POST",
                    dataType: "text",
                    data: {
                        action: 'get_items',
                        sesskey: M.cfg.sesskey,
                        id: interaction,
                        contextid: M.cfg.courseContextId
                    }
                });

                // Get current user progress.
                const userprogress = $.ajax({
                    url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                    method: "POST",
                    dataType: "text",
                    data: {
                        action: 'get_progress',
                        sesskey: M.cfg.sesskey,
                        id: interaction,
                        uid: userid
                    }
                });

                // Get all content types.
                const getContentTypes = $.ajax({
                    url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                    method: "POST",
                    dataType: "text",
                    data: {
                        action: 'getallcontenttypes',
                        sesskey: M.cfg.sesskey,
                    }
                });

                $.when(annnoitems, userprogress, getContentTypes).done(function(annos, progress, ct) {
                    window.console.log(annos, progress, ct);
                    annotations = JSON.parse(annos[0]);
                    progress = JSON.parse(progress[0]);
                    contentTypes = JSON.parse(ct[0]);

                    // Get only annotations within the start and end times.
                    // Remove the skip segments that are completely outside the start and end times.
                    // Remove the annotations whose content type is not in the contentTypes.
                    annotations = annotations.filter(x => {
                        const inContentType = contentTypes.some(y => y.name === x.type);
                        if (!inContentType) {
 return false;
}

                        if (x.type === 'skipsegment') {
                            return !(x.timestamp > end || x.title < start);
                        }

                        return x.timestamp >= start && x.timestamp <= end;
                    });

                    const completedItems = progress.completeditems == '' ? [] : JSON.parse(progress.completeditems);
                    annotations = annotations.map(x => {
                        // First, let's make sure numbers are treated as numbers.
                        x.timestamp = Number(x.timestamp);
                        x.xp = Number(x.xp);
                        if (x.type == 'skipsegment') {
                            x.title = Number(x.title);
                        }
                        // Properties must be stringified so it can be passed through Fragment.
                        x.prop = JSON.stringify(contentTypes.find(y => y.name == x.type));

                        x.completed = completedItems.indexOf(x.id) > -1;

                        // Handle the skip segments that are half inside the start and end times.
                        if (x.type == 'skipsegment') {
                            if (x.timestamp < start && x.title > start) {
                                x.timestamp = start;
                            }
                            if (x.title > end && x.timestamp < end) {
                                x.title = end;
                            }
                        }

                        const advanced = JSON.parse(x.advanced);
                        x.rerunnable = advanced && advanced.replaybehavior === '1';

                        return x;
                    });

                    // Sort by timestamp.
                    annotations.sort((a, b) => a.timestamp - b.timestamp);

                    const skipsegments = annotations.filter(x => x.type == 'skipsegment');

                    releventAnnotations = [];
                    annotations.forEach(x => {
                        if (JSON.parse(x.prop).hascompletion) {
                            let shouldAdd = true;
                            skipsegments.forEach(y => {
                                if (Number(x.timestamp) > Number(y.timestamp) && Number(x.timestamp) < Number(y.title)) {
                                    shouldAdd = false;
                                }
                            });
                            if (shouldAdd) {
                                releventAnnotations.push(x);
                            }
                        } else {
                            releventAnnotations.push(x);
                        }
                    });

                    if (releventAnnotations.length > 0 && !releventAnnotations.find(x => x.type == 'chapter')) {
                        // Add a dummy chapter at the start of the video.
                        releventAnnotations.unshift({
                            id: 0,
                            title: M.util.get_string('startchapter', 'mod_interactivevideo'),
                            formattedtitle: M.util.get_string('startchapter', 'mod_interactivevideo'),
                            timestamp: start,
                            type: 'chapter',
                            prop: JSON.stringify(contentTypes.find(x => x.name == 'chapter')),
                            xp: 0,
                            completed: true,
                            hide: true
                        });
                    }

                    const getRenderers = new Promise((resolve) => {
                        const chapterContentType = contentTypes.find(x => x.name == 'chapter');
                        // We want to use only the content types that are being used in the annotations
                        contentTypes = contentTypes.filter(x => releventAnnotations.map(y => y.type).includes(x.name));
                        if (contentTypes.length == 0) {
                            // Remove the chapter toggle
                            $('#chaptertoggle, #chapter-container-left, #chapter-container-right').remove();
                            resolve(ctRenderer);
                        } else {
                            $('#chaptertoggle, #chapter-container-left, #chapter-container-right').removeClass('d-none');
                        }
                        if (!contentTypes.find(x => x.name == 'chapter')) {
                            // Include the chapterContentType
                            contentTypes.push(chapterContentType);
                        }
                        var count = 0;
                        contentTypes.forEach(x => {
                            require(['' + x.amdmodule], function(Type) {
                                ctRenderer[x.name] = new Type(player, releventAnnotations, interaction, course, userid,
                                    completionpercentage, gradeiteminstance, grademax, vtype, preventskip, totaltime, start,
                                    end, x);
                                try {
                                    ctRenderer[x.name].init();
                                } catch (error) {
                                    // Do nothing.
                                }
                                count++;
                                if (count == contentTypes.length) {
                                    resolve(ctRenderer);
                                }
                            });
                        });
                    });

                    getRenderers.then(() => {
                        renderAnnotationItems(releventAnnotations, start, totaltime);
                        $("#play").removeClass('d-none');
                        $("#spinner").remove();
                        $("#video-info").toggleClass('d-none d-flex');
                        callback();
                    });
                });
            };

            const runInteraction = async(annotation) => {
                player.pause();
                lastanno = annotation;
                // Remove the previous message but keep the one below the video.
                $('#annotation-modal').modal('hide');
                $('#message').not('[data-placement=bottom]').remove();
                $('#end-screen, #start-screen').fadeOut(300);

                if (preventskip) {
                    const theAnnotations = releventAnnotations
                        .filter(x => Number(x.timestamp) < Number(annotation.timestamp)
                            && x.completed == false && JSON.parse(x.prop).hascompletion == true);
                    if (theAnnotations.length > 0) {
                        const theAnnotation = theAnnotations[0];
                        player.pause();
                        await player.seek((theAnnotation.timestamp - 0.7 > start) ? (theAnnotation.timestamp - 0.7) : start);
                        $('#toast').toast('show');
                        return;
                    }
                }
                activityType = ctRenderer[annotation.type];
                activityType.runInteraction(annotation);
            };

            const shareMoment = async() => {
                if (!moment) {
                    return;
                }
                // Check if the url has a timestamp using url params.
                const urlParams = new URLSearchParams(window.location.search);
                const time = Number(moment);
                if (time && !isNaN(time) && time >= start && time <= end) {
                    // Hide the start screen.
                    $('#video-wrapper #start-screen').hide(0);
                    await player.seek(time);
                    player.play();
                    const theAnnotation = releventAnnotations.find(x => x.timestamp == time);
                    if (theAnnotation) {
                        runInteraction(theAnnotation);
                    }

                    replaceProgressBars(((time - start) / totaltime) * 100);

                }
                urlParams.delete('t');
                const newurl = window.location.protocol
                    + '//' + window.location.host + window.location.pathname + '?' + urlParams.toString();
                window.history.replaceState(null, null, newurl);
            };

            const onReady = () => {
                if (player.posterImage) {
                    $('#video-wrapper #start-screen').css({
                        'background': `url(${player.posterImage}) no-repeat center center / cover`,
                    });
                }
                $(".video-block").css('background', 'transparent');
                player.getDuration().then((duration) => {
                    end = !end ? duration : Math.min(end, duration);
                    start = start > end ? 0 : start;
                    totaltime = end - start;
                    getAnnotations(shareMoment);
                    $('#duration').text(convertSecondsToHMS(totaltime));
                });

                // Recalculate the ratio of the video
                player.ratio().then((ratio) => {
                    $("#video-wrapper").css('padding-bottom', (1 / ratio) * 100 + '%');
                });

                playerReady = true;
                $('#start-screen #start').focus();
            };

            const onPaused = () => {
                if (!playerReady) {
                    return;
                }
                clearInterval(interval);
                $('#playpause').find('i').removeClass('bi-pause-fill').addClass('bi-play-fill');
                $('#playpause').attr('data-original-title', M.util.get_string('play', 'mod_interactivevideo'));
            };

            const onEnded = (t) => {
                if (!playerReady) {
                    return;
                }
                const time = t || end;
                // Check if theAnnotation exists at the end of the video.
                const theAnnotation = releventAnnotations.find(x => x.timestamp == time);
                if (theAnnotation && !lastanno) {
                    if (!theAnnotation.completed || theAnnotation.rerunnable) {
                        player.pause();
                        runInteraction(theAnnotation);
                    }
                    // Toggle the tooltip to show the title.
                    $videoNav.find('.annotation[data-id="' + theAnnotation.id + '"] .item').tooltip('show');
                    // Hide the tooltip after 2 seconds.
                    setTimeout(function() {
                        $videoNav.find('.annotation[data-id="' + theAnnotation.id + '"] .item').tooltip('hide');
                    }, 2000);
                }

                $('#restart').removeClass('d-none').fadeIn(300);
                $('#end-screen').removeClass('d-none').fadeIn(300);
                $('#progress').css('width', '100%');
                clearInterval(interval);
                player.pause();
                $('#playpause').find('i').removeClass('bi-pause-fill').addClass('bi-play-fill');
                $('#playpause').attr('data-original-title', M.util.get_string('play', 'mod_interactivevideo'));
            };

            let interval;
            const onPlaying = () => { // Use with player timeupdate event.
                // Reset the annotation content.
                if (!playerReady) {
                    return;
                }
                $('#annotation-modal').modal('hide');
                $('#message').not('[data-placement=bottom]').remove();
                $('#end-screen, #start-screen').fadeOut(300);
                $('#restart').addClass('d-none');

                $('#playpause').find('i').removeClass('bi-play-fill').addClass('bi-pause-fill');
                $('#playpause').attr('data-original-title', M.util.get_string('pause', 'mod_interactivevideo'));
                const intervalFunction = async function() {
                    const isPlaying = await player.isPlaying();
                    const isEnded = await player.isEnded();
                    if (!isPlaying || isEnded) {
                        clearInterval(interval);
                        return;
                    }

                    player.getCurrentTime().then((time) => {
                        const t = time;
                        if (t > end || isEnded) {
                            clearInterval(interval);
                            onEnded(end);
                            return;
                        }

                        dispatchEvent('timeupdate', {'time': t});

                        time = Math.round(time);

                        // If it is the same annotation we just run, then we don't need to run it again.
                        if (lastanno && time == lastanno.timestamp) {
                            return;
                        } else {
                            if (lastanno && time > lastanno.timestamp) {
                                lastanno = null;
                            }
                            let percentagePlayed = (t - start) / totaltime;
                            $('#currenttime').text(convertSecondsToHMS(t - start));
                            percentagePlayed = percentagePlayed > 1 ? 1 : percentagePlayed;
                            $('#video-nav #progress').css('width', percentagePlayed * 100 + '%');

                            const theAnnotation = releventAnnotations.find(x => (t - player.frequency) <= x.timestamp
                                && (t + player.frequency) >= x.timestamp && x.id != 0);
                            if (theAnnotation) {
                                if (theAnnotation.completed && !theAnnotation.rerunnable) {
                                    $('#video-nav .annotation[data-id="' + theAnnotation.id + '"] .item').tooltip('show');
                                    setTimeout(function() {
                                        $('#video-nav .annotation[data-id="' + theAnnotation.id + '"] .item').tooltip('hide');
                                    }, 2000);
                                } else {
                                    player.pause();
                                    $('#video-nav #progress')
                                        .css('width', (theAnnotation.timestamp - start) / totaltime * 100 + '%');
                                    runInteraction(theAnnotation);
                                }
                            }
                        }
                    });

                    // Pause video on spacebar pressed
                    $(document).on('keydown', function(e) {
                        if (e.keyCode == 32) {
                            e.preventDefault();
                            player.pause();
                        }
                    });
                };

                if (player.type == 'yt' || player.type == 'wistia') {
                    interval = setInterval(intervalFunction, player.frequency * 100);
                } else {
                    intervalFunction();
                }

            };

            // Implement the player
            require(['mod_interactivevideo/player/' + vtype], function(VideoPlayer) {
                player = new VideoPlayer(
                    url,
                    start,
                    end,
                    displayoptions.useoriginalvideocontrols == 1,
                    true,
                    false
                );
            });

            $(document).on('timeupdate', async function(e) {
                const t = e.originalEvent.detail.time;
                if (preventskip) {
                    const theAnnotations = releventAnnotations.filter(x => Number(x.timestamp) <= (t + player.frequency)
                        && x.completed == false && JSON.parse(x.prop).hascompletion == true);
                    if (theAnnotations.length > 0) {
                        const theAnnotation = theAnnotations[0];
                        player.pause();
                        await player.seek((theAnnotation.timestamp - 0.7 > start) ? (theAnnotation.timestamp - 0.7) : start);
                        clearInterval(interval);
                        $('#toast').toast('show');
                        $videoNav('#progress').css('width', ((theAnnotation.timestamp - start) / totaltime) * 100 + '%');
                    }
                }
            });

            // Handle the refresh button:: allowing user to refresh the content
            $(document).on('click', '#refresh', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const id = $(this).data('id');
                const annotation = releventAnnotations.find(x => x.id == id);
                $(this).closest('#message').find("#content").empty();
                runInteraction(annotation, true);
            });

            // Handle video control events:: fullscreen toggle
            $(document).on('click', '#fullscreen', function(e) {
                e.preventDefault();
                if (!playerReady) {
                    return;
                }
                // Put the wrapper in fullscreen mode
                const elem = document.getElementById('wrapper');
                $('#fullscreen').toggleClass('active');
                if (!$('#wrapper').hasClass('fullscreen')) {
                    if (elem.requestFullscreen) {
                        elem.requestFullscreen();
                    } else if (elem.mozRequestFullScreen) { /* Firefox */
                        elem.mozRequestFullScreen();
                    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                        elem.webkitRequestFullscreen();
                    } else if (elem.msRequestFullscreen) { /* IE/Edge */
                        elem.msRequestFullscreen();
                    }

                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.mozCancelFullScreen) { /* Firefox */
                        document.mozCancelFullScreen();
                    } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) { /* IE/Edge */
                        document.msExitFullscreen();
                    }
                }
            });

            $(document).on('fullscreenchange', function() {
                if (document.fullscreenElement) {
                    $('#wrapper, #interactivevideo-container').addClass('fullscreen');
                    $("#video-wrapper").css('padding-bottom', '0');
                } else {
                    $('#wrapper, #interactivevideo-container').removeClass('fullscreen');
                    player.ratio().then((ratio) => {
                        $("#video-wrapper").css('padding-bottom', (1 / ratio) * 100 + '%');
                    });
                }
                $('#wrapper #fullscreen i').toggleClass('bi-fullscreen bi-fullscreen-exit');
            });

            // Pause video when the tab is not visible.
            $(document).on('visibilitychange', function() {
                if (document.visibilityState == 'hidden') {
                    player.pause();
                }
            });

            // Handle share this moment event.
            $(document).on('click', '#controler #share', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const $this = $(this);
                $this.find('i').toggleClass('bi-share-fill bi-share');
                player.getCurrentTime().then((time) => {
                    const url = window.location.href;
                    const shareurl = url + (url.indexOf('?') > 0 ? '&' : '?') + 't=' + Math.round(time);
                    // Add shareurl to clipboard.
                    navigator.clipboard.writeText(shareurl).then(function() {
                        // Show the copied message.
                        // Change tooltip to copied.
                        $this.attr('data-original-title', M.util.get_string("copied", "mod_interactivevideo")).tooltip('show');
                        setTimeout(function() {
                            // Change tooltip back to share.
                            $this
                                .attr('data-original-title', M.util.get_string("sharethismoment", "mod_interactivevideo"))
                                .tooltip('hide');
                            $this.find('i').toggleClass('bi-share-fill bi-share');
                        }, 2000);
                    });
                });
            });

            // Display time when user hover on the progress bar.
            $(document).on('mousemove', '#video-nav #seek', function(e) {
                if (!playerReady) {
                    return;
                }
                e.preventDefault();
                e.stopImmediatePropagation();
                const percentage = e.offsetX / $(this).width();
                const time = Math.floor(percentage * totaltime);
                const formattedTime = convertSecondsToHMS(time);
                $('.tooltip').remove();
                $videoNav.find('#seek #tooltip').remove();
                // Create a dummy element on the ul and show the time as tooltip.
                $videoNav.find('#seek').append(`<div id="tooltip" class="position-absolute bg-transparent text-white"
                     data-original-title="${formattedTime}" style="left: calc(${percentage * 100}%); width: 3px;"></div>`);
                $('#tooltip').tooltip({
                    container: '#wrapper',
                    boundary: 'window',
                }).tooltip('show');
            });

            $(document).on('mouseleave', '#video-nav #seek', function() {
                if (!playerReady) {
                    return;
                }
                $videoNav.find('#seek #tooltip').tooltip('hide');
                $('.tooltip').remove();
            });

            // Handle annotation click event:: when user click on the annotation on the progress bar
            $(document).on('click', '#video-nav .annotation', async function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if ($(this).hasClass('no-click')) {
                    // Add a tooltip that seeking is disabled.
                    Toast.add(M.util.get_string('youcannotviewthisannotationyet', 'mod_interactivevideo'), {
                        type: 'danger'
                    });
                    return;
                }
                const timestamp = $(this).data('timestamp');
                player.play();
                if (player.type == 'yt') {
                    clearInterval(interval);
                }
                await player.seek(Number(timestamp));
                replaceProgressBars(((timestamp - start) / totaltime) * 100);
                const id = $(this).data('id');
                const theAnnotation = releventAnnotations.find(x => x.id == id);
                runInteraction(theAnnotation);
                lastanno = theAnnotation;
            });

            // Handle seeking event:: when user click on the progress bar
            $(document).on('click', '#video-nav', async function(e) {
                if (!playerReady) {
                    return;
                }
                e.preventDefault();
                e.stopImmediatePropagation();
                if ($(this).hasClass('no-click')) {
                    // Add a tooltip that seeking is disabled.
                    Toast.add(M.util.get_string('seekingdisabled', 'mod_interactivevideo'), {
                        type: 'danger'
                    });
                    return;
                }
                lastanno = null;
                $('#start-screen').fadeOut(300);
                $('#end-screen').fadeOut(300);
                var percentage = e.offsetX / $(this).width();
                // Gotta check if this affects anything.
                if (player.type == 'yt') {
                    clearInterval(interval);
                }
                player.pause(); // Especially for vimeo.
                await player.seek((percentage * totaltime) + start);
                replaceProgressBars(percentage * 100);
                player.play();

            });

            // Handle video control events:: play
            $(document).on('click', '#start-screen #play', async function(e) {
                e.preventDefault();
                $('#start-screen').fadeOut(300);
                $(this).addClass('d-none');
                $videoNav.removeClass('d-none');
                if ($('body').hasClass('mobiletheme')) {
                    $("#fullscreen").trigger('click');
                }
                await player.seek(start);
                player.play();
            });

            // Handle video control events:: restart
            $(document).on('click', '#end-screen #restart', async function(e) {
                e.preventDefault();
                $('#message').remove();
                lastanno = null;
                await player.seek(start);
                $videoNav.find("#progress").css('width', '0%');
                $('#end-screen').fadeOut(300);
                $(this).addClass('d-none');
                $videoNav.removeClass('d-none');
                replaceProgressBars(0);
                player.play();
            });

            // Handle video control events:: pause/resume when user click on the video
            $(document).on('click', '#video-wrapper .video-block', async function(e) {
                if (!playerReady) {
                    return;
                }
                clearInterval(interval);
                e.preventDefault();
                // Pause or resume the video.
                player.isPlaying().then(async(playing) => {
                    if (playing) {
                        player.pause();
                    } else {
                        player.play();
                    }
                });
            });

            $(document).on('click', '#playpause', function(e) {
                if (!playerReady) {
                    return;
                }
                e.preventDefault();
                $(this).tooltip('hide');
                // Pause or resume the video.
                player.isPlaying().then(async(playing) => {
                    if (playing) {
                        player.pause();
                    } else {
                        let t = await player.getCurrentTime();
                        if (t >= end) {
                            $('#end-screen #restart').trigger('click');
                        } else {
                            player.play();
                        }
                    }
                });
            });

            $(document).on('click', 'li.anno', async function(e) {
                e.preventDefault();
                const id = $(this).data('id');
                $(`li.annotation[data-id=${id}]`).trigger('click');
                if ($(this).closest('#chapter-container-left').length > 0) {
                    $('#chaptertoggle button').trigger('click');
                }
            });

            $(document).on('click', '#mute', function(e) {
                e.preventDefault();
                $(this).tooltip('hide');
                $(this).toggleClass('active');
                if ($(this).hasClass('active')) {
                    player.mute();
                    $(this).attr('data-original-title', M.util.get_string('unmute', 'mod_interactivevideo'));
                } else {
                    player.unMute();
                    $(this).attr('data-original-title', M.util.get_string('mute', 'mod_interactivevideo'));
                }
                $(this).find('i').toggleClass('bi-volume-mute bi-volume-up');
                $(this).tooltip('show');
            });

            $(document).on('interactionrun', function(e) {
                window.console.log(e);
            });

            $(document).on('interactionclose', function(e) {
                window.console.log(e);
            });

            $(document).on('interactionCompletionUpdated', function(e) {
                window.console.log(e);
            });

            $(document).on('iv:playerReady', function() {
                onReady();
            });

            $(document).on('iv:playerPaused', function() {
                onPaused();
            });

            $(document).on('iv:playerPlaying', function() {
                onPlaying();
            });

            $(document).on('iv:playerEnded', function() {
                onEnded();
            });

            $(document).on('iv:playerError', function() {
                Toast.add(M.util.get_string('thereisanissueloadingvideo', 'mod_interactivevideo'), {
                    type: 'danger'
                });
                $('#spinner').remove();
            });

        }
    };
});