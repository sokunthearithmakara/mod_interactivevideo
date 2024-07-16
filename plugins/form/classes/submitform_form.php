<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Dynamic form for adding/editing interactions content
 *
 * @package     ivplugin_form
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace ivplugin_form;

use context;
use MoodleQuickForm;

/**
 * Form class for adding/editing submission form
 * @package ivplugin_form
 * @copyright 2024 Sokunthearith Makara
 * @license https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class submitform_form extends \core_form\dynamic_form {
    /**
     * Returns form context
     *
     * If context depends on the form data, it is available in $this->_ajaxformdata or
     * by calling $this->optional_param()
     *
     * @return \context
     */
    protected function get_context_for_dynamic_submission(): \context {
        $contextid = $this->optional_param('contextid', null, PARAM_INT);
        return \context::instance_by_id($contextid, MUST_EXIST);
    }

    /**
     * Set data for dynamic submission
     *
     * @return void
     */
    public function set_data_for_dynamic_submission(): void {
        global $CFG, $USER;
        $data = new \stdClass();
        $data->id = $this->optional_param('id', 0, PARAM_INT);
        $data->contextid = $this->optional_param('contextid', null, PARAM_INT);
        $data->annotationid = $this->optional_param('annotationid', null, PARAM_INT);
        $data->type = $this->optional_param('type', null, PARAM_TEXT);
        $data->courseid = $this->optional_param('courseid', null, PARAM_INT);
        $data->formjson = $this->optional_param('formjson', null, PARAM_RAW);
        $data->submissionid = $this->optional_param('submissionid', null, PARAM_INT);
        $data->editing = $this->optional_param('editing', false, PARAM_BOOL);
        $data->reviewing = $this->optional_param('reviewing', 0, PARAM_INT);
        // Handle filemanager fields.
        if ($data->submissionid > 0 && !$data->editing && !$data->reviewing) {
            $formjson = json_decode($data->formjson);
            $filemanagerfields = array_filter($formjson, function ($field) {
                return $field->type == 'filemanager';
            });

            if (count($filemanagerfields) > 0) {
                require_once($CFG->libdir . '/filelib.php');
                $fs = get_file_storage();
                $files = $fs->get_area_files(
                    $this->get_context_for_dynamic_submission()->id,
                    'mod_interactivevideo',
                    'text1',
                    $data->submissionid,
                );

                foreach ($filemanagerfields as $field) {
                    $fieldid = 'field-' . $field->id;
                    $newdraftitemid = file_get_unused_draft_itemid();
                    foreach ($files as $file) {
                        if ($file->get_filename() == '.') {
                            continue;
                        }
                        // If filename contains the fieldid, then it is the file for this field.
                        if (strpos($file->get_filename(), $fieldid) !== false) {
                            // Put the file in the dratitemid (also remove fieldid prefix from the name).
                            $filerecord = [
                                'contextid' => \context_user::instance($USER->id)->id,
                                'component' => 'user',
                                'filearea'  => 'draft',
                                'itemid'    => $newdraftitemid, // Use the new draft item ID.
                                'filepath'  => $file->get_filepath(),
                                'filename'  => str_replace($fieldid . '_', '', $file->get_filename()),
                            ];

                            // Copy the file to the new draft item ID.
                            if (!$fs->file_exists(
                                $filerecord['contextid'],
                                $filerecord['component'],
                                $filerecord['filearea'],
                                $filerecord['itemid'],
                                $filerecord['filepath'],
                                $filerecord['filename']
                            )) {
                                $fs->create_file_from_storedfile($filerecord, $file);
                            }
                        }
                    }
                    $data->$fieldid = $newdraftitemid;
                }
            }

            // Prepare the data for the editor fields.
            $editorfields = array_filter($formjson, function ($field) {
                return $field->type == 'editor';
            });

            if (count($editorfields) > 0) {
                foreach ($editorfields as $field) {
                    $fieldid = 'field-' . $field->id;
                    $text = $field->default->text;
                    // Rewrite the URLs in the text.
                    $text = file_rewrite_pluginfile_urls(
                        $text,
                        'pluginfile.php',
                        $this->get_context_for_dynamic_submission()->id,
                        'mod_interactivevideo',
                        'text1',
                        $data->submissionid,
                        [
                            'reverse' => true,
                        ]
                    );

                    // Prepare the draft file area.
                    $draftitemid = file_get_submitted_draft_itemid($fieldid);
                    $text = file_prepare_draft_area(
                        $draftitemid,
                        $this->get_context_for_dynamic_submission()->id,
                        'mod_interactivevideo',
                        'text1',
                        $data->submissionid,
                        [
                            'maxfiles' => -1,
                            'maxbytes' => 0,
                            'trusttext' => true,
                            'noclean' => true,
                            'context' => $this->get_context_for_dynamic_submission(),
                        ],
                        $text
                    );

                    $data->{$fieldid}['text'] = str_replace('brokenfile.php#', 'pluginfile.php', $text);
                }
            }
        }

        $this->set_data($data);
    }

    /**
     * Check access for dynamic submission
     *
     * @return mixed
     */
    protected function check_access_for_dynamic_submission(): void {
        require_capability('mod/interactivevideo:view', $this->get_context_for_dynamic_submission());
    }

    /**
     * Form element definition
     *
     * @return void
     */
    public function definition() {
        $this->render_duration_element();
        $mform = &$this->_form;

        $isedit = $this->optional_param('editing', 0, PARAM_INT);
        $isreviewing = $this->optional_param('reviewing', 0, PARAM_INT);

        $attributes = $mform->getAttributes();
        $attributes['data-name'] = 'submitform-form';
        $attributes['class'] = $attributes['class'] . ' bg-white' . ($isreviewing ? ' reviewing' : '');

        $mform->setAttributes($attributes);
        $mform->addElement('hidden', 'contextid', null);
        $mform->setType('contextid', PARAM_INT);

        $mform->addElement('hidden', 'submissionid', null);
        $mform->setType('submissionid', PARAM_INT);

        $mform->addElement('hidden', 'type', null);
        $mform->setType('type', PARAM_TEXT);

        $mform->addElement('hidden', 'id', null);
        $mform->setType('id', PARAM_INT);

        $mform->addElement('hidden', 'courseid', null);
        $mform->setType('courseid', PARAM_INT);

        $mform->addElement('hidden', 'annotationid', null);
        $mform->setType('annotationid', PARAM_INT);

        $formjson = $this->optional_param('formjson', null, PARAM_RAW);
        $mform->addElement('hidden', 'formjson', $formjson);

        $fields = json_decode($formjson);

        $mform->addElement('hidden', 'editing', $isedit);
        $mform->setType('editing', PARAM_INT);
        $mform->addElement('hidden', 'reviewing', $isreviewing);
        $mform->setType('reviewing', PARAM_INT);

        foreach ($fields as $field) {
            $field->fieldid = 'field-' . $field->id;
            $fieldactions = '<div class="px-2 py-1 bg-white field-actions ">
            <i class="bi bi-pencil-square cursor-pointer mr-3" id="edit" data-id="' . $field->id . '" title="'
                . get_string('edit', 'mod_interactivevideo') . '"></i>
            <i class="bi bi-copy cursor-pointer mr-3" id="copy" data-id="' . $field->id . '" title="'
                . get_string('clone', 'mod_interactivevideo') . '"></i>
            <i class="bi bi-trash3 cursor-pointer text-danger" id="delete" data-id="' . $field->id . '" title="'
                . get_string('delete', 'mod_interactivevideo') . '"></i></div>';
            $label = '<div class="d-flex flex-column">';
            if ($isedit) {
                $label .= $fieldactions;
            }
            $label .= '<div class="font-weight-bold field-label">' . $field->label . '</div><div class="small text-muted d-block">'
                . str_replace('brokenfile.php#', 'draftfile.php', format_text(
                    $field->helptext->text,
                    FORMAT_HTML,
                    [
                        'context' => $this->get_context_for_dynamic_submission(),
                    ]
                ));
            if ($field->minfiles && $field->minfiles > 0) {
                $label .= '<span class="mr-3">' . get_string('minlength', 'ivplugin_form') . ': '
                    . $field->minfiles . '</span>';
            }
            if ($field->maxfiles && $field->maxfiles > 0) {
                $label .= '<span class="mr-3">' . get_string('maxlength', 'ivplugin_form') . ': '
                    . $field->maxfiles . '</span>';
            }
            if ($field->filemaxsize) {
                $label .= '<span class="mr-3">' . get_string('maxsizeshort', 'ivplugin_form') . ': '
                    . display_size($field->filemaxsize) . '</span>';
            }
            $label .= '</div></div>';
            if ($field->minlength) {
                $label .= '<span class="small text-muted mr-3">' . get_string('minlength', 'ivplugin_form') . ': '
                    .  $field->minlength . '</span>';
            }
            if ($field->maxlength) {
                $label .= '<span class="small text-muted mr-3">' . get_string('maxlength', 'ivplugin_form') . ': '
                    .  $field->maxlength . '</span>';
            }

            switch ($field->type) {
                case 'header':
                    $label = $field->label;
                    if ($isedit) {
                        $label .= $fieldactions;
                    }
                    $mform->addElement('header', $field->fieldid, $label);

                    $mform->setExpanded($field->fieldid, $isreviewing ? true : $field->expanded);
                    if ($field->helptext->text) {
                        $mform->addElement('html', '<div class="small text-muted">' . str_replace(
                            'brokenfile.php#',
                            'draftfile.php',
                            format_text($field->helptext->text, FORMAT_HTML, [
                                'context' => $this->get_context_for_dynamic_submission(),
                            ])
                        ) . '</div>');
                    }
                    $mform->closeHeaderBefore('field-' . $field->closeat);
                    break;
                case 'text':
                    $mform->addElement('text', $field->fieldid, $label, [
                        'size' => 100, 'placeholder' => $field->placeholder, 'id' => $field->fieldid,
                    ]);
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $field->default);
                    if ($field->minlength) {
                        $mform->addRule(
                            $field->fieldid,
                            get_string('minlength', 'ivplugin_form'),
                            'minlength',
                            $field->minlength,
                            'client'
                        );
                    }
                    if ($field->maxlength) {
                        $mform->addRule(
                            $field->fieldid,
                            get_string('maxlength', 'ivplugin_form'),
                            'maxlength',
                            $field->maxlength,
                            'client'
                        );
                    }
                    if ($field->regex) {
                        // If regex does not start and end with /, add it.
                        if (substr($field->regex, 0, 1) !== '/' && substr($field->regex, -1) !== '/') {
                            $field->regex = '/' . $field->regex . '/';
                        }
                        $mform->addRule($field->fieldid, format_string($field->regexerror), 'regex', $field->regex, 'client');
                    }
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'html':
                    $html = '<div id="' . $field->fieldid . '" class="fitem ';
                    if ($isedit) {
                        $html .= ' row form-group"><div class="position-relative w-100">' . $fieldactions . '</div>';
                    } else {
                        $html .= '">';
                    }
                    $html .= str_replace('brokenfile.php#', 'draftfile.php', format_text($field->content->text, FORMAT_HTML, [
                        'context' => $this->get_context_for_dynamic_submission(),
                    ])) . '</div>';
                    $mform->addElement('html', $html);
                    break;
                case 'textarea':
                    $mform->addElement('textarea', $field->fieldid, $label, [
                        'rows' => 5, 'cols' => 100, 'placeholder' => $field->placeholder, 'id' => $field->fieldid,
                        'oninput' => 'this.style.height = "";this.style.height = this.scrollHeight + 3 + "px"',
                    ]);
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $field->default);
                    if ($field->minlength) {
                        $mform->addRule(
                            $field->fieldid,
                            get_string('minlength', 'ivplugin_form'),
                            'minlength',
                            $field->minlength,
                            'client'
                        );
                    }
                    if ($field->maxlength) {
                        $mform->addRule(
                            $field->fieldid,
                            get_string('maxlength', 'ivplugin_form'),
                            'maxlength',
                            $field->maxlength,
                            'client'
                        );
                    }
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'editor':
                    if ($isreviewing) {
                        $html = '<div id="' . $field->fieldid . '" class="fitem row form-group d-block flex-column">'
                            . $label . '<div>' . format_text($field->default->text, FORMAT_HTML, [
                                'context' => $this->get_context_for_dynamic_submission(),
                            ]);

                        $html .= '</div></div>';
                        $mform->addElement('html', $html);
                    } else {
                        $mform->addElement(
                            'editor',
                            $field->fieldid,
                            $label,
                            ['rows' => 8, 'id' => $field->fieldid],
                            $this->editor_options()
                        );
                        $mform->setType($field->fieldid, PARAM_RAW);
                        $mform->setDefault($field->fieldid, $field->default);
                        if ($field->minlength) {
                            $mform->addRule(
                                $field->fieldid,
                                get_string('minlength', 'ivplugin_form'),
                                'minlength',
                                $field->minlength,
                                'client'
                            );
                        }
                        if ($field->maxlength) {
                            $mform->addRule(
                                $field->fieldid,
                                get_string('maxlength', 'ivplugin_form'),
                                'maxlength',
                                $field->maxlength,
                                'client'
                            );
                        }
                    }
                    $mform->hideIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'select':
                    // Options are separated by new line and in each line, the key and value are separated by '='.
                    $options = explode("\n", $field->options);

                    if ($field->multiple || $field->useautocomplete) {
                        $optionsarray = []; // Initialize an empty array.
                    } else {
                        $optionsarray[''] = get_string('choose') . '...';
                    }
                    foreach ($options as $option) {
                        list($key, $value) = explode('=', $option, 2); // Split the option into key and value.
                        $key = trim($key);
                        $value = trim($value);
                        if (empty($key) || empty($value)) {
                            continue; // Skip if either key or value is empty.
                        }
                        $optionsarray[$key] = format_string($value); // Use the key as the array key.
                    }
                    // Make sure the options are unique.
                    $optionsarray = array_unique($optionsarray);
                    $attributes = ['id' => $field->fieldid];
                    if ($field->multiple) {
                        $attributes['multiple'] = true;
                    }
                    if ($field->useautocomplete && !$isreviewing) {
                        $mform->addElement('autocomplete', $field->fieldid, $label, $optionsarray, $attributes);
                    } else {
                        $mform->addElement('select', $field->fieldid, $label, $optionsarray, $attributes);
                    }

                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->setDefault($field->fieldid, $field->default);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);

                    break;
                case 'advcheckbox':
                    $options = explode("\n", $field->options);
                    $optionsarray = []; // Initialize an empty array.
                    foreach ($options as $option) {
                        list($key, $value) = explode('=', $option, 2); // Split the option into key and value.
                        $key = trim($key);
                        $value = trim($value);
                        if (empty($key) || empty($value)) {
                            continue; // Skip if either key or value is empty.
                        }
                        $optionsarray[$key] = format_string($value); // Use the key as the array key.
                    }
                    // Make sure the options are unique.
                    $optionsarray = array_unique($optionsarray);
                    $advcheckboxgroups = [];
                    foreach ($optionsarray as $key => $value) {
                        $advcheckboxgroups[] = $mform->createElement(
                            'advcheckbox',
                            $key,
                            '',
                            $value,
                            ['group' => 1],
                            [0, $key]
                        );
                        $mform->setType($key, PARAM_TEXT);
                    }
                    $mform->addGroup($advcheckboxgroups, $field->fieldid, $label);
                    $defaults = $field->default;
                    foreach ($defaults as $key => $value) {
                        $mform->setDefault($field->fieldid . '[' . $key . ']', $value);
                    }

                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);

                    break;
                case 'radio':
                    $options = explode("\n", $field->options);
                    $optionsarray = [];
                    foreach ($options as $option) {
                        list($key, $value) = explode('=', $option, 2);
                        $key = trim($key);
                        $value = trim($value);
                        if (empty($key) || empty($value)) {
                            continue;
                        }
                        $optionsarray[$key] = format_string($value);
                    }
                    // Make sure the options are unique.
                    $optionsarray = array_unique($optionsarray);
                    $radiogroup = [];
                    foreach ($optionsarray as $key => $value) {
                        $radiogroup[] = $mform->createElement(
                            'radio',
                            $field->fieldid,
                            '',
                            format_string($value),
                            $key
                        );
                    }
                    $mform->addGroup($radiogroup, $field->fieldid, $label, '', false);
                    $mform->setDefault($field->fieldid, $field->default);
                    $mform->setType($field->fieldid, PARAM_TEXT);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);

                    break;
                case 'duration':
                    $attributes = ['id' => $field->fieldid];
                    $attributes['optional'] = true;

                    if ($field->units) {
                        $attributes['units'] = $field->units;
                    }

                    $mform->addElement('ivduration', $field->fieldid, $label, $attributes);

                    $default = [];
                    if ($field->default) {
                        $default['number'] = $field->default->number;
                        $default['timeunit'] = $field->default->timeunit;
                        $default['enabled'] = $field->default->enabled;
                    }
                    $mform->setDefault($field->fieldid, $default);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);
                    break;
                case 'date_selector':
                    $attributes = ['id' => $field->fieldid];
                    $attributes['optional'] = true;

                    if ($field->includetime) {
                        $mform->addElement('date_time_selector', $field->fieldid, $label, $attributes);
                    } else {
                        $mform->addElement('date_selector', $field->fieldid, $label, $attributes);
                    }

                    $default = [];
                    if ($field->default) {
                        $default['day'] = $field->default->day;
                        $default['month'] = $field->default->month;
                        $default['year'] = $field->default->year;
                        $default['hour'] = $field->default->hour;
                        $default['minute'] = $field->default->minute;
                        $default['enabled'] = $field->default->enabled;
                    }
                    $mform->setDefault($field->fieldid, $default);
                    $mform->disabledIf($field->fieldid, 'reviewing', 'eq', 1);

                    break;
                case 'filemanager':
                    if ($isreviewing) {
                        $html = '<div id="' . $field->fieldid . '" class="fitem row form-group d-block flex-column">'
                            . $label . '<div>' . format_text(
                                $field->content->text,
                                FORMAT_HTML,
                                [
                                    'context' => $this->get_context_for_dynamic_submission(),
                                ]
                            );
                        $files = $field->default;
                        if (!empty($files)) {
                            $html .= '<ul class="pl-3">';
                            foreach ($files as $file) {
                                $filename = explode('/', $file);
                                $filename = end($filename);
                                $filename = urldecode($filename);
                                // Remove the fieldid prefix from the filename.
                                $filename = str_replace($field->fieldid . '_', '', $filename);
                                $html .= '<li><i class="bi bi-file-earmark-arrow-down mr-2"></i><a target="_blank" href="' . $file . '">'
                                    . $filename . '</a></li>';
                            }
                            $html .= '</ul>';
                        }
                        $html .= '</div></div>';
                        $mform->addElement('html', $html);
                    } else {
                        $options = [
                            'subdirs' => 0,
                            'context' => $this->get_context_for_dynamic_submission(),
                            'accepted_types' => !empty($field->filetypes) ? explode(',', $field->filetypes) : '*',
                        ];
                        if ($field->maxfiles) {
                            $options['maxfiles'] = $field->maxfiles;
                        }
                        if ($field->filemaxsize) {
                            $options['maxbytes'] = $field->filemaxsize;
                        }
                        $mform->addElement('filemanager', $field->fieldid, $label, ['id' => $field->fieldid], $options);
                    }

                    break;
                case 'linebreak':
                    $mform->addElement('static', $field->fieldid, $label, '<hr>', ['id' => $field->fieldid]);
                    break;
            }
            if ($field->required && !$isreviewing) {
                $mform->addRule($field->fieldid, get_string('required'), 'required', null, 'client');
            }
        }

        $actionbuttons = '<div class="d-flex justify-content-end mt-3">';
        if (!$isedit && !$isreviewing) {
            if ($this->optional_param('submissionid', 0, PARAM_INT) > 0) {
                $actionbuttons .= '<button class="btn btn-primary mb-3 mr-2" id="submitform-submit">'
                    . get_string('savechanges') . '</button><button class="btn btn-secondary mb-3" id="cancel-submit">'
                    . get_string('cancel') . '</button>';
            } else {
                $actionbuttons .= '<button class="btn btn-primary mb-3" id="submitform-submit">' . get_string('submit')
                    . '</button>';
            }
        }
        $actionbuttons .= '</div>';

        $buttonarray = [];
        $buttonarray[] = &$mform->createElement('html', $actionbuttons);
        $mform->addGroup($buttonarray, 'buttonar', '', [], false);
        $mform->closeHeaderBefore('buttonar');

        $this->set_display_vertical();
    }

    /**
     * Process dynamic submission
     *
     * @return void
     */
    public function process_dynamic_submission() {
        global $CFG, $DB, $USER;
        require_once($CFG->libdir . '/filelib.php');
        $fs = get_file_storage();
        $data = $this->_ajaxformdata;
        // We have find the filemanager field and process it.
        $formjson = json_decode($data['formjson']);
        $usercontext = \context_user::instance($USER->id);
        unset($data['sesskey']); // We do not need to return sesskey.
        unset($data['_qf__' . $this->_formname]);   // We do not need the submission marker too.
        unset($data['formjson']);
        $data['userid'] = $USER->id;
        $data['timecreated'] = time();
        $data['timemodified'] = time();
        $data['cmid'] = (int)$data['annotationid'];
        $data['annotationid'] = (int)$data['id'];
        $submissionid = $data['submissionid'];
        if (!$submissionid) {
            $data['id'] = $DB->insert_record('annotation_log', $data);
        } else {
            $data['id'] = $submissionid;
        }

        $data['contextid'] = (int)$data['contextid'];
        $newdraftitemid = file_get_unused_draft_itemid();
        $filemanagerfields = array_filter($formjson, function ($field) {
            return $field->type == 'filemanager';
        });

        if (count($filemanagerfields) > 0) {
            foreach ($filemanagerfields as $field) {
                $fieldid = 'field-' . $field->id;
                $draftitemid = $data[$fieldid];
                $data[$fieldid] = [];

                $files = $fs->get_area_files(
                    $usercontext->id,
                    'user',
                    'draft',
                    $draftitemid,
                    'filesize DESC',
                );
                foreach ($files as $file) {
                    if ($file->get_filename() == '.') {
                        continue;
                    }
                    // Define the new file record for the copied file.
                    $filerecord = array(
                        'contextid' => $usercontext->id,
                        'component' => 'user',
                        'filearea'  => 'draft',
                        'itemid'    => $newdraftitemid, // Use the new draft item ID.
                        'filepath'  => $file->get_filepath(),
                        'filename'  => $fieldid . '_' . $file->get_filename(),
                    );

                    // Copy the file to the new draft item ID.
                    if (!$fs->file_exists(
                        $filerecord['contextid'],
                        $filerecord['component'],
                        $filerecord['filearea'],
                        $filerecord['itemid'],
                        $filerecord['filepath'],
                        $filerecord['filename']
                    )) {
                        $fs->create_file_from_storedfile($filerecord, $file);
                    }

                    $url = \moodle_url::make_draftfile_url(
                        $filerecord['itemid'],
                        $filerecord['filepath'],
                        $filerecord['filename']
                    )->out();

                    // Replace the base url with @@PLUGINFILE@@.
                    $url = str_replace($CFG->wwwroot . '/draftfile.php/' . $usercontext->id
                        . '/user/draft/' . $filerecord['itemid'], '@@PLUGINFILE@@', $url);

                    $data[$fieldid][] = $url;
                }
            }
        }

        $editorfields = array_filter($formjson, function ($field) {
            return $field->type == 'editor';
        });

        if (count($editorfields) > 0) {
            $usercontext = \context_user::instance($USER->id);
            foreach ($editorfields as $field) {
                $fieldid = 'field-' . $field->id;
                $draftitemid = $data[$fieldid]['itemid'];
                $text = $data[$fieldid]['text'];

                // Get urls from the text.
                $urls = extract_draft_file_urls_from_text($text);
                foreach ($urls as $url) {
                    $filename = explode('?time=', urldecode($url['filename']))[0];
                    file_copy_file_to_file_area($url, $filename, $newdraftitemid);
                    $oldurl = $url[0];
                    $text = str_replace($oldurl, '@@PLUGINFILE@@/' . $url['filename'], $text);
                }

                $data[$fieldid]['text'] = $text;
            }
        }

        // Save the files in the newdraftitemid.
        file_save_draft_area_files(
            $newdraftitemid,
            $data['contextid'],
            'mod_interactivevideo',
            'text1',
            $data['id']
        );

        $text1 = json_encode($data);

        $data = (object)$data;
        $data->text1 = $text1;

        $DB->update_record('annotation_log', $data);

        return $data;
    }

    /**
     * Validate dynamic submission
     *
     * @param array $data
     * @param array $files
     * @return array
     */
    public function validation($data, $files) {
        $errors = [];
        $formjson = json_decode($data['formjson']);
        $filemanagerfields = array_filter($formjson, function ($field) {
            return $field->type == 'filemanager' && $field->required == 1;
        });
        foreach ($filemanagerfields as $field) {
            $fieldid = 'field-' . $field->id;
            $draftitemid = $data[$fieldid];
            $files = $this->get_draft_files($draftitemid);
            if (count($files) < $field->minfiles) {
                $errors[$fieldid] = get_string('youmustuploadfilesatleast', 'ivplugin_form', $field->minfiles);
            }
        }
        return $errors;
    }

    /**
     * Get draft files from a draft item ID
     *
     * @param mixed $draftitemid
     * @return void
     */
    public function get_draft_files($draftitemid) {
        global $USER;
        $usercontext = \context_user::instance($USER->id);
        $fs = get_file_storage();
        $files = $fs->get_area_files(
            $usercontext->id,
            'user',
            'draft',
            $draftitemid,
            'filename',
            false
        );
        return $files;
    }

    /**
     * Returns editor options
     *
     * @return array
     */
    public function editor_options() {
        return [
            'maxfiles' => EDITOR_UNLIMITED_FILES,
            'maxbytes' => 0,
            'trusttext' => false,
            'context' => $this->get_context_for_dynamic_submission(),
        ];
    }

    /**
     * Returns page URL for dynamic submission
     *
     * @return \moodle_url
     */
    protected function get_page_url_for_dynamic_submission(): \moodle_url {
        return new \moodle_url('/mod/interactivevideo/interactions.php', [
            'id' => $this->optional_param('annotationid', null, PARAM_INT),
        ]);
    }

    public function render_duration_element() {
        global $CFG;
        MoodleQuickForm::registerElementType('ivduration', $CFG->dirroot . '/mod/interactivevideo/plugins/form/classes/form_fields/ivduration.php', 'MoodleQuickForm_ivduration');
    }
}