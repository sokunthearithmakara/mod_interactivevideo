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
 * Handle report page
 *
 * @module     mod_interactivevideo/report
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Notification from 'core/notification';
import {add as addToast} from 'core/toast';
import JSZip from 'mod_interactivevideo/libraries/jszip';
import 'mod_interactivevideo/libraries/jquery.dataTables';
import 'mod_interactivevideo/libraries/dataTables.bootstrap4';
import 'mod_interactivevideo/libraries/dataTables.buttons';
import 'mod_interactivevideo/libraries/buttons.bootstrap4';
import 'mod_interactivevideo/libraries/buttons.html5';

/**
 * Initializes the report functionality for the interactive video module.
 *
 * @param {number} cmid - The course module ID.
 * @param {number} groupid - The group ID.
 */
const init = (cmid, groupid) => {
    window.JSZip = JSZip;

    const getContentTypes = $.ajax({
        url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
        method: "POST",
        dataType: "text",
        data: {
            action: 'getallcontenttypes',
            sesskey: M.cfg.sesskey,
        }
    });

    const getReportData = $.ajax({
        url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
        method: 'POST',
        data: {
            action: 'getreportdatabygroup',
            cmid: cmid,
            sesskey: M.cfg.sesskey,
            cxtid: M.cfg.courseContextId,
            groupid: groupid
        }
    });

    let itemsdata = $('#itemsdata').text();
    itemsdata = JSON.parse(itemsdata);

    let contentTypes;
    let tabledata;
    $.when(getContentTypes, getReportData).done((ct, data) => {
        contentTypes = JSON.parse(ct[0]);
        data = data[0];
        /**
         * Configuration options for initializing a DataTable.
         *
         * @type {Object}
         * @property {Array} data - The data to be displayed in the table.
         * @property {boolean} deferRender - If true, the table will defer rendering of rows until they are needed.
         * @property {string} rowId - The property to use as the unique identifier for each row.
         * @property {number} pageLength - The number of rows to display per page.
         * @property {Array} order - The initial sorting order of the table.
         * @property {Array} columns - Configuration for each column in the table.
         * @property {Object} language - Customization of the language strings used by the DataTable.
         * @property {Function} stateSaveParams - Function to modify the state saving parameters.
         * @property {boolean} stateSave - If true, the table state will be saved in local storage.
         * @property {string} dom - The layout of the table controls.
         * @property {Array} buttons - Configuration for the export buttons.
         * @property {Function} initComplete - Function to execute when the table initialization is complete.
         */
        var datatableOptions = {
            "data": data,
            "deferRender": true,
            "rowId": "id",
            "pageLength": 25,
            "order": [[1, "asc"]],
            "columns": [
                {
                    data: "id",
                    visible: false
                },
                {
                    data: "picture",
                    render: function(data, type, row) {
                        let deletebutton = `<button title="${M.util.get_string('reset', 'mod_interactivevideo')}"
                         class="btn btn-sm text-danger reset m-1" data-record="${row.completionid}" data-userid="${row.id}">
                         <i class="bi bi-trash3"></i></button>`;
                        return `<div class="text-truncate d-flex align-items-center justify-content-between">${data}
                        ${row.completionpercentage > 0 ? deletebutton : ''}</div>`;
                    },
                    className: "bg-white sticky-left-0",
                },
                {
                    data: "firstname",
                    className: "exportable"
                },
                {
                    data: "lastname",
                    className: "exportable"
                },
                {
                    data: "email",
                    className: "exportable"
                },
                {
                    data: "timecreated",
                    "render": function(data, type) {
                        if (!data || data == 0) {
                            if (type === 'display') {
                                return M.util.get_string('notstarted', 'mod_interactivevideo');
                            } else {
                                return 0;
                            }
                        } else {
                            var date = new Date(data * 1000);
                            if (type === 'display') {
                                return date.toLocaleString();
                            } else if (type === 'filter' || type === 'sort') {
                                return date.getTime();
                            }
                            return data;
                        }
                    },
                    className: "exportable"
                },
                {
                    data: "timecompleted",
                    render: function(data, type, row) {
                        if (!data || data == 0) {
                            if (!row.timecreated) {
                                return '';
                            } else {
                                if (type === 'display') {
                                    return M.util.get_string('inprogress', 'mod_interactivevideo');
                                } else {
                                    return 0;
                                }
                            }
                        } else {
                            var date = new Date(data * 1000);
                            if (type === 'display') {
                                return date.toLocaleString();
                            } else if (type === 'filter' || type === 'sort') {
                                return date.getTime();
                            }
                            return data;
                        }
                    },
                    className: "exportable"
                },
                {
                    data: "completionpercentage",
                    render: function(data) {
                        if (data) {
                            return data + "%";
                        } else {
                            return "";
                        }
                    },
                    className: "exportable"
                },
                {
                    data: "xp",
                    render: function(data) {
                        if (data) {
                            return data;
                        } else {
                            return "";
                        }
                    },
                    className: "exportable"
                }
            ],
            "language": {
                "lengthMenu": "_MENU_",
                "zeroRecords": M.util.get_string('nofound', "mod_interactivevideo"),
                "search": `<span class="d-none d-md-inline">${M.util.get_string('search', "mod_interactivevideo")}</span>`,
                "info": M.util.get_string('datatableinfo', "mod_interactivevideo"),
                "infoEmpty": M.util.get_string('datatableinfoempty', "mod_interactivevideo"),
                "infoFiltered": M.util.get_string('datatableinfofiltered', "mod_interactivevideo"),
                "paginate": {
                    "first": M.util.get_string('first', 'mod_interactivevideo'),
                    "last": M.util.get_string('last', 'mod_interactivevideo'),
                    "next": M.util.get_string('next', 'mod_interactivevideo'),
                    "previous": M.util.get_string('previous', 'mod_interactivevideo')
                }
            },
            stateSaveParams: function(settings, data) {
                // We only want to save the state of the colvis and length menu
                data.search.search = "";
                data.start = 0;
                data.columns.forEach(function(column) {
                    column.search.search = "";
                });
                return data;
            },
            stateSave: true,
            "dom": `<'d-flex w-100 justify-content-between`
                + `'<'d-flex align-items-start'Bl>'<''f>>t<'row mt-2'<'col-sm-6'i><'col-sm-6'p>>`,
            "buttons": [
                {
                    extend: "copyHtml5",
                    text: '<i class="bi bi-copy fa-fw fs-unset"></i>',
                    className: "btn btn-sm",
                    messageTop: null,
                    title: null,
                    exportOptions: {
                        columns: ['.exportable'],
                        format: {
                            body: function(data) {
                                // Strip HTML tags to get text only
                                const div = document.createElement("div");
                                div.innerHTML = data;
                                return (div.textContent || div.innerText || "").trim();
                            }
                        }
                    }
                },
                {
                    extend: "csvHtml5",
                    text: '<i class="bi bi-filetype-csv fa-fw fs-unset"></i>',
                    className: "btn btn-sm",
                    exportOptions: {
                        columns: ['.exportable'],
                        format: {
                            body: function(data) {
                                // Strip HTML tags to get text only
                                const div = document.createElement("div");
                                div.innerHTML = data;
                                return (div.textContent || div.innerText || "").trim();
                            }
                        }
                    }
                },
                {
                    extend: "excelHtml5",
                    text: '<i class="bi bi-file-earmark-excel fa-fw fs-unset"></i>',
                    className: "btn btn-sm",
                    exportOptions: {
                        columns: ['.exportable'],
                        format: {
                            body: function(data) {
                                // Strip HTML tags to get text only
                                const div = document.createElement("div");
                                div.innerHTML = data;
                                return (div.textContent || div.innerText || "").trim();
                            }
                        }
                    }
                }
            ],
            "initComplete": function() {
                $("table#completiontable")
                    .wrap("<div style='overflow:auto;position:relative' class='completiontablewrapper'></div>");
                $("#reporttable .dataTables_length ").addClass("d-inline ml-1");
                $("#reporttable .dataTables_filter").addClass("d-inline float-right");
                $("#reporttable .table-responsive").addClass("p-1");
                $("#reporttable .spinner-grow").remove();
                $("table#completiontable").removeClass("d-none");

            }
        };

        $("#reporttable th.rotate").each(function() {
            const itemid = $(this).data("item").toString();
            const ctype = $(this).data("type");
            datatableOptions.columns.push({
                data: null,
                sortable: false,
                className: "text-center exportable",
                render: function(data, rtype, row) {
                    if (!data.completeditems) {
                        return `<i class="fa fa-times"></i>`;
                    }
                    let completeditems = JSON.parse(data.completeditems);
                    let completiondetails;
                    try {
                        completiondetails = JSON.parse(data.completiondetails).map(x => JSON.parse(x));
                    } catch (e) {
                        completiondetails = [];
                    }
                    if (completeditems) {
                        if (completeditems.indexOf(itemid) > -1) {
                            let details = completiondetails.find(x => Number(x.id) == Number(itemid));
                            if (details) {
                                return `<span class="completion-detail ${details.hasDetails ? 'cursor-pointer' : ''}"
                                 data-id="${itemid}" data-userid="${row.id}" data-type="${ctype}">${details.reportView}</span>`;
                            } else {
                                return '';
                            }
                        } else {
                            return '<i class="fa fa-times"></i><span class="d-none">-</span>';
                        }
                    } else {
                        return '<i class="fa fa-times"></i><span class="d-none">-</span>';
                    }
                },
            });
        });

        tabledata = $('#completiontable').DataTable(datatableOptions);
        window.console.log(tabledata.data().toArray());
    });

    $(document).on('click', '[data-item] a', function() {
        const convertSecondsToHMS = (seconds) => {
            var h = Math.floor(seconds / 3600);
            var m = Math.floor(seconds % 3600 / 60);
            var s = Math.floor(seconds % 3600 % 60);
            return (h > 0 ? h + ':' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        };
        let annotationid = $(this).closest('th').data('item');
        let theAnnotation = itemsdata.find(x => x.id == annotationid);
        let tabledatajson = tabledata.rows().data().toArray();
        var modal = `<div class="modal fade" id="annotation-modal" role="dialog"
            aria-labelledby="annotation-modal"
         aria-hidden="true" data-backdrop="static" data-keyboard="false">
         <div id="message" data-id="${theAnnotation.id}" data-placement="popup"
          class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
            <div class="modal-content rounded-lg">
                <div class="modal-header d-flex align-items-center shadow-sm" id="title">
                    <h5 class="modal-title text-truncate mb-0">${theAnnotation.formattedtitle
            + " @ " + convertSecondsToHMS(theAnnotation.timestamp)}</h5>
                    <div class="btns d-flex align-items-center">
                        <button class="btn close-modal p-0" aria-label="Close" data-dismiss="modal">
                        <i class="bi bi-x-lg fa-fw fs-25px"></i>
                        </button>
                    </div>
                </div>
                <div class="modal-body" id="content">
                <div class="loader w-100 mt-5"></div>
                </div>
                </div>
            </div>
            </div>`;
        $('body').append(modal);
        $('#annotation-modal').modal('show');
        $('#annotation-modal').on('hide.bs.modal', function() {
            $('#annotation-modal').remove();
        });

        $('#annotation-modal').on('shown.bs.modal', function() {
            $('#annotation-modal .modal-body').fadeIn(300);
            let matchingContentTypes = contentTypes.find(x => x.name === theAnnotation.type);
            let amdmodule = matchingContentTypes.amdmodule;
            require([amdmodule + ''], function(Module) {
                theAnnotation.completed = true;
                new Module().displayReportView(theAnnotation, tabledatajson);
            });
            $(this).find('.close-modal').focus();
        });
    });

    $(document).on('click', 'td .reset', function(e) {
        e.preventDefault();
        const recordid = $(this).data('record');
        let $this = $(this);
        Notification.deleteCancel(
            M.util.get_string('deletecompletion', 'mod_interactivevideo'),
            M.util.get_string('areyousureyouwanttoresetthecompletiondata', 'mod_interactivevideo'),
            M.util.get_string('delete', 'mod_interactivevideo'),
            function() {
                $.ajax({
                    url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                    method: 'POST',
                    dataType: "text",
                    data: {
                        action: 'delete_progress_by_id',
                        recordid,
                        contextid: M.cfg.contextid,
                        sesskey: M.cfg.sesskey,
                    },
                    success: function(response) {
                        if (response == 'deleted') {
                            let targetdata = tabledata.row($this.closest('tr')).data();
                            targetdata.completionpercentage = 0;
                            targetdata.timecompleted = 0;
                            targetdata.xp = 0;
                            targetdata.timecreated = 0;
                            targetdata.completeditems = null;
                            targetdata.completiondetails = null;
                            targetdata.completionid = null;
                            tabledata.row($this.closest('tr')).data(targetdata).draw();
                            addToast(M.util.get_string('completionresetsuccess', 'mod_interactivevideo'), {
                                type: 'success'
                            });
                        }
                    },
                    error: function() {
                        addToast(M.util.get_string('completionreseterror', 'mod_interactivevideo'), {
                            type: 'error'
                        });
                    }
                });
            },
            null
        );
    });

    $(document).on('click', 'td .completion-detail', function() {
        let id = $(this).data('id');
        let userid = $(this).data('userid');
        let type = $(this).data('type');
        let matchingContentTypes = contentTypes.find(x => x.name === type);
        let amdmodule = matchingContentTypes.amdmodule;
        // Get column header with the item id.
        let theAnnotation = itemsdata.find(x => x.id == id);
        require([amdmodule + ''], function(Module) {
            new Module().getCompletionData(theAnnotation, userid);
        });
    });
};


/**
 * Renders annotation logs in a DataTable with specified options.
 *
 * @param {Object} data - The data to be displayed in the table.
 * @param {Array} data.rows - The rows of data to be displayed.
 * @param {string} node - The DOM node selector where the table will be rendered.
 * @param {string} title - The title used for export options.
 */
const renderAnnotationLogs = (data, node, title) => {
    let tableOptions = {
        "data": data.rows,
        "deferRender": true,
        "pageLength": 25,
        "order": [[0, "asc"]],
        "columnDefs": [
            {
                "targets": 'not-sortable',
                "sortable": false,
            },
        ],
        "language": {
            "lengthMenu": "_MENU_",
            "zeroRecords": M.util.get_string('nofound', "mod_interactivevideo"),
            "search": M.util.get_string('search', "mod_interactivevideo"),
            "info": M.util.get_string('datatableinfo', "mod_interactivevideo"),
            "infoEmpty": M.util.get_string('datatableinfoempty', "mod_interactivevideo"),
            "infoFiltered": M.util.get_string('datatableinfofiltered', "mod_interactivevideo"),
            "paginate": {
                "first": M.util.get_string('first', 'mod_interactivevideo'),
                "last": M.util.get_string('last', 'mod_interactivevideo'),
                "next": M.util.get_string('next', 'mod_interactivevideo'),
                "previous": M.util.get_string('previous', 'mod_interactivevideo')
            }
        },
        stateSaveParams: function(settings, data) {
            // We only want to save the state of the colvis and length menu
            data.search.search = "";
            data.start = 0;
            data.columns.forEach(function(column) {
                column.search.search = "";
            });
            return data;
        },
        stateSave: true,
        "dom": `Blft<'row'<'col-sm-6'i><'col-sm-6'p>>`,
        "buttons": [
            {
                extend: "copyHtml5",
                text: '<i class="bi bi-copy fa-fw fs-unset"></i>',
                className: "btn btn-sm",
                messageTop: null,
                title: null,
                exportOptions: {
                    columns: ['.exportable']
                }
            },
            {
                extend: "csvHtml5",
                text: '<i class="bi bi-filetype-csv fa-fw fs-unset"></i>',
                title: title,
                className: "btn btn-sm",
                exportOptions: {
                    columns: ['.exportable']
                }
            },
            {
                extend: "excelHtml5",
                text: '<i class="bi bi-file-earmark-excel fa-fw fs-unset"></i>',
                className: "btn btn-sm",
                title: title,
                exportOptions: {
                    columns: ['.exportable']
                }
            }
        ],
        "initComplete": function() {
            $(`${node} table`)
                .wrap("<div style='overflow:auto;position:relative' class='completiontablewrapper'></div>");
            $(`${node} .dataTables_length`).addClass("d-inline ml-1");
            $(`${node} .dataTables_filter`).addClass("d-inline float-right");
            $(`${node} .table-responsive`).addClass("p-1");
        }
    };

    $(`${node} table`).DataTable(tableOptions);
};

export {
    init,
    renderAnnotationLogs
};